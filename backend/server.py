"""Veterinary Site Template, FastAPI server.

Public routes handle anonymous visitor tracking, dynamic surface content, and
lead submissions. Admin routes (JWT-protected) expose CRUD over Surfaces,
Switches, Leads and basic analytics.
"""
from __future__ import annotations

import logging
import os
import re
import json
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from secrets import token_urlsafe

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from auth import create_access_token, get_current_admin, verify_password
from database import get_db
from email_service import send_lead_notification
from intent_engine import match_switch, resolve_parent_intent, resolve_sub_intent
from models import LeadSubmission, SignalEvent, Surface, Switch, User, VisitorSession, WebhookConfig, ChatbotConfig, ChatMessage, ChatBooking
from schemas import (
    AnalyticsOverview,
    ChatRequest,
    ChatResponse,
    ChatbotConfigOut,
    ChatbotConfigUpdate,
    LeadCreateRequest,
    LeadOut,
    LeadStatusUpdate,
    LoginRequest,
    SessionInitRequest,
    SessionOut,
    SignalEventOut,
    SignalTrackRequest,
    SurfaceContentResponse,
    SurfaceCreate,
    SurfaceOut,
    SurfaceUpdate,
    SwitchCreate,
    SwitchOut,
    SwitchUpdate,
    TokenResponse,
    VisitorSessionOut,
    WebhookCreate,
    WebhookOut,
    WebhookTestResponse,
    WebhookUpdate,
)
from seed import seed as seed_db
from seed_portal import seed_portal
from portal import portal as portal_router
from booking import booking as booking_router
from nova_site_editor import nova_site_editor as nova_site_editor_router

from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


# ---------- Signal â†’ intent scoring ----------

# Strength multipliers for signal types
SIGNAL_STRENGTH_MULT = {
    "intent_select": 5,       # explicit click on parent-intent card
    "sub_intent_select": 5,   # explicit sub-intent pick
    "chat_intent": 8,         # chat conversation - highest weight signal
    "form_start": 3,
    "form_submit": 4,
    "cta_click": 2,
    "page_view": 1,
    "faq_open": 1,
}


async def _ensure_session(db: AsyncSession, session_token: str | None) -> VisitorSession:
    """Look up (or create) a visitor session by token."""
    if session_token:
        res = await db.execute(select(VisitorSession).where(VisitorSession.session_token == session_token))
        sess = res.scalar_one_or_none()
        if sess:
            return sess
    sess = VisitorSession(session_token=token_urlsafe(24))
    db.add(sess)
    await db.flush()
    return sess


# Per-signal recency decay. Each new tracked signal shrinks all prior scores
# by this factor before the new delta is added. Lower = more aggressive bias
# toward the most recent clicks. 0.75 means after ~5 signals, an earlier
# score is down to ~24% of its original weight.
SIGNAL_DECAY_FACTOR = 0.75
SIGNAL_FLOOR = 0.3  # drop scores below this to keep the state clean


def _decay_scores(scores: dict | None) -> dict:
    """Apply a fixed per-signal decay to all scores."""
    if not scores:
        return {}
    decayed: dict = {}
    for k, v in scores.items():
        try:
            nv = float(v) * SIGNAL_DECAY_FACTOR
        except (TypeError, ValueError):
            continue
        if nv >= SIGNAL_FLOOR:
            decayed[k] = round(nv, 3)
    return decayed


def _apply_signal(sess: VisitorSession, ev: SignalEvent) -> None:
    """Update session intent from a new event, decaying older scores first by click order."""
    if ev.signal_type == "page_view":
        sess.page_view_count = (sess.page_view_count or 0) + 1
    mult = SIGNAL_STRENGTH_MULT.get(ev.signal_type, 1)
    delta = max(1, int(ev.strength or 1)) * mult

    # Decay everything the visitor has accumulated so far by one "tick".
    scores = _decay_scores(sess.intent_scores or {})
    sub_scores = _decay_scores(sess.sub_intent_scores or {})

    if ev.intent:
        scores[ev.intent] = scores.get(ev.intent, 0) + delta
    if ev.sub_intent:
        sub_scores[ev.sub_intent] = sub_scores.get(ev.sub_intent, 0) + delta

    sess.intent_scores = scores
    sess.sub_intent_scores = sub_scores
    sess.parent_intent = resolve_parent_intent(scores)
    sess.sub_intent = resolve_sub_intent(sub_scores)
    sess.last_seen_at = datetime.now(timezone.utc)


# ---------- Lifespan ----------
@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        await seed_db()
        await seed_portal()
    except Exception:
        logger.exception("Seed failed")
    yield


app = FastAPI(title="Veterinary Site Template API", lifespan=lifespan)
api = APIRouter(prefix="/api")


# ---------- Health ----------
@api.get("/")
async def root():
    return {"service": "veterinary-site-template", "status": "ok"}


@api.get("/health")
async def health():
    return {"status": "ok"}


