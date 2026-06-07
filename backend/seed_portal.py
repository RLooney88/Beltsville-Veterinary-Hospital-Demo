"""Seed demo data for the client portal."""
from __future__ import annotations

import asyncio
import logging

from sqlalchemy import select

from auth import hash_password
from database import AsyncSessionLocal
from models import Client, Pet, ClientPetLink, PetContact, PetHealthRecord, PetAppointment

logger = logging.getLogger(__name__)


async def seed_portal():
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        res = await db.execute(select(Client).where(Client.email == "demo-client@example.com"))
        if res.scalar_one_or_none():
            logger.info("Portal seed: already seeded, skipping.")
            return

        # Create client
        client = Client(
            email="demo-client@example.com",
            password_hash=hash_password("Rosie2026!"),
            first_name="Roddy",
            last_name="Looney",
            phone="(410) 555-0199",
        )
        db.add(client)
        await db.flush()

        # Create pet: Rosie the Chizon
        rosie = Pet(
            name="Rosie",
            species="dog",
            breed="Chizon (Bichon Frise / Shih Tzu mix)",
            dob="2021-03-15",
            sex="female",
            weight_lbs=12.4,
            microchip_id="985141002345678",
            notes="Sweet, gentle temperament. Prefers slow introductions. Loves treats.",
        )
        db.add(rosie)
        await db.flush()

        # Link client to pet
        db.add(ClientPetLink(client_id=client.id, pet_id=rosie.id, role="owner"))

        # Contacts for Rosie
        db.add(PetContact(pet_id=rosie.id, name="Demo Client", relation="owner", phone="(410) 555-0199", email="demo-client@example.com"))
        db.add(PetContact(pet_id=rosie.id, name="Emergency Vet (Local)", relation="emergency", phone="(410) 224-0331"))

        # Health records - Vaccinations
        db.add(PetHealthRecord(pet_id=rosie.id, record_type="vaccination", name="Rabies (3-year)", date_performed="2024-06-12", next_due="2027-06-12"))
        db.add(PetHealthRecord(pet_id=rosie.id, record_type="vaccination", name="DHPP", date_performed="2025-06-10", next_due="2026-06-10"))
        db.add(PetHealthRecord(pet_id=rosie.id, record_type="vaccination", name="Bordetella", date_performed="2025-09-18", next_due="2026-09-18"))
        db.add(PetHealthRecord(pet_id=rosie.id, record_type="vaccination", name="Leptospirosis", date_performed="2025-06-10", next_due="2026-06-10"))

        # Health records - Diagnostics
        db.add(PetHealthRecord(pet_id=rosie.id, record_type="bloodwork", name="CBC / Chemistry Panel", date_performed="2025-06-10", notes="All values within normal range."))
        db.add(PetHealthRecord(pet_id=rosie.id, record_type="fecal", name="Fecal Float", date_performed="2025-06-10", notes="Negative for parasites."))
        db.add(PetHealthRecord(pet_id=rosie.id, record_type="dental", name="Dental Cleaning + Full Mouth X-rays", date_performed="2024-11-05", notes="Grade 1 tartar. No extractions needed. Good dental health."))

        # Appointments
        db.add(PetAppointment(pet_id=rosie.id, date="2025-06-10", reason="Annual Wellness Exam + Vaccines", provider="Dr. Veterinarian Name", status="completed", notes="All vaccines updated. Weight stable. Heart and lungs clear."))
        db.add(PetAppointment(pet_id=rosie.id, date="2025-09-18", reason="Bordetella Booster", provider="Dr. Veterinarian Name", status="completed", notes="Quick visit. No concerns."))
        db.add(PetAppointment(pet_id=rosie.id, date="2024-11-05", reason="Dental Cleaning", provider="Dr. Veterinarian Name", status="completed", notes="Dental cleaning under anesthesia. Recovered well."))
        db.add(PetAppointment(pet_id=rosie.id, date="2026-06-10", reason="Annual Wellness Exam", provider="Dr. Veterinarian Name", status="upcoming"))

        await db.commit()
        logger.info("Portal seed: created Demo Client + Rosie the Chizon with full health records.")
