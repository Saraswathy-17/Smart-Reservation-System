import pytest
from datetime import date, time
from app.models.resource import Resource
from app.models.slot import Slot
from app.models.user import User
from app.core.security import get_password_hash, create_access_token


@pytest.mark.asyncio
async def test_reservation_and_double_booking_prevention(client, db_session):
    # Setup test user and slot
    user = User(
        email="res_test@example.com",
        password_hash=get_password_hash("Pass@123"),
        full_name="Reservation Tester",
        role="USER",
    )
    resource = Resource(
        name="Test Room",
        category="Meeting",
        base_capacity=1,
    )
    db_session.add_all([user, resource])
    await db_session.commit()
    await db_session.refresh(user)
    await db_session.refresh(resource)

    slot = Slot(
        resource_id=resource.id,
        slot_date=date.today(),
        start_time=time(14, 0),
        end_time=time(15, 0),
        max_capacity=1,
        current_reservations=0,
        status="AVAILABLE",
    )
    db_session.add(slot)
    await db_session.commit()
    await db_session.refresh(slot)

    token = create_access_token(subject=user.id, role=user.role)
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Book the slot
    book_resp = await client.post(
        "/api/v1/reservations/",
        json={"slot_id": slot.id, "party_size": 1, "special_notes": "Project demo"},
        headers=headers,
    )
    assert book_resp.status_code == 201
    book_data = book_resp.json()
    assert book_data["status"] == "CONFIRMED"
    assert "RES-" in book_data["reservation_code"]

    # 2. Try to book the same slot again with the same user -> Should fail (Double booking prevention)
    double_book = await client.post(
        "/api/v1/reservations/",
        json={"slot_id": slot.id, "party_size": 1},
        headers=headers,
    )
    assert double_book.status_code == 400
    assert "already have an active confirmed reservation" in double_book.json()["detail"]

    # 3. Create second user and try to book -> Should fail with 409 (Capacity reached)
    user2 = User(
        email="res_test2@example.com",
        password_hash=get_password_hash("Pass@123"),
        full_name="Second Tester",
        role="USER",
    )
    db_session.add(user2)
    await db_session.commit()
    await db_session.refresh(user2)

    token2 = create_access_token(subject=user2.id, role=user2.role)
    headers2 = {"Authorization": f"Bearer {token2}"}

    overbook = await client.post(
        "/api/v1/reservations/",
        json={"slot_id": slot.id, "party_size": 1},
        headers=headers2,
    )
    assert overbook.status_code == 409
    assert "fully booked" in overbook.json()["detail"]