# ---------- Session / Signals (public) ----------
@api.post("/sessions/init", response_model=SessionOut)
async def init_session(payload: SessionInitRequest, db: AsyncSession = Depends(get_db)):
    sess = await _ensure_session(db, payload.existing_token)
    if payload.referrer and not sess.first_referrer:
        sess.first_referrer = payload.referrer
    if payload.user_agent and not sess.user_agent:
        sess.user_agent = payload.user_agent
    sess.last_seen_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(sess)
    return SessionOut.model_validate(sess)


@api.post("/signals/track", response_model=SessionOut)
async def track_signal(payload: SignalTrackRequest, db: AsyncSession = Depends(get_db)):
    sess = await _ensure_session(db, payload.session_token)
    ev = SignalEvent(
        session_id=sess.id,
        signal_type=payload.signal_type,
        page_path=payload.page_path,
        label=payload.label,
        intent=payload.intent,
        sub_intent=payload.sub_intent,
        strength=payload.strength,
        meta=payload.meta,
    )
    db.add(ev)
    _apply_signal(sess, ev)
    await db.commit()
    await db.refresh(sess)
    return SessionOut.model_validate(sess)


@api.get("/sessions/me", response_model=SessionOut)
async def get_my_session(token: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(VisitorSession).where(VisitorSession.session_token == token))
    sess = res.scalar_one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="session not found")
    return SessionOut.model_validate(sess)


# ---------- Surfaces (public content resolution) ----------
@api.get("/surfaces/{slug}/content", response_model=SurfaceContentResponse)
async def get_surface_content(
    slug: str,
    session_token: str | None = None,
    force_intent: str | None = None,
    force_sub_intent: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Surface).options(selectinload(Surface.switches)).where(Surface.slug == slug)
    )
    surface = res.scalar_one_or_none()
    if not surface or not surface.active:
        raise HTTPException(status_code=404, detail="surface not found")

    sess: VisitorSession | None = None
    if session_token:
        res = await db.execute(
            select(VisitorSession).where(VisitorSession.session_token == session_token)
        )
        sess = res.scalar_one_or_none()

    # force_intent is used by pet-specific pages (e.g. dog service details) that
    # MUST show their animal's CTA regardless of the visitor's accumulated signals.
    intent = force_intent or (sess.parent_intent if sess else None)
    sub_intent = force_sub_intent or (sess.sub_intent if sess else None)
    page_views = sess.page_view_count if sess else 0

    match = match_switch(surface.switches, intent, sub_intent, page_views)
    if match:
        return SurfaceContentResponse(
            surface_slug=slug,
            matched_switch_id=match.id,
            matched_switch_name=match.name,
            content=match.content or surface.default_content or {},
            inferred_intent=intent,
            inferred_sub_intent=sub_intent,
        )
    return SurfaceContentResponse(
        surface_slug=slug,
        matched_switch_id=None,
        matched_switch_name=None,
        content=surface.default_content or {},
        inferred_intent=intent,
        inferred_sub_intent=sub_intent,
    )


# ---------- Leads (public submit) ----------
INTENT_LABELS = {"dogs": "Dogs", "cats": "Cats", "critters": "Small & Exotic Pets"}
SUB_INTENT_LABELS = {
    "new_puppy": "New puppy care",
    "new_kitten": "New kitten care",
    "wellness": "Routine wellness",
    "health_concerns": "Illness or injury concern",
    "senior": "Senior pet care",
    "treatments": "Specific treatments (dental / surgery / laser)",
    "husbandry": "Habitat and diet guidance",
}


async def _generate_lead_narrative(
    lead: LeadSubmission,
    sess: VisitorSession | None,
    trail: list[dict],
) -> str | None:
    """Use the LLM to turn the signal trail + form data into a short, human-readable summary."""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception:
        logger.warning("emergentintegrations not available for lead narrative")
        return None

    api_key = os.environ.get("EMERGENT_LLM_KEY", "")
    if not api_key:
        return None

    parent = (sess.parent_intent if sess else None) or lead.pet_type
    sub = sess.sub_intent if sess else None
    parent_label = INTENT_LABELS.get(parent or "", parent or "unknown")
    sub_label = SUB_INTENT_LABELS.get(sub or "", sub or "none")

    pages_visited: list[str] = []
    clicks: list[str] = []
    chat_snippets: list[str] = []
    for ev in trail:
        if ev.get("signal_type") == "page_view" and ev.get("page_path"):
            pages_visited.append(ev["page_path"])
        elif ev.get("signal_type") in ("cta_click", "service_click", "nav_click") and ev.get("label"):
            clicks.append(ev["label"])
        elif ev.get("signal_type") == "chat_intent" and ev.get("label"):
            chat_snippets.append(ev["label"])

    trail_desc = {
        "parent_intent": parent_label,
        "sub_intent": sub_label,
        "pages_visited": pages_visited[:15],
        "clicks_and_selections": clicks[:15],
        "chat_topics": chat_snippets[:5],
        "total_events": len(trail),
    }

    user_prompt = f"""Write a concise 1-2 paragraph narrative summary (not a list) describing this visitor's experience on Veterinary Practice Name's website before submitting the contact form. Write it in third person, present tense, warm but factual. Mention which animal(s) they focused on, what specific concerns or services drew their attention, and the reason they've reached out now. If they chatted with the bot, weave that in naturally. Do not use bullet points or em-dashes.

Visitor session data:
{json.dumps(trail_desc, indent=2)}

Form they just submitted:
- Name: {lead.name}
- Pet: {lead.pet_name or 'unspecified'} ({lead.pet_type or 'unspecified'})
- Reason for visit: {lead.service_interest or 'not specified'}
- Preferred time: {lead.preferred_time or 'flexible'}
- Their note: {lead.comment or '(none)'}

Return only the narrative. No preface, no headings."""

    chat = LlmChat(
        api_key=api_key,
        session_id=f"lead-summary-{lead.id}",
        system_message="You produce short, honest, readable summaries of website visitor journeys for a veterinary clinic's front desk team. Never invent details that aren't supported by the data.",
    ).with_model("openai", "gpt-4o-mini")

    try:
        reply = await chat.send_message(UserMessage(text=user_prompt))
        return reply.strip() if reply else None
    except Exception:
        logger.exception("lead narrative LLM call failed")
        return None


