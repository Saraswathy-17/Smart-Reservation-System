import pytest


@pytest.mark.asyncio
async def test_register_and_login(client):
    # 1. Register
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "testuser@example.com",
            "password": "Password@123",
            "full_name": "Test User",
            "phone": "+1-555-9999",
            "role": "USER",
        },
    )
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert reg_data["email"] == "testuser@example.com"
    assert "id" in reg_data

    # 2. Login
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "testuser@example.com",
            "password": "Password@123",
        },
    )
    assert login_resp.status_code == 200
    login_data = login_resp.json()
    assert "access_token" in login_data
    assert login_data["token_type"] == "bearer"

    # 3. Get profile /me
    token = login_data["access_token"]
    me_resp = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "testuser@example.com"


@pytest.mark.asyncio
async def test_login_invalid_password(client):
    resp = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "nonexistent@example.com",
            "password": "WrongPassword",
        },
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_admin_rbac_protection(client):
    # Register regular user
    reg_resp = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "regular_user@example.com",
            "password": "Password@123",
            "full_name": "Regular User",
            "role": "USER",
        },
    )
    assert reg_resp.status_code == 201

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "regular_user@example.com", "password": "Password@123"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access Admin Dashboard -> Must be 403 Forbidden
    dash_resp = await client.get("/api/v1/admin/dashboard", headers=headers)
    assert dash_resp.status_code == 403
    assert "administrative privileges" in dash_resp.json()["detail"].lower()

    # Attempt to access Admin Users -> Must be 403 Forbidden
    users_resp = await client.get("/api/v1/admin/users", headers=headers)
    assert users_resp.status_code == 403


@pytest.mark.asyncio
async def test_google_oauth_endpoints(client, monkeypatch):
    # Ensure unconfigured test isolation
    from app.core.config import settings
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", None)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", None)

    # Check Google config endpoint
    config_resp = await client.get("/api/v1/auth/google/config")
    assert config_resp.status_code == 200
    config_data = config_resp.json()
    assert "enabled" in config_data
    # In unconfigured environment, Google credentials report disabled
    assert config_data["enabled"] is False

    # Attempt OAuth callback without credentials -> Must return 501 Not Implemented
    cb_resp = await client.post(
        "/api/v1/auth/google/callback",
        json={"code": "fake-oauth-code"},
    )
    assert cb_resp.status_code == 501
    assert "not configured" in cb_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_profile_and_password_lifecycle(client):
    # Register and login
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "profile_user@example.com",
            "password": "OldPassword@123",
            "full_name": "Initial Name",
            "phone": "111-222-3333",
        },
    )
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "profile_user@example.com", "password": "OldPassword@123"},
    )
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Update profile
    prof_resp = await client.put(
        "/api/v1/auth/profile",
        json={"full_name": "Updated Name", "phone": "999-888-7777"},
        headers=headers,
    )
    assert prof_resp.status_code == 200
    assert prof_resp.json()["full_name"] == "Updated Name"

    # Change password
    pwd_resp = await client.put(
        "/api/v1/auth/change-password",
        json={"current_password": "OldPassword@123", "new_password": "NewPassword@123"},
        headers=headers,
    )
    assert pwd_resp.status_code == 200

    # Old password should now fail
    fail_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "profile_user@example.com", "password": "OldPassword@123"},
    )
    assert fail_login.status_code == 401

    # New password should succeed
    succ_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "profile_user@example.com", "password": "NewPassword@123"},
    )
    assert succ_login.status_code == 200
