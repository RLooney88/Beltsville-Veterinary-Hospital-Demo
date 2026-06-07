"""Pydantic schemas for Veterinary Site Template API."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Auth ----------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ---------- Sessions / Signals ----------
class SessionInitRequest(BaseModel):
    referrer: str | None = None
    user_agent: str | None = None
    existing_token: str | None = None


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    session_token: str
    parent_intent: str | None = None
    sub_intent: str | None = None
    intent_scores: dict = {}
    sub_intent_scores: dict = {}
    page_view_count: int = 0


class SignalTrackRequest(BaseModel):
    session_token: str
    signal_type: str = Field(..., description="page_view|cta_click|form_start|form_submit|intent_select|chat_intent|faq_open")
    page_path: str | None = None
    label: str | None = None
    intent: str | None = None  # dogs|cats|critters
    sub_intent: str | None = None
    strength: int = 1
    meta: dict[str, Any] = {}


class SignalEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    signal_type: str
    page_path: str | None = None
    label: str | None = None
    intent: str | None = None
    sub_intent: str | None = None
    strength: int
    created_at: datetime


# ---------- Surfaces & Switches ----------
class SwitchBase(BaseModel):
    name: str
    rule: dict = {}
    content: dict = {}
    priority: int = 100
    active: bool = True


class SwitchCreate(SwitchBase):
    surface_id: str


class SwitchUpdate(BaseModel):
    name: str | None = None
    rule: dict | None = None
    content: dict | None = None
    priority: int | None = None
    active: bool | None = None


class SwitchOut(SwitchBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    surface_id: str
    created_at: datetime
    updated_at: datetime


class SurfaceBase(BaseModel):
    slug: str
    name: str
    description: str | None = None
    page: str = "home"
    default_content: dict = {}
    active: bool = True


class SurfaceCreate(SurfaceBase):
    pass


class SurfaceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    page: str | None = None
    default_content: dict | None = None
    active: bool | None = None


class SurfaceOut(SurfaceBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    created_at: datetime
    updated_at: datetime
    switches: list[SwitchOut] = []


class SurfaceContentResponse(BaseModel):
    """What the frontend fetches to render a surface."""
    surface_slug: str
    matched_switch_id: str | None = None
    matched_switch_name: str | None = None
    content: dict
    inferred_intent: str | None = None
    inferred_sub_intent: str | None = None


# ---------- Leads ----------
class LeadCreateRequest(BaseModel):
    session_token: str | None = None
    name: str
    email: EmailStr
    phone: str | None = None
    pet_name: str | None = None
    pet_type: str | None = None
    service_interest: str | None = None
    comment: str | None = None
    preferred_time: str | None = None
    source_page: str | None = None


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    phone: str | None = None
    pet_name: str | None = None
    pet_type: str | None = None
    service_interest: str | None = None
    comment: str | None = None
    preferred_time: str | None = None
    source_page: str | None = None
    intent_summary: dict
    signal_trail: list
    narrative_summary: str | None = None
    status: str
    created_at: datetime


class LeadStatusUpdate(BaseModel):
    status: str


# ---------- Webhooks ----------
class WebhookCreate(BaseModel):
    name: str
    url: str
    event_type: str = "lead_created"
    headers: dict = {}
    active: bool = True


class WebhookUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    event_type: str | None = None
    headers: dict | None = None
    active: bool | None = None


class WebhookOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    url: str
    event_type: str
    headers: dict
    active: bool
    last_fired_at: datetime | None = None
    last_status_code: int | None = None
    last_error: str | None = None
    created_at: datetime
    updated_at: datetime


class WebhookTestResponse(BaseModel):
    success: bool
    status_code: int | None = None
    error: str | None = None


# ---------- Chatbot ----------
class ChatRequest(BaseModel):
    session_token: str
    message: str


class ChatResponse(BaseModel):
    reply: str
    session_token: str


class ChatbotConfigOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    system_prompt: str
    training_context: str
    guardrails: str
    provider: str
    model: str
    api_key_override: str | None = None
    active: bool
    updated_at: datetime


class ChatbotConfigUpdate(BaseModel):
    system_prompt: str | None = None
    training_context: str | None = None
    guardrails: str | None = None
    provider: str | None = None
    model: str | None = None
    api_key_override: str | None = None
    active: bool | None = None


# ---------- Analytics ----------
class AnalyticsOverview(BaseModel):
    total_sessions: int
    total_leads: int
    total_signals: int
    leads_last_7d: int
    intent_breakdown: dict  # {dogs: 12, cats: 5, critters: 2, unknown: 9}
    sub_intent_breakdown: dict
    top_pages: list[dict]


class VisitorSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    session_token: str
    parent_intent: str | None = None
    sub_intent: str | None = None
    intent_scores: dict
    sub_intent_scores: dict
    page_view_count: int
    created_at: datetime
    last_seen_at: datetime
    event_count: int = 0