@api.post("/leads", response_model=LeadOut)
async def create_lead(payload: LeadCreateRequest, db: AsyncSession = Depends(get_db)):
    sess: VisitorSession | None = None
    if payload.session_token:
        res = await db.execute(
            select(VisitorSession).where(VisitorSession.session_token == payload.session_token)
        )
        sess = res.scalar_one_or_none()

    trail: list[dict] = []
    summary: dict = {}
    if sess:
        ev_res = await db.execute(
            select(SignalEvent)
            .where(SignalEvent.session_id == sess.id)
            .order_by(SignalEvent.created_at)
            .limit(50)
        )
        events = ev_res.scalars().all()
        trail = [
            {
                "signal_type": e.signal_type,
                "page_path": e.page_path,
                "label": e.label,
                "intent": e.intent,
                "sub_intent": e.sub_intent,
                "created_at": e.created_at.isoformat() if e.created_at else None,
            }
            for e in events
        ]
        summary = {
            "parent_intent": sess.parent_intent,
            "sub_intent": sess.sub_intent,
            "intent_scores": sess.intent_scores or {},
            "sub_intent_scores": sess.sub_intent_scores or {},
            "page_views": sess.page_view_count or 0,
            "first_referrer": sess.first_referrer,
            "session_id": sess.id,
        }

    lead = LeadSubmission(
        session_id=sess.id if sess else None,
        name=payload.name,
        email=payload.email,
        phone=payload.phone,
        pet_name=payload.pet_name,
        pet_type=payload.pet_type,
        service_interest=payload.service_interest,
        comment=payload.comment,
        preferred_time=payload.preferred_time,
        source_page=payload.source_page,
        intent_summary=summary,
        signal_trail=trail,
    )
    db.add(lead)
    # Also track a form_submit signal to boost intent weight
    if sess:
        submit_ev = SignalEvent(
            session_id=sess.id,
            signal_type="form_submit",
            page_path=payload.source_page,
            label=f"lead:{payload.service_interest or 'general'}",
            intent=payload.pet_type if payload.pet_type in ("dogs", "cats", "critters") else None,
            strength=2,
        )
        db.add(submit_ev)
        _apply_signal(sess, submit_ev)

    await db.commit()
    await db.refresh(lead)

    # Build a natural-language summary of the visitor's journey using the LLM.
    try:
        summary_text = await _generate_lead_narrative(lead, sess, trail)
        if summary_text:
            lead.narrative_summary = summary_text
            await db.commit()
            await db.refresh(lead)
    except Exception:
        logger.exception("Lead narrative generation failed (non-fatal)")

    # Build notification payload
    lead_data = {
        "id": lead.id,
        "name": lead.name,
        "email": lead.email,
        "phone": lead.phone,
        "pet_name": lead.pet_name,
        "pet_type": lead.pet_type,
        "service_interest": lead.service_interest,
        "comment": lead.comment,
        "preferred_time": lead.preferred_time,
        "source_page": lead.source_page,
        "intent_summary": lead.intent_summary,
        "signal_trail": lead.signal_trail,
        "narrative_summary": lead.narrative_summary,
        "created_at": lead.created_at.isoformat() if lead.created_at else None,
    }

    # Fire-and-forget email
    try:
        send_lead_notification(lead_data)
    except Exception:
        logger.exception("Email notification failed (non-fatal)")

    # Fire webhooks
    try:
        await _fire_webhooks("lead_created", lead_data, db)
    except Exception:
        logger.exception("Webhook firing failed (non-fatal)")

    return LeadOut.model_validate(lead)


# ---------- Admin auth ----------
@api.post("/admin/login", response_model=TokenResponse)
async def admin_login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = res.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not an admin")
    token = create_access_token(subject=user.id, extra={"email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "name": user.name, "role": user.role},
    )


@api.get("/admin/me")
async def admin_me(current=Depends(get_current_admin)):
    return {"id": current.id, "email": current.email, "name": current.name, "role": current.role}


# ---------- Admin: Surfaces ----------
@api.get("/admin/surfaces", response_model=list[SurfaceOut])
async def list_surfaces(
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Surface).options(selectinload(Surface.switches)).order_by(Surface.page, Surface.slug)
    )
    return [SurfaceOut.model_validate(s) for s in res.scalars().all()]


@api.post("/admin/surfaces", response_model=SurfaceOut)
async def create_surface(
    payload: SurfaceCreate,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    surface = Surface(**payload.model_dump())
    db.add(surface)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=400, detail="slug must be unique")
    await db.refresh(surface)
    res = await db.execute(
        select(Surface).options(selectinload(Surface.switches)).where(Surface.id == surface.id)
    )
    return SurfaceOut.model_validate(res.scalar_one())


@api.patch("/admin/surfaces/{surface_id}", response_model=SurfaceOut)
async def update_surface(
    surface_id: str,
    payload: SurfaceUpdate,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(Surface).options(selectinload(Surface.switches)).where(Surface.id == surface_id)
    )
    surface = res.scalar_one_or_none()
    if not surface:
        raise HTTPException(status_code=404, detail="not found")
    data = payload.model_dump(exclude_none=True)
    for k, v in data.items():
        setattr(surface, k, v)
    await db.commit()
    await db.refresh(surface)
    return SurfaceOut.model_validate(surface)


@api.delete("/admin/surfaces/{surface_id}")
async def delete_surface(
    surface_id: str,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Surface).where(Surface.id == surface_id))
    surface = res.scalar_one_or_none()
    if not surface:
        raise HTTPException(status_code=404, detail="not found")
    await db.delete(surface)
    await db.commit()
    return {"ok": True}


# ---------- Admin: Switches ----------
@api.post("/admin/switches", response_model=SwitchOut)
async def create_switch(
    payload: SwitchCreate,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Surface).where(Surface.id == payload.surface_id))
    if not res.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="surface not found")
    sw = Switch(**payload.model_dump())
    db.add(sw)
    await db.commit()
    await db.refresh(sw)
    return SwitchOut.model_validate(sw)


@api.patch("/admin/switches/{switch_id}", response_model=SwitchOut)
async def update_switch(
    switch_id: str,
    payload: SwitchUpdate,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Switch).where(Switch.id == switch_id))
    sw = res.scalar_one_or_none()
    if not sw:
        raise HTTPException(status_code=404, detail="not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(sw, k, v)
    await db.commit()
    await db.refresh(sw)
    return SwitchOut.model_validate(sw)


@api.delete("/admin/switches/{switch_id}")
async def delete_switch(
    switch_id: str,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(Switch).where(Switch.id == switch_id))
    sw = res.scalar_one_or_none()
    if not sw:
        raise HTTPException(status_code=404, detail="not found")
    await db.delete(sw)
    await db.commit()
    return {"ok": True}


# ---------- Admin: Leads ----------
@api.get("/admin/leads", response_model=list[LeadOut])
async def list_leads(
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 200,
):
    res = await db.execute(
        select(LeadSubmission).order_by(desc(LeadSubmission.created_at)).limit(limit)
    )
    return [LeadOut.model_validate(l) for l in res.scalars().all()]


@api.get("/admin/leads/{lead_id}", response_model=LeadOut)
async def get_lead(
    lead_id: str,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(LeadSubmission).where(LeadSubmission.id == lead_id))
    lead = res.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="not found")
    return LeadOut.model_validate(lead)


@api.patch("/admin/leads/{lead_id}", response_model=LeadOut)
async def update_lead_status(
    lead_id: str,
    payload: LeadStatusUpdate,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(LeadSubmission).where(LeadSubmission.id == lead_id))
    lead = res.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="not found")
    lead.status = payload.status
    await db.commit()
    await db.refresh(lead)
    return LeadOut.model_validate(lead)


# ---------- Admin: Sessions / Analytics ----------
@api.get("/admin/sessions", response_model=list[VisitorSessionOut])
async def list_sessions(
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
):
    res = await db.execute(
        select(VisitorSession).order_by(desc(VisitorSession.last_seen_at)).limit(limit)
    )
    sessions = res.scalars().all()
    out = []
    for s in sessions:
        cnt_res = await db.execute(
            select(func.count(SignalEvent.id)).where(SignalEvent.session_id == s.id)
        )
        count = cnt_res.scalar() or 0
        item = VisitorSessionOut.model_validate(s)
        item.event_count = count
        out.append(item)
    return out


@api.get("/admin/sessions/{session_id}/events", response_model=list[SignalEventOut])
async def list_session_events(
    session_id: str,
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(SignalEvent).where(SignalEvent.session_id == session_id).order_by(SignalEvent.created_at)
    )
    return [SignalEventOut.model_validate(e) for e in res.scalars().all()]


