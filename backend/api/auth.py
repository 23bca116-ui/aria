from fastapi import APIRouter, Depends, HTTPException, status
from supabase import Client
from core.deps import get_supabase
from models.user import UserSignup, UserLogin

router = APIRouter()

@router.get("/health")
async def health():
    return {"status": "ok", "service": "auth"}

@router.post("/signup")
async def signup(user_data: UserSignup, supabase: Client = Depends(get_supabase)):
    try:
        res = supabase.auth.sign_up({
            "email": user_data.email, 
            "password": user_data.password,
            "options": {
                "data": {
                    "name": user_data.name
                }
            }
        })
        if res.user is None:
            raise HTTPException(status_code=400, detail="Signup failed.")
            
        # Force auto-confirm using admin API
        try:
            supabase.auth.admin.update_user_by_id(res.user.id, {"email_confirm": True})
            # Sign in again to get a valid confirmed session
            res = supabase.auth.sign_in_with_password({"email": user_data.email, "password": user_data.password})
        except Exception as e:
            print(f"Warning: Auto-confirm failed: {e}")
            
        return {
            "message": "User created successfully",
            "user": {
                "id": res.user.id,
                "email": res.user.email,
                "name": res.user.user_metadata.get("name")
            },
            "session": res.session
        }
    except Exception as e:
        error_msg = str(e).lower()
        if "rate limit" in error_msg:
            # Fallback to admin bypass if rate limited
            try:
                user = supabase.auth.admin.create_user({
                    "email": user_data.email,
                    "password": user_data.password,
                    "email_confirm": True,
                    "user_metadata": {"name": user_data.name}
                })
                res = supabase.auth.sign_in_with_password({"email": user_data.email, "password": user_data.password})
                return {
                    "message": "User created successfully",
                    "user": {
                        "id": res.user.id,
                        "email": res.user.email,
                        "name": user_data.name
                    },
                    "session": res.session
                }
            except Exception as admin_err:
                raise HTTPException(status_code=400, detail=f"Admin fallback failed: {str(admin_err)}")

        if "already registered" in error_msg or "already exists" in error_msg:
            raise HTTPException(status_code=400, detail="User already exists with this email.")
        
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=f"Signup error: {str(e)}")

@router.post("/login")
async def login(user_data: UserLogin, supabase: Client = Depends(get_supabase)):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": user_data.email, 
            "password": user_data.password
        })
        if res.session is None:
             raise HTTPException(status_code=401, detail="Invalid credentials.")
        return {
            "message": "Login successful",
            "session": {
                "access_token": res.session.access_token,
                "refresh_token": res.session.refresh_token,
            },
            "user": {
                "id": res.user.id,
                "email": res.user.email,
                "name": res.user.user_metadata.get("name")
            }
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Login failed: {str(e)}")

@router.post("/logout")
async def logout(supabase: Client = Depends(get_supabase)):
    try:
        res = supabase.auth.sign_out()
        return {"message": "Logged out successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
