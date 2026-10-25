import pytest
from datetime import date, time
from app.models.resource import Resource
from app.models.slot import Slot
from app.models.user import User
from app.models.queue import QueueEntry
from app.core.security import get_password_hash, create_access_token
from sqlalchemy import select


@pytest.mark.asyncio
async def test_queue_flow_and_auto_promotion(client, db_session):
    # Setup 3 users, 1 resource with capacity 1, 1 slot
    u1 = User(email="q_user1@example.com", password_hash=get_password_hash("Pass@123"), full_name="User One")
    u2 = User(email="q_user2@example.com", password_hash=get_password_hash("Pass@123"), full_name="User Two")
    u3 = User(email="q_user3@example.com", password_hash=get_password_hash("Pass@123"), full_name="User Three")
    res = Resource(name="Hot Desk 1", category="Desks", base_capacity=1)
    db_session.add_all([u1, u2, u3, res])
    await db_session.commit()
    for item in [u1, u2, u3, res]:
        await db_session.refresh(item)

    slot = Slot(
        resource_id=res.id,
        slot_date=date.today(),
        start_time=time(10, 0),
        end_time=time(11, 0),
        max_capacity=1,
        current_reservations=0,
        status="AVAILABLE",
    )
    db_session.add(slot)
    await db_session.commit()
    await db_session.refresh(slot)

    t1 = create_access_token(subject=u1.id)
    t2 = create_access_token(subject=u2.id)
    t3 = create_access_token(subject=u3.id)

    # 1. User 1 books the slot
    book_resp = await client.post(
        "/api/v1/reservations/",
        json={"slot_id": slot.id, "party_size": 1},
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert book_resp.status_code == 201
    res1_id = book_resp.json()["id"]

    # 2. User 2 joins queue -> Position 1
    q2_resp = await client.post(
        "/api/v1/queue/join",
        json={"slot_id": slot.id, "party_size": 1},
        headers={"Authorization": f"Bearer {t2}"},
    )
    assert q2_resp.status_code == 201
    q2_data = q2_resp.json()
    assert q2_data["position"] == 1
    assert q2_data["status"] == "WAITING"
    assert q2_data["predicted_wait_time_minutes"] > 0

    # 3. User 3 joins queue -> Position 2
    q3_resp = await client.post(
        "/api/v1/queue/join",
        json={"slot_id": slot.id, "party_size": 1},
        headers={"Authorization": f"Bearer {t3}"},
    )
    assert q3_resp.status_code == 201
    q3_data = q3_resp.json()
    assert q3_data["position"] == 2
    assert q3_data["status"] == "WAITING"

    # 4. User 1 cancels reservation -> Triggers auto-promotion!
    cancel_resp = await client.post(
        f"/api/v1/reservations/{res1_id}/cancel",
        headers={"Authorization": f"Bearer {t1}"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    # 5. Verify User 2 was PROMOTED
    q2_check = await client.get(
        f"/api/v1/queue/{q2_data['id']}/status",
        headers={"Authorization": f"Bearer {t2}"},
    )
    assert q2_check.json()["status"] == "PROMOTED"

    # Verify User 2 now has a confirmed reservation
    u2_res = await client.get(
        "/api/v1/reservations/my",
        headers={"Authorization": f"Bearer {t2}"},
    )
    assert len(u2_res.json()) == 1
    assert u2_res.json()[0]["status"] == "CONFIRMED"

    # 6. Verify User 3 was promoted to Position 1 in the queue
    q3_check = await client.get(
        f"/api/v1/queue/{q3_data['id']}/status",
        headers={"Authorization": f"Bearer {t3}"},
    )
    assert q3_check.json()["position"] == 1
    assert q3_check.json()["status"] == "WAITING"
