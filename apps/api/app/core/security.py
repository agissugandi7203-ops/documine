from typing import Optional, Dict, Any
import urllib.request
import urllib.error
import json
from fastapi import Header, HTTPException
from app.core.config import settings


def extract_bearer_token(authorization: Optional[str]) -> Optional[str]:
    """Extract raw JWT token from Authorization: Bearer <token> header."""
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    token = parts[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty bearer token.")
    return token


def verify_supabase_bearer_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify a Supabase JWT access token against Supabase GoTrue /auth/v1/user."""
    if not token or not settings.supabase_url:
        return None

    api_key = settings.effective_supabase_service_key or settings.supabase_anon_key
    if not api_key:
        return None

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/user"
    req = urllib.request.Request(
        url,
        headers={
            "apikey": api_key,
            "Authorization": f"Bearer {token}",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            if resp.status != 200:
                return None
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, ValueError):
        return None


async def get_optional_current_user(
    authorization: Optional[str] = Header(default=None),
) -> Optional[Dict[str, Any]]:
    """
    Validates Bearer token when provided; returns None when unauthenticated
    unless strict enforcement is required by a route.
    """
    token = extract_bearer_token(authorization)
    if not token:
        return None

    user = verify_supabase_bearer_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired session token.")
    user["_access_token"] = token
    return user


async def require_authenticated_user(
    authorization: Optional[str] = Header(default=None),
) -> Dict[str, Any]:
    """Strict dependency requiring a valid Supabase Bearer token."""
    user = await get_optional_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if settings.require_email_verification:
        is_verified = bool(user.get("email_confirmed_at") or user.get("confirmed_at"))
        if not is_verified:
            raise HTTPException(
                status_code=403,
                detail="Email verification is required before accessing workspace resources.",
            )
    return user
