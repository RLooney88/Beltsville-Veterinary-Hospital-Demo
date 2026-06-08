"""Seed smart-site template surfaces/switches from canonical JSON.

The source of truth is backend/seeds/smart_site_template.json. Keep smart-site
content there so every template instance starts from the same validated data.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

from sqlalchemy import select

from auth import hash_password
from database import AsyncSessionLocal, Base, engine
from models import AppointmentType, ClinicHours, StaffConfig, Surface, Switch, User

logger = logging.getLogger(__name__)

SEED_PATH = Path(__file__).parent / "seeds" / "smart_site_template.json"
_FALSE_VALUES = {"0", "false", "no", "off"}


def _load_seed(path: Path = SEED_PATH) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data.get("surfaces"), list):
        raise ValueError(f"Seed file {path} must contain a surfaces list")
    return data


def _refresh_enabled(seed_data: dict[str, Any]) -> bool:
    default = seed_data.get("refreshExistingByDefault", True)
    raw = os.environ.get("SEED_REFRESH_CONTENT")
    if raw is None:
        return bool(default)
    return raw.strip().lower() not in _FALSE_VALUES


def _surface_spec(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "slug": raw["slug"],
        "name": raw["name"],
        "page": raw.get("page", "home"),
        "description": raw.get("description"),
        "default_content": raw.get("default_content", {}),
        "active": raw.get("active", True),
    }


async def seed() -> None:
    seed_data = _load_seed()
    refresh_existing = _refresh_enabled(seed_data)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    admin_email = os.environ["ADMIN_EMAIL"]
    admin_password = os.environ["ADMIN_PASSWORD"]

    async with AsyncSessionLocal() as db:
        # --- Admin user ---
        res = await db.execute(select(User).where(User.email == admin_email))
        user = res.scalar_one_or_none()
        if not user:
            user = User(
                email=admin_email,
                password_hash=hash_password(admin_password),
                name="Beltsville Vet Admin",
                role="admin",
            )
            db.add(user)
            logger.info("Seeded admin user %s", admin_email)

        # --- Surfaces ---
        surface_by_slug: dict[str, Surface] = {}
        for raw_surface in seed_data["surfaces"]:
            spec = _surface_spec(raw_surface)
            res = await db.execute(select(Surface).where(Surface.slug == spec["slug"]))
            existing = res.scalar_one_or_none()
            if existing:
                if refresh_existing:
                    existing.name = spec["name"]
                    existing.page = spec["page"]
                    existing.description = spec["description"]
                    existing.default_content = spec["default_content"]
                    existing.active = spec["active"]
                surface_by_slug[spec["slug"]] = existing
                continue

            surface = Surface(**spec)
            db.add(surface)
            await db.flush()
            surface_by_slug[spec["slug"]] = surface
            logger.info("Seeded surface %s", spec["slug"])

        await db.flush()

        # --- Booking config: Beltsville-specific public availability ---
        hours_spec = {
            0: (True, 8 * 60, 18 * 60),
            1: (True, 8 * 60, 18 * 60),
            2: (True, 8 * 60, 18 * 60),
            3: (True, 8 * 60, 18 * 60),
            4: (True, 8 * 60, 18 * 60),
            5: (True, 8 * 60, 14 * 60),
            6: (False, 8 * 60, 14 * 60),
        }
        for day, (is_open, open_minutes, close_minutes) in hours_spec.items():
            res = await db.execute(select(ClinicHours).where(ClinicHours.day_of_week == day))
            row = res.scalar_one_or_none()
            if not row:
                row = ClinicHours(day_of_week=day)
                db.add(row)
            row.is_open = is_open
            row.open_minutes = open_minutes
            row.close_minutes = close_minutes

        res = await db.execute(select(StaffConfig).limit(1))
        staff = res.scalar_one_or_none()
        if not staff:
            staff = StaffConfig()
            db.add(staff)
        staff.num_doctors = 2
        staff.num_techs = 3
        staff.slot_granularity_mins = 30
        staff.booking_window_days = 14
        staff.min_lead_time_hours = 4

        appointment_specs = [
            ("Wellness Exam / New Client Visit", "Routine wellness care, vaccines, preventive screening, and the new-client first wellness exam offer.", 40, 30, 40, "#30728e", 10),
            ("Same-Day Sick Visit Request", "For vomiting, diarrhea, limping, not eating, coughing, urinary issues, or a pet who is not acting like themselves. Call ahead for urgent needs.", 30, 30, 30, "#3b8da4", 20),
            ("Dental Care Consultation", "Dental exam, cleaning planning, oral pain concerns, extractions, and full-mouth X-ray discussions.", 30, 30, 30, "#3b8da4", 30),
            ("Surgery Consultation", "Spay/neuter, soft tissue surgery, mass removals, laceration repair, and procedure planning.", 30, 30, 30, "#30728e", 40),
            ("Boarding Inquiry", "Day, overnight, or medical boarding for current dog and cat clients.", 20, 10, 20, "#ced0d0", 50),
        ]
        for name, description, duration, doctor_mins, tech_mins, color, sort_order in appointment_specs:
            res = await db.execute(select(AppointmentType).where(AppointmentType.name == name))
            appt_type = res.scalar_one_or_none()
            if not appt_type:
                appt_type = AppointmentType(name=name)
                db.add(appt_type)
            appt_type.description = description
            appt_type.duration_mins = duration
            appt_type.doctor_mins = doctor_mins
            appt_type.tech_mins = tech_mins
            appt_type.color = color
            appt_type.sort_order = sort_order
            appt_type.active = True

        await db.flush()

        # --- Switches ---
        for raw_surface in seed_data["surfaces"]:
            surface = surface_by_slug.get(raw_surface["slug"])
            if not surface:
                continue

            for sw_spec in raw_surface.get("switches", []):
                res = await db.execute(
                    select(Switch).where(
                        Switch.surface_id == surface.id,
                        Switch.name == sw_spec["name"],
                    )
                )
                existing = res.scalar_one_or_none()

                # Display names may change during template cleanup; rule identity is
                # stable enough for refresh matching and prevents stale DB rows.
                if not existing:
                    res = await db.execute(select(Switch).where(Switch.surface_id == surface.id))
                    for candidate in res.scalars().all():
                        if candidate.rule == sw_spec.get("rule", {}):
                            existing = candidate
                            break

                if existing:
                    if refresh_existing:
                        existing.name = sw_spec["name"]
                        existing.rule = sw_spec.get("rule", {})
                        existing.priority = sw_spec.get("priority", 100)
                        existing.content = sw_spec.get("content", {})
                        existing.active = sw_spec.get("active", True)
                    continue

                switch = Switch(surface_id=surface.id, **sw_spec)
                db.add(switch)

        await db.commit()
        logger.info("Seed complete from %s (refresh_existing=%s).", SEED_PATH, refresh_existing)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(seed())
