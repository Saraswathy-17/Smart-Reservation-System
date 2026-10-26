import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from urllib.parse import urlencode
from app.core.config import settings
from app.core.database import get_db
from app.models.base import generate_uuid
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_reset_token,
    verify_reset_token,
)
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    Token,
    UserUpdateProfile,
    UserChangePassword,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    GoogleOAuthConfig,
    GoogleAuthCallback,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if email is already taken
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Standard public registration is strictly role="USER" to prevent privilege escalation
    new_user = User(
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
        role="USER",
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive. Please contact administrator.",
        )

    access_token = create_access_token(subject=user.id, role=user.role)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    profile_in: UserUpdateProfile,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if profile_in.full_name is not None:
        current_user.full_name = profile_in.full_name
    if profile_in.phone is not None:
        current_user.phone = profile_in.phone

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.put("/change-password")
async def change_password(
    pwd_in: UserChangePassword,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(pwd_in.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    current_user.password_hash = get_password_hash(pwd_in.new_password)
    await db.commit()
    return {"message": "Password updated successfully."}


@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()

    # Even if user not found, return generic message for security
    if not user:
        return {
            "message": "If this email is registered in our system, password reset instructions have been dispatched.",
            "reset_token_demo": None,
        }

    reset_token = create_reset_token(user.email)
    return {
        "message": "Password reset token generated. Use this token to reset your password.",
        "reset_token_demo": reset_token,
    }


@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    email = verify_reset_token(req.token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    user.password_hash = get_password_hash(req.new_password)
    await db.commit()
    return {"message": "Your password has been reset successfully. You can now sign in."}


@router.get("/google/config", response_model=GoogleOAuthConfig)
async def get_google_auth_config():
    """
    Checks if Google OAuth is properly configured via environment variables.
    Returns authorization URL if configured; otherwise reports disabled.
    """
    is_configured = bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)

    auth_url = None
    if is_configured:
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI or "http://localhost:5173/auth/google/callback",
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "online",
            "prompt": "select_account",
        }
        auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    return GoogleOAuthConfig(
        enabled=is_configured,
        client_id=settings.GOOGLE_CLIENT_ID if is_configured else None,
        redirect_uri=settings.GOOGLE_REDIRECT_URI if is_configured else None,
        auth_url=auth_url,
    )


@router.post("/google/callback", response_model=Token)
async def google_auth_callback(
    callback_in: GoogleAuthCallback,
    db: AsyncSession = Depends(get_db),
):
    """
    Handles Google OAuth callback.
    Exchanges code for Google tokens, retrieves user profile, creates/logs in user, and issues JWT.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured on this server. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the server environment.",
        )

    if not callback_in.code and not callback_in.id_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing OAuth authorization code or ID token.",
        )

    redirect_uri = settings.GOOGLE_REDIRECT_URI or (callback_in.redirect_uri.rstrip('/') if callback_in.redirect_uri else "http://localhost:5173/auth/google/callback")

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": callback_in.code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )

            if token_resp.status_code != 200:
                error_data = token_resp.json() if "application/json" in token_resp.headers.get("content-type", "") else {}
                err_msg = error_data.get("error_description") or error_data.get("error") or token_resp.text
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Google token exchange failed: {err_msg}",
                )

            tokens = token_resp.json()
            access_token = tokens.get("access_token")

            # Fetch user profile from Google UserInfo endpoint
            userinfo_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )

            if userinfo_resp.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to retrieve profile information from Google.",
                )

            profile = userinfo_resp.json()
            email = profile.get("email")
            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Google account did not return an email address.",
                )

            full_name = profile.get("name") or profile.get("given_name") or email.split("@")[0]

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error communicating with Google OAuth service: {str(exc)}",
        )

    # Locate or create user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        # Register new user authenticated via Google
        try:
            user = User(
                email=email,
                password_hash=get_password_hash(generate_uuid()),
                full_name=full_name,
                role="USER",
                is_active=True,
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        except Exception:
            await db.rollback()
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is deactivated. Please contact administrator.",
        )

    jwt_token = create_access_token(subject=user.id, role=user.role)
    return Token(
        access_token=jwt_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )
