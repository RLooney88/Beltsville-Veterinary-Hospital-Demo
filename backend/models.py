"""SQLAlchemy ORM models for the Veterinary Site Template.

Core tables:
    users            - admin login accounts
    visitor_sessions - anonymous site visitors with accumulated intent state
    signal_events    - append-only log of every tracked interaction
    surfaces         - named dynamic sections of the site (home_hero, featured_care, etc.)
    switches         - rules attached to surfaces that swap content per intent
    lead_submissions - contact / appointment form submissions + full intent trail
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(120), default="Admin")
    role: Mapped[str] = mapped_column(String(32), default="admin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class VisitorSession(Base):
    __tablename__ = "visitor_sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    session_token: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    parent_intent: Mapped[str | None] = mapped_column(String(32), nullable=True)  # dogs|cats|critters
    sub_intent: Mapped[str | None] = mapped_column(String(64), nullable=True)
    intent_scores: Mapped[dict] = mapped_column(JSONB, default=dict)  # {dogs:3, cats:1,...}
    sub_intent_scores: Mapped[dict] = mapped_column(JSONB, default=dict)
    first_referrer: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_view_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    events: Mapped[list["SignalEvent"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )
    leads: Mapped[list["LeadSubmission"]] = relationship(back_populates="session")


class SignalEvent(Base):
    __tablename__ = "signal_events"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("visitor_sessions.id", ondelete="CASCADE"), index=True
    )
    signal_type: Mapped[str] = mapped_column(String(64), nullable=False)  # page_view, cta_click, form_start, etc.
    page_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    intent: Mapped[str | None] = mapped_column(String(32), nullable=True)
    sub_intent: Mapped[str | None] = mapped_column(String(64), nullable=True)
    strength: Mapped[int] = mapped_column(Integer, default=1)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)

    session: Mapped["VisitorSession"] = relationship(back_populates="events")


class Surface(Base):
    __tablename__ = "surfaces"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    page: Mapped[str] = mapped_column(String(64), default="home")  # home, appointment, service, etc.
    default_content: Mapped[dict] = mapped_column(JSONB, default=dict)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    switches: Mapped[list["Switch"]] = relationship(
        back_populates="surface", cascade="all, delete-orphan"
    )


class Switch(Base):
    __tablename__ = "switches"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    surface_id: Mapped[str] = mapped_column(
        UUID(as_uuid=False), ForeignKey("surfaces.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    # Rule: {"intent":"dogs","sub_intent":"new_puppy","min_strength":0}
    rule: Mapped[dict] = mapped_column(JSONB, default=dict)
    content: Mapped[dict] = mapped_column(JSONB, default=dict)  # freeform (headline, image, cta...)
    priority: Mapped[int] = mapped_column(Integer, default=100)  # lower = higher priority
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    surface: Mapped["Surface"] = relationship(back_populates="switches")


class LeadSubmission(Base):
    __tablename__ = "lead_submissions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    session_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("visitor_sessions.id", ondelete="SET NULL"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pet_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    pet_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    service_interest: Mapped[str | None] = mapped_column(String(120), nullable=True)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    preferred_time: Mapped[str | None] = mapped_column(String(120), nullable=True)
    source_page: Mapped[str | None] = mapped_column(String(255), nullable=True)
    intent_summary: Mapped[dict] = mapped_column(JSONB, default=dict)
    signal_trail: Mapped[list] = mapped_column(JSONB, default=list)
    narrative_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="new")  # new|contacted|closed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)

    session: Mapped["VisitorSession | None"] = relationship(back_populates="leads")


class WebhookConfig(Base):
    __tablename__ = "webhook_configs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), default="lead_created")  # lead_created, etc.
    headers: Mapped[dict] = mapped_column(JSONB, default=dict)  # custom headers (auth tokens, etc.)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_fired_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_status_code: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class ChatbotConfig(Base):
    __tablename__ = "chatbot_config"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    training_context: Mapped[str] = mapped_column(Text, default="")  # extra knowledge the admin adds
    guardrails: Mapped[str] = mapped_column(Text, default="")
    provider: Mapped[str] = mapped_column(String(32), default="openai")
    model: Mapped[str] = mapped_column(String(64), default="gpt-4o-mini")
    api_key_override: Mapped[str | None] = mapped_column(Text, nullable=True)  # if set, use this instead of env
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    session_token: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(16), nullable=False)  # user | assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class ChatBooking(Base):
    """Demo bookings created by the chatbot when it collects full contact + pet info."""
    __tablename__ = "chat_bookings"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    session_token: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    client_name: Mapped[str] = mapped_column(String(160), nullable=False)
    client_phone: Mapped[str] = mapped_column(String(64), nullable=False)
    client_email: Mapped[str] = mapped_column(String(255), nullable=False)
    pet_name: Mapped[str] = mapped_column(String(120), nullable=False)
    pet_breed: Mapped[str] = mapped_column(String(160), nullable=False)
    preferred_time: Mapped[str] = mapped_column(String(160), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="new")  # new|confirmed|cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)


class SiteEditRequest(Base):
    """Local audit/status row for requests forwarded to Nova Site Editor."""
    __tablename__ = "site_edit_requests"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    client_request_id: Mapped[str] = mapped_column(String(160), unique=True, nullable=False, index=True)
    nova_request_id: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    nova_thread_id: Mapped[str | None] = mapped_column(String(160), nullable=True)
    status: Mapped[str] = mapped_column(String(64), default="draft", index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    page_requested: Mapped[str | None] = mapped_column(String(512), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    submitter_name: Mapped[str] = mapped_column(String(160), nullable=False)
    submitter_email: Mapped[str] = mapped_column(String(255), nullable=False)
    approval_required: Mapped[bool] = mapped_column(Boolean, default=True)
    nova_payload: Mapped[dict] = mapped_column(JSONB, default=dict)
    nova_response: Mapped[dict] = mapped_column(JSONB, default=dict)
    callback_payloads: Mapped[list] = mapped_column(JSONB, default=list)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


# ---------- Client Portal ----------
class Client(Base):
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(120), nullable=False)
    last_name: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    pet_links: Mapped[list["ClientPetLink"]] = relationship(back_populates="client", cascade="all, delete-orphan")


class Pet(Base):
    __tablename__ = "pets"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    species: Mapped[str] = mapped_column(String(32), nullable=False)  # dog, cat, rabbit, etc.
    breed: Mapped[str | None] = mapped_column(String(120), nullable=True)
    dob: Mapped[str | None] = mapped_column(String(32), nullable=True)  # YYYY-MM-DD or approximate
    sex: Mapped[str | None] = mapped_column(String(16), nullable=True)  # male, female, unknown
    weight_lbs: Mapped[float | None] = mapped_column(nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    microchip_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    client_links: Mapped[list["ClientPetLink"]] = relationship(back_populates="pet", cascade="all, delete-orphan")
    contacts: Mapped[list["PetContact"]] = relationship(back_populates="pet", cascade="all, delete-orphan")
    health_records: Mapped[list["PetHealthRecord"]] = relationship(back_populates="pet", cascade="all, delete-orphan")
    appointments: Mapped[list["PetAppointment"]] = relationship(back_populates="pet", cascade="all, delete-orphan")


class ClientPetLink(Base):
    __tablename__ = "client_pet_links"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    client_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("clients.id", ondelete="CASCADE"), index=True)
    pet_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("pets.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(32), default="owner")  # owner, co-owner, caretaker

    client: Mapped["Client"] = relationship(back_populates="pet_links")
    pet: Mapped["Pet"] = relationship(back_populates="client_links")


class PetContact(Base):
    __tablename__ = "pet_contacts"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    pet_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("pets.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    relation: Mapped[str] = mapped_column(String(64), default="owner")  # owner, spouse, emergency, caretaker
    phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    pet: Mapped["Pet"] = relationship("Pet", back_populates="contacts")


class PetHealthRecord(Base):
    __tablename__ = "pet_health_records"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    pet_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("pets.id", ondelete="CASCADE"), index=True)
    record_type: Mapped[str] = mapped_column(String(64), nullable=False)  # vaccination, bloodwork, fecal, dental
    name: Mapped[str] = mapped_column(String(160), nullable=False)  # e.g. "Rabies", "DHPP", "CBC Panel"
    date_performed: Mapped[str] = mapped_column(String(32), nullable=False)  # YYYY-MM-DD
    next_due: Mapped[str | None] = mapped_column(String(32), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    pet: Mapped["Pet"] = relationship(back_populates="health_records")


class PetAppointment(Base):
    __tablename__ = "pet_appointments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    pet_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("pets.id", ondelete="CASCADE"), index=True)
    date: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    provider: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="completed")  # completed, upcoming, cancelled
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    pet: Mapped["Pet"] = relationship(back_populates="appointments")


# ---------- Booking calendar ----------

class AppointmentType(Base):
    """A bookable appointment kind (Wellness, Dental, Urgent, etc.)."""
    __tablename__ = "appointment_types"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_mins: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    # How many minutes inside the appointment actually need the doctor present.
    # Doctors cannot be double-booked for this window. Set to 0 for tech-only visits.
    doctor_mins: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    # How many minutes need a vet tech. Usually full duration. Set <= duration_mins.
    tech_mins: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)  # hex or token for UI
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class ClinicHours(Base):
    """One row per weekday defining open/close times and whether the clinic is open."""
    __tablename__ = "clinic_hours"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    # 0 = Monday ... 6 = Sunday (ISO-ish). Unique per day.
    day_of_week: Mapped[int] = mapped_column(Integer, unique=True, nullable=False)
    is_open: Mapped[bool] = mapped_column(Boolean, default=True)
    open_minutes: Mapped[int] = mapped_column(Integer, default=480)   # 8:00 AM
    close_minutes: Mapped[int] = mapped_column(Integer, default=960)  # 4:00 PM


class StaffConfig(Base):
    """Singleton row defining staffing capacity."""
    __tablename__ = "staff_config"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    num_doctors: Mapped[int] = mapped_column(Integer, default=1)
    num_techs: Mapped[int] = mapped_column(Integer, default=2)
    # Minimum granularity for booking start times, in minutes.
    slot_granularity_mins: Mapped[int] = mapped_column(Integer, default=30)
    # How far in the future bookings can go.
    booking_window_days: Mapped[int] = mapped_column(Integer, default=14)
    # Minimum lead time before a booking can be made, in hours.
    min_lead_time_hours: Mapped[int] = mapped_column(Integer, default=2)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class BlockedTime(Base):
    """Admin-defined blackout ranges (holidays, training, surgery days)."""
    __tablename__ = "blocked_times"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    # What it blocks: "doctor", "tech", or "all".
    blocks: Mapped[str] = mapped_column(String(16), default="all")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class Appointment(Base):
    """A booked appointment tied (optionally) to a lead submission."""
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=_uuid)
    lead_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("lead_submissions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    appointment_type_id: Mapped[str | None] = mapped_column(
        UUID(as_uuid=False), ForeignKey("appointment_types.id", ondelete="SET NULL"), nullable=True
    )
    # Denormalised for fast admin display and surviving deleted types.
    appointment_type_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    client_name: Mapped[str] = mapped_column(String(160), nullable=False)
    client_email: Mapped[str] = mapped_column(String(255), nullable=False)
    client_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    pet_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    pet_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    # The doctor / tech busy windows within this appointment. Denormalised for fast
    # availability checks without re-reading the type.
    doctor_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    tech_ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    status: Mapped[str] = mapped_column(String(32), default="booked")  # booked|confirmed|cancelled|completed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)