@api.get("/admin/analytics/overview", response_model=AnalyticsOverview)
async def analytics_overview(
    current=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    total_sessions = (await db.execute(select(func.count(VisitorSession.id)))).scalar() or 0
    total_leads = (await db.execute(select(func.count(LeadSubmission.id)))).scalar() or 0
    total_signals = (await db.execute(select(func.count(SignalEvent.id)))).scalar() or 0
    since = datetime.now(timezone.utc) - timedelta(days=7)
    leads_7d = (
        await db.execute(select(func.count(LeadSubmission.id)).where(LeadSubmission.created_at >= since))
    ).scalar() or 0

    intent_res = await db.execute(
        select(VisitorSession.parent_intent, func.count(VisitorSession.id)).group_by(
            VisitorSession.parent_intent
        )
    )
    intent_breakdown: dict[str, int] = {}
    for intent, count in intent_res.all():
        intent_breakdown[intent or "unknown"] = count

    sub_res = await db.execute(
        select(VisitorSession.sub_intent, func.count(VisitorSession.id)).group_by(VisitorSession.sub_intent)
    )
    sub_breakdown: dict[str, int] = {}
    for sub, count in sub_res.all():
        sub_breakdown[sub or "unknown"] = count

    pages_res = await db.execute(
        select(SignalEvent.page_path, func.count(SignalEvent.id))
        .where(SignalEvent.signal_type == "page_view")
        .group_by(SignalEvent.page_path)
        .order_by(desc(func.count(SignalEvent.id)))
        .limit(10)
    )
    top_pages = [{"page": p or "/", "views": c} for p, c in pages_res.all()]

    return AnalyticsOverview(
        total_sessions=total_sessions,
        total_leads=total_leads,
        total_signals=total_signals,
        leads_last_7d=leads_7d,
        intent_breakdown=intent_breakdown,
        sub_intent_breakdown=sub_breakdown,
        top_pages=top_pages,
    )


# ---------- Webhook helpers ----------
import httpx

async def _fire_webhooks(event_type: str, payload: dict, db: AsyncSession):
    """Fire all active webhooks for the given event type."""
    res = await db.execute(
        select(WebhookConfig).where(
            WebhookConfig.event_type == event_type,
            WebhookConfig.active == True,
        )
    )
    hooks = res.scalars().all()
    for hook in hooks:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    hook.url,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "X-Webhook-Event": event_type,
                        **hook.headers,
                    },
                )
            hook.last_fired_at = datetime.now(timezone.utc)
            hook.last_status_code = resp.status_code
            hook.last_error = None if resp.is_success else resp.text[:500]
        except Exception as exc:
            hook.last_fired_at = datetime.now(timezone.utc)
            hook.last_status_code = None
            hook.last_error = str(exc)[:500]
            logger.warning(f"Webhook {hook.name} failed: {exc}")
    if hooks:
        await db.commit()


# ---------- Admin: Webhooks ----------
@api.get("/admin/webhooks", response_model=list[WebhookOut])
async def list_webhooks(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WebhookConfig).order_by(WebhookConfig.created_at))
    return [WebhookOut.model_validate(w) for w in res.scalars().all()]


@api.post("/admin/webhooks", response_model=WebhookOut, status_code=201)
async def create_webhook(
    payload: WebhookCreate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    hook = WebhookConfig(
        name=payload.name,
        url=payload.url,
        event_type=payload.event_type,
        headers=payload.headers,
        active=payload.active,
    )
    db.add(hook)
    await db.commit()
    await db.refresh(hook)
    return WebhookOut.model_validate(hook)


@api.patch("/admin/webhooks/{webhook_id}", response_model=WebhookOut)
async def update_webhook(
    webhook_id: str,
    payload: WebhookUpdate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WebhookConfig).where(WebhookConfig.id == webhook_id))
    hook = res.scalar_one_or_none()
    if not hook:
        raise HTTPException(404, "Webhook not found")
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(hook, field, val)
    await db.commit()
    await db.refresh(hook)
    return WebhookOut.model_validate(hook)


@api.delete("/admin/webhooks/{webhook_id}", status_code=204)
async def delete_webhook(
    webhook_id: str,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WebhookConfig).where(WebhookConfig.id == webhook_id))
    hook = res.scalar_one_or_none()
    if not hook:
        raise HTTPException(404, "Webhook not found")
    await db.delete(hook)
    await db.commit()


@api.post("/admin/webhooks/{webhook_id}/test", response_model=WebhookTestResponse)
async def test_webhook(
    webhook_id: str,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(WebhookConfig).where(WebhookConfig.id == webhook_id))
    hook = res.scalar_one_or_none()
    if not hook:
        raise HTTPException(404, "Webhook not found")
    test_payload = {
        "event": "test",
        "message": "This is a test webhook from Veterinary Site Template.",
        "webhook_name": hook.name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                hook.url,
                json=test_payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Event": "test",
                    **hook.headers,
                },
            )
        hook.last_fired_at = datetime.now(timezone.utc)
        hook.last_status_code = resp.status_code
        hook.last_error = None if resp.is_success else resp.text[:500]
        await db.commit()
        return WebhookTestResponse(
            success=resp.is_success,
            status_code=resp.status_code,
            error=None if resp.is_success else resp.text[:500],
        )
    except Exception as exc:
        hook.last_fired_at = datetime.now(timezone.utc)
        hook.last_status_code = None
        hook.last_error = str(exc)[:500]
        await db.commit()
        return WebhookTestResponse(success=False, error=str(exc)[:500])


