import asyncio
from datetime import date, time, timedelta
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.user import User
from app.models.resource import Resource
from app.models.slot import Slot
from app.models.reservation import Reservation, generate_reservation_code
from app.models.queue import QueueEntry
from app.models.base import get_utc_now
from app.ml.predictor import predictor


async def seed_database():
    print("Initializing database tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Check if already seeded
        admin_check = await db.execute(select(User).where(User.email == "admin@smartreserve.com"))
        if admin_check.scalar_one_or_none():
            print("Database already contains seed data.")
            return

        print("Seeding initial users...")
        # 1. Admin User
        admin_user = User(
            email="admin@smartreserve.com",
            password_hash=get_password_hash("Admin@123"),
            full_name="System Administrator",
            phone="+1-555-0100",
            role="ADMIN",
        )
        # 2. Demo User 1
        demo_user_1 = User(
            email="alice@example.com",
            password_hash=get_password_hash("Alice@123"),
            full_name="Alice Johnson",
            phone="+1-555-0101",
            role="USER",
        )
        # 3. Demo User 2
        demo_user_2 = User(
            email="bob@example.com",
            password_hash=get_password_hash("Bob@123"),
            full_name="Bob Smith",
            phone="+1-555-0102",
            role="USER",
        )
        # 4. Demo User 3
        demo_user_3 = User(
            email="carol@example.com",
            password_hash=get_password_hash("Carol@123"),
            full_name="Carol White",
            phone="+1-555-0103",
            role="USER",
        )
        db.add_all([admin_user, demo_user_1, demo_user_2, demo_user_3])
        await db.commit()
        await db.refresh(admin_user)
        await db.refresh(demo_user_1)
        await db.refresh(demo_user_2)
        await db.refresh(demo_user_3)

        print("Seeding resources...")
        # Resources
        res_auditorium = Resource(
            name="Apex Executive Conference Room",
            description="High-tech executive boardroom with 4K teleconferencing, smart board, and 12-person seating.",
            category="Meeting Spaces",
            base_capacity=1,
        )
        res_lab = Resource(
            name="Quantum AI Research Lab Workstation",
            description="Dual RTX 4090 GPU deep learning workstation with high-speed isolated network.",
            category="Lab & Computing",
            base_capacity=2,
        )
        res_dining = Resource(
            name="Skyline Terrace Dining Table (4-Seat)",
            description="Panoramic glass terrace dining booth with curated culinary tasting menu.",
            category="Dining & Hospitality",
            base_capacity=4,
        )
        res_consult = Resource(
            name="Wellness Consultation Suite A",
            description="Private consultation chamber equipped with acoustic dampening and ergonomic seating.",
            category="Healthcare & Wellness",
            base_capacity=1,
        )
        db.add_all([res_auditorium, res_lab, res_dining, res_consult])
        await db.commit()
        for r in [res_auditorium, res_lab, res_dining, res_consult]:
            await db.refresh(r)

        print("Seeding slots for current date and upcoming days...")
        today = date.today()
        all_resources = [res_auditorium, res_lab, res_dining, res_consult]
        
        created_slots = []
        for day_offset in range(5):
            slot_d = today + timedelta(days=day_offset)
            hours = [(9, 10), (10, 11), (11, 12), (13, 14), (14, 15), (15, 16), (17, 18), (18, 19)]
            
            for res in all_resources:
                for st_h, end_h in hours:
                    # Stagger capacities
                    cap = res.base_capacity
                    s = Slot(
                        resource_id=res.id,
                        slot_date=slot_d,
                        start_time=time(hour=st_h, minute=0),
                        end_time=time(hour=end_h, minute=0),
                        max_capacity=cap,
                        current_reservations=0,
                        status="AVAILABLE",
                    )
                    db.add(s)
                    created_slots.append(s)

        await db.commit()
        print(f"Created {len(created_slots)} reservation slots.")

        # Let's create a realistic scenario on today's slots for Apex Executive Conference Room:
        # Slot 1 (10:00 - 11:00): Fully Booked by Alice
        slot_10am = next(
            s for s in created_slots 
            if s.resource_id == res_auditorium.id and s.slot_date == today and s.start_time.hour == 10
        )
        slot_10am.current_reservations = 1
        slot_10am.status = "FULL"
        res_1 = Reservation(
            user_id=demo_user_1.id,
            slot_id=slot_10am.id,
            reservation_code="RES-DEMO10A",
            party_size=1,
            status="CONFIRMED",
            special_notes="Quarterly executive board review.",
            confirmed_at=get_utc_now(),
        )
        db.add(res_1)

        # Bob joins queue for 10am slot (Position 1)
        pred_bob = predictor.predict(
            queue_position=1,
            total_queue_length=2,
            resource_capacity=slot_10am.max_capacity,
            slot_duration_minutes=60,
            hour_of_day=10,
            day_of_week=today.weekday(),
        )
        q_bob = QueueEntry(
            user_id=demo_user_2.id,
            slot_id=slot_10am.id,
            position=1,
            status="WAITING",
            party_size=1,
            predicted_wait_time_minutes=pred_bob["predicted_wait_time_minutes"],
            joined_at=get_utc_now() - timedelta(minutes=15),
        )
        db.add(q_bob)

        # Carol joins queue for 10am slot (Position 2)
        pred_carol = predictor.predict(
            queue_position=2,
            total_queue_length=2,
            resource_capacity=slot_10am.max_capacity,
            slot_duration_minutes=60,
            hour_of_day=10,
            day_of_week=today.weekday(),
        )
        q_carol = QueueEntry(
            user_id=demo_user_3.id,
            slot_id=slot_10am.id,
            position=2,
            status="WAITING",
            party_size=1,
            predicted_wait_time_minutes=pred_carol["predicted_wait_time_minutes"],
            joined_at=get_utc_now() - timedelta(minutes=5),
        )
        db.add(q_carol)

        # Dining table slot (18:00 - 19:00): Partially booked (2 of 4)
        slot_dining = next(
            s for s in created_slots 
            if s.resource_id == res_dining.id and s.slot_date == today and s.start_time.hour == 18
        )
        slot_dining.current_reservations = 2
        slot_dining.status = "PARTIAL"
        res_dining_booking = Reservation(
            user_id=demo_user_2.id,
            slot_id=slot_dining.id,
            reservation_code="RES-DINING8",
            party_size=2,
            status="CONFIRMED",
            special_notes="Window view requested.",
            confirmed_at=get_utc_now(),
        )
        db.add(res_dining_booking)

        await db.commit()
        print("Database successfully seeded with realistic sample data!")


if __name__ == "__main__":
    asyncio.run(seed_database())