# ---------- Chatbot ----------
DEFAULT_SYSTEM_PROMPT = """You are the virtual assistant for Veterinary Practice Name, a family-owned veterinary clinic in Your City, ST. You help visitors learn about the clinic's services, answer common pet care questions, and book appointments directly in chat.

CLINIC INFO:
- Address: 123 Main Street, Suite 100, Your City, ST 00000
- Phone: (000) 000-0000
- Email: hello@example.com
- Hours: Mon 8am-4pm, Tue Closed, Wed 12pm-7pm, Thu 8am-4pm, Fri 8am-3pm, Sat 9am-1pm, Sun Closed
- Parking: Free on-site parking
- Owner: Dr. Veterinarian Name, DVM (15+ years experience)
- Team: Team Member Name (Clinic Manager), Team Member Name (Vet Assistant), Team Member Name (Vet Assistant), Team Member Name (Client Services)
- Years serving Your City: 15+
- Families served: 5,000+

ANIMALS WE TREAT:
- Dogs (all life stages: puppy, adult, senior)
- Cats (all life stages: kitten, adult, senior)
- Rabbits (wellness, dental, GI, husbandry, spay/neuter)
- Guinea Pigs (wellness, dental, vitamin C, skin, respiratory)
- Some small mammals (hamsters, ferrets - call to confirm)
- For reptiles, birds, or unusual exotics, we refer to a specialist

CORE SERVICES (by category):

Preventive & Wellness: annual exams, weight trends, baseline screening, preventive care plans, puppy/kitten visits, core and lifestyle-based vaccines (DHPP, rabies, FVRCP, FeLV, RHDV2 for rabbits), parasite prevention (fleas, ticks, heartworm, intestinal), nutrition and weight management, microchipping.

Dental: oral exams, scaling and polishing under anesthesia, digital dental radiographs, extractions, preventive dentistry, resorptive lesion evaluation in cats, rabbit and guinea pig dental (they have continuously growing teeth).

Surgery: spay and neuter, soft tissue surgery, mass removals, wound repair, rabbit spay, dental extractions.

Advanced Care: laser therapy for arthritis and post-op recovery, PRP and regenerative medicine, in-house diagnostics (bloodwork, urinalysis, cytology, digital x-ray).

Urgent / Sick Care: vomiting, diarrhea, not eating, lethargy, limping, ear infections, skin allergies, hot spots, coughing, urinary issues, eye problems, wounds, behavior changes, hiding, overgrooming. We handle most urgent concerns during business hours, and refer to a 24/7 ER for overnight emergencies.

Senior Care: mobility, arthritis support, kidney and thyroid monitoring, cognitive changes, chronic disease management.

SPECIES-SPECIFIC URGENT SIGNALS (tell the owner to call or come in same-day):
- Dogs: bloated or distended belly, repeated vomiting, suspected toxin, difficulty breathing, sudden lameness, seizures
- Cats: straining in the litter box (especially male cats), hiding for 24+ hours, not eating, labored breathing
- Rabbits: not eating for 12+ hours (GI stasis is life-threatening), head tilt, drooling, labored breathing
- Guinea Pigs: not eating, weight loss, respiratory distress, swollen cheeks

CLIENT PORTAL: logged-in clients can view their pets' vaccination history, bloodwork, dental records, appointment history, and receive reminders. Portal login is at /portal/login.

TONE: Warm, professional, concise, a trusted neighbor who happens to be a vet expert. Never use em-dashes (use commas, colons, hyphens, or periods). Avoid "personalizing for you" language. 2-4 sentences for most replies.

BOOKING FLOW:
If the visitor wants to book an appointment, schedule a visit, or asks "how do I book", guide them through the booking in-chat. Collect these fields, one or two at a time (never all at once):
  1. Client's full name
  2. Phone number
  3. Email address
  4. Pet's name
  5. Pet's breed (or species if mixed/unknown)
  6. Preferred day and time window (for example "Wednesday afternoon" or "Saturday morning"). Offer 2-3 options from our open hours if they are unsure.

After you have collected ALL SIX fields and confirmed them back to the visitor, finish your reply with EXACTLY this marker block on its own line at the very end (no code fences, no quotes around it):

<<BOOKING>>{"client_name":"...","client_phone":"...","client_email":"...","pet_name":"...","pet_breed":"...","preferred_time":"...","notes":"brief reason for visit or 'wellness' if unspecified"}<<END>>

The marker must be valid JSON on a single line. Do not emit the marker until you have all six fields. Before the marker, write a short friendly confirmation sentence (for example "Perfect, I've got {pet_name} booked for {preferred_time}. We'll call {client_phone} to confirm."). Do not mention the marker to the visitor."""

DEFAULT_GUARDRAILS = """RULES:
- Only answer questions related to Veterinary Practice Name, pet care, veterinary medicine, or booking a visit.
- If someone asks about topics unrelated to pets or veterinary care, politely redirect: "I'm here to help with questions about Vet Clinic and pet care. Is there something about your pet I can help with?"
- Never provide specific medical diagnoses. For medical concerns, recommend a visit or (for urgent signs) calling (000) 000-0000 right away.
- Never discuss pricing specifics. Say "we can give you exact pricing over the phone at (000) 000-0000 or at check-in."
- Do not make up information about the clinic. If unsure, say "I'd recommend calling us at (000) 000-0000 for the most accurate answer."
- Keep responses concise, 2-4 sentences for simple questions.
- Never use em-dashes. Use commas, hyphens, colons, or periods."""


async def _get_chatbot_config(db: AsyncSession) -> ChatbotConfig:
    res = await db.execute(select(ChatbotConfig).limit(1))
    config = res.scalar_one_or_none()
    if not config:
        config = ChatbotConfig(
            system_prompt=DEFAULT_SYSTEM_PROMPT,
            guardrails=DEFAULT_GUARDRAILS,
            training_context="",
            provider=os.environ.get("CHATBOT_PROVIDER", "openai"),
            model=os.environ.get("CHATBOT_MODEL", "gpt-4o-mini"),
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)
    return config


@api.post("/chat", response_model=ChatResponse)
async def chat_endpoint(payload: ChatRequest, db: AsyncSession = Depends(get_db)):
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except Exception:
        logger.warning("emergentintegrations not available for chat endpoint")
        return ChatResponse(
            reply="Chat is currently unavailable in this demo. Please call us at (000) 000-0000.",
            session_token=payload.session_token,
        )

    config = await _get_chatbot_config(db)
    if not config.active:
        return ChatResponse(reply="Chat is currently unavailable. Please call us at (000) 000-0000.", session_token=payload.session_token)

    # Build full system message
    parts = [config.system_prompt]
    if config.training_context:
        parts.append(f"\nADDITIONAL TRAINING CONTEXT:\n{config.training_context}")
    if config.guardrails:
        parts.append(f"\n{config.guardrails}")
    system_msg = "\n".join(parts)

    # Get chat history for this session (last 20 messages)
    hist_res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_token == payload.session_token)
        .order_by(ChatMessage.created_at.desc())
        .limit(20)
    )
    history = list(reversed(hist_res.scalars().all()))

    api_key = config.api_key_override or os.environ.get("EMERGENT_LLM_KEY", "")

    chat = LlmChat(
        api_key=api_key,
        session_id=f"vet-chat-{payload.session_token}",
        system_message=system_msg,
    ).with_model(config.provider, config.model)

    # Replay history into the chat
    for msg in history:
        if msg.role == "user":
            chat.messages.append({"role": "user", "content": msg.content})
        else:
            chat.messages.append({"role": "assistant", "content": msg.content})

    try:
        user_msg = UserMessage(text=payload.message)
        reply = await chat.send_message(user_msg)
    except Exception as exc:
        logger.exception("Chatbot error")
        reply = "I'm having trouble right now. Please call us at (000) 000-0000 and we'll be happy to help."

    # --- Detect and persist an in-chat booking ---
    booking_saved = False
    booking_error = None
    match = re.search(r"<<BOOKING>>(.+?)<<END>>", reply, flags=re.DOTALL)
    if match:
        raw_json = match.group(1).strip()
        try:
            data = json.loads(raw_json)
            required = ("client_name", "client_phone", "client_email", "pet_name", "pet_breed", "preferred_time")
            if all(data.get(k) for k in required):
                booking = ChatBooking(
                    session_token=payload.session_token,
                    client_name=str(data["client_name"])[:160],
                    client_phone=str(data["client_phone"])[:64],
                    client_email=str(data["client_email"])[:255],
                    pet_name=str(data["pet_name"])[:120],
                    pet_breed=str(data["pet_breed"])[:160],
                    preferred_time=str(data["preferred_time"])[:160],
                    notes=str(data.get("notes") or "")[:2000] or None,
                )
                db.add(booking)
                booking_saved = True
            else:
                booking_error = "missing_required_fields"
        except Exception as exc:
            logger.exception("Booking parse failed")
            booking_error = str(exc)[:200]
        # Strip the marker block from the visitor-facing reply regardless
        reply = re.sub(r"\s*<<BOOKING>>.+?<<END>>\s*", "", reply, flags=re.DOTALL).strip()
        if booking_saved:
            reply = (reply + "\n\nâœ“ Booking received. We'll call you shortly to confirm.").strip()

    # Save messages
    db.add(ChatMessage(session_token=payload.session_token, role="user", content=payload.message))
    db.add(ChatMessage(session_token=payload.session_token, role="assistant", content=reply))

    # --- Detect intent from conversation and fire signals ---
    combined = f"{payload.message} {reply}".lower()
    detected_intent = None
    detected_sub = None

    # Parent intent detection
    dog_kw = ("dog", "puppy", "puppies", "canine", "pup ", "pups", "golden retriever", "labrador", "beagle", "terrier", "bulldog", "shepherd")
    cat_kw = ("cat", "kitten", "kittens", "feline", "kitty", "kitties", "tabby")
    critter_kw = ("rabbit", "bunny", "guinea pig", "hamster", "exotic", "small mammal", "reptile", "bird", "ferret")

    dog_hits = sum(1 for kw in dog_kw if kw in combined)
    cat_hits = sum(1 for kw in cat_kw if kw in combined)
    critter_hits = sum(1 for kw in critter_kw if kw in combined)

    if dog_hits > cat_hits and dog_hits > critter_hits and dog_hits > 0:
        detected_intent = "dogs"
    elif cat_hits > dog_hits and cat_hits > critter_hits and cat_hits > 0:
        detected_intent = "cats"
    elif critter_hits > 0:
        detected_intent = "critters"

    # Sub-intent detection
    sub_kw_map = {
        "new_puppy": ("new puppy", "puppy visit", "first puppy", "just got a puppy", "adopted a puppy", "puppy vaccine"),
        "new_kitten": ("new kitten", "kitten visit", "first kitten", "just got a kitten", "adopted a kitten", "kitten vaccine"),
        "senior": ("senior", "older dog", "older cat", "aging", "arthritis", "joint", "mobility", "stiff"),
        "health_concerns": ("sick", "emergency", "vomiting", "diarrhea", "not eating", "lethargic", "bleeding", "pain", "limping", "swelling", "lump", "breathing", "cough"),
        "treatments": ("dental", "surgery", "spay", "neuter", "laser", "prp", "cleaning", "extraction", "procedure"),
        "wellness": ("wellness", "checkup", "check-up", "vaccine", "annual", "exam", "prevention", "parasite", "flea", "tick", "heartworm"),
    }
    for sub_key, keywords in sub_kw_map.items():
        if any(kw in combined for kw in keywords):
            detected_sub = sub_key
            break

    # Fire signal into the visitor session if we detected intent
    if detected_intent:
        sess = None
        if payload.session_token:
            res = await db.execute(
                select(VisitorSession).where(VisitorSession.session_token == payload.session_token)
            )
            sess = res.scalar_one_or_none()
        if sess:
            ev = SignalEvent(
                session_id=sess.id,
                signal_type="chat_intent",
                page_path="/chat",
                label=f"chat:{payload.message[:80]}",
                intent=detected_intent,
                sub_intent=detected_sub,
                strength=3,  # base strength 3 x multiplier 8 = 24 points per chat message
            )
            db.add(ev)
            _apply_signal(sess, ev)

    await db.commit()

    return ChatResponse(reply=reply, session_token=payload.session_token)


@api.get("/admin/chatbot-config", response_model=ChatbotConfigOut)
async def get_chatbot_config(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await _get_chatbot_config(db)
    return ChatbotConfigOut.model_validate(config)


@api.patch("/admin/chatbot-config", response_model=ChatbotConfigOut)
async def update_chatbot_config(
    payload: ChatbotConfigUpdate,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    config = await _get_chatbot_config(db)
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(config, field, val)
    await db.commit()
    await db.refresh(config)
    return ChatbotConfigOut.model_validate(config)


# ---------- Admin: Chat Bookings ----------
@api.get("/admin/chat-bookings")
async def list_chat_bookings(
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(ChatBooking).order_by(desc(ChatBooking.created_at)).limit(200)
    )
    bookings = res.scalars().all()
    return [
        {
            "id": b.id,
            "created_at": b.created_at.isoformat() if b.created_at else None,
            "client_name": b.client_name,
            "client_phone": b.client_phone,
            "client_email": b.client_email,
            "pet_name": b.pet_name,
            "pet_breed": b.pet_breed,
            "preferred_time": b.preferred_time,
            "notes": b.notes,
            "status": b.status,
            "session_token": b.session_token,
        }
        for b in bookings
    ]


@api.patch("/admin/chat-bookings/{booking_id}")
async def update_chat_booking(
    booking_id: str,
    payload: dict,
    _admin=Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(select(ChatBooking).where(ChatBooking.id == booking_id))
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(404, "Booking not found")
    new_status = payload.get("status")
    if new_status in ("new", "confirmed", "cancelled"):
        booking.status = new_status
    await db.commit()
    return {"ok": True, "status": booking.status}


# ---------- Wire it up ----------
app.include_router(api)
app.include_router(portal_router, prefix="/api")
app.include_router(booking_router, prefix="/api")
app.include_router(nova_site_editor_router, prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the React build when deployed as a single Railway service.
FRONTEND_BUILD_DIR = Path(__file__).resolve().parent.parent / "frontend" / "build"
if FRONTEND_BUILD_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_BUILD_DIR), html=True), name="frontend")
else:
    logger.warning("Frontend build directory not found at %s; API-only mode enabled", FRONTEND_BUILD_DIR)

