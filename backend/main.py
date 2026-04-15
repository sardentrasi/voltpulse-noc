"""
NOC Dashboard — Python Backend (FastAPI)
Handles SSH connections, device management, and polling.
"""
import asyncio
import jwt
import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional

from database import init_database, get_all_devices, get_device_by_id, create_device
from database import update_device, delete_device, update_device_status, log_command, get_recent_metrics
from database import get_user_by_username, get_user_by_id, verify_password, update_user_password
from ssh_manager import poll_device, restart_device

JWT_SECRET = "voltpulse-noc-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24


# --- Pydantic Models ---

class DeviceCreate(BaseModel):
    name: str
    ip: str
    port: int = 22
    username: str
    password: str
    brand: str = Field(..., pattern="^(mikrotik|ruijie|ruckus|unifi)$")


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    ip: Optional[str] = None
    port: Optional[int] = None
    username: Optional[str] = None
    password: Optional[str] = None
    brand: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


# --- JWT Helpers ---

def create_token(user_id, username, role):
    payload = {
        "user_id": user_id,
        "username": username,
        "role": role,
        "exp": int(time.time()) + (JWT_EXPIRY_HOURS * 3600),
        "iat": int(time.time()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# --- App Lifecycle ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    print("[NOC] Backend ready — SSH poller standing by.")
    yield
    print("[NOC] Backend shutting down.")


app = FastAPI(
    title="NOC Dashboard API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Auth Routes ---

@app.post("/auth/login")
def login(payload: LoginRequest):
    user = get_user_by_username(payload.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_token(user["id"], user["username"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "display_name": user["display_name"],
            "role": user["role"],
        }
    }


@app.get("/auth/me")
def get_me(authorization: str = Header(None)):
    payload = verify_token(authorization)
    user = get_user_by_id(payload["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return {
        "id": user["id"],
        "username": user["username"],
        "display_name": user["display_name"],
        "role": user["role"],
    }


@app.post("/auth/change-password")
def change_password(payload: ChangePasswordRequest, authorization: str = Header(None)):
    token_data = verify_token(authorization)
    user = get_user_by_id(token_data["user_id"])
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    update_user_password(user["id"], payload.new_password)
    return {"message": "Password changed successfully"}


# --- Device CRUD Routes ---

@app.get("/devices")
def list_devices():
    devices = get_all_devices()
    # mask passwords in response
    for d in devices:
        d["password"] = "••••••"
    return {"devices": devices, "count": len(devices)}


@app.get("/devices/{device_id}")
def get_device(device_id: int):
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    device["password"] = "••••••"
    return device


@app.post("/devices", status_code=201)
def add_device(payload: DeviceCreate):
    device_id = create_device(
        name=payload.name,
        ip=payload.ip,
        port=payload.port,
        username=payload.username,
        password=payload.password,
        brand=payload.brand,
    )
    return {"id": device_id, "message": f"Device '{payload.name}' added successfully"}


@app.put("/devices/{device_id}")
def edit_device(device_id: int, payload: DeviceUpdate):
    existing = get_device_by_id(device_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Device not found")

    updated = update_device(device_id, **payload.model_dump(exclude_none=True))
    if not updated:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    return {"message": f"Device {device_id} updated"}


@app.delete("/devices/{device_id}")
def remove_device(device_id: int):
    existing = get_device_by_id(device_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Device not found")

    delete_device(device_id)
    return {"message": f"Device {device_id} deleted"}


# --- Polling Routes ---

@app.get("/poll")
def poll_all():
    """Poll all devices and update their status."""
    devices = get_all_devices()
    results = []

    for device in devices:
        metrics = poll_device(device)
        update_device_status(
            device_id=device["id"],
            status=metrics.get("status", "unknown"),
            uptime=metrics.get("uptime"),
            cpu=metrics.get("cpu_percent"),
            ram=metrics.get("ram_percent"),
            extra_info=metrics.get("extra"),
        )
        results.append({
            "device_id": device["id"],
            "name": device["name"],
            "status": metrics.get("status"),
            "error": metrics.get("error"),
        })

    return {"results": results, "polled": len(results)}


@app.get("/poll/{device_id}")
def poll_single(device_id: int):
    """Poll a single device."""
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    metrics = poll_device(device)
    update_device_status(
        device_id=device["id"],
        status=metrics.get("status", "unknown"),
        uptime=metrics.get("uptime"),
        cpu=metrics.get("cpu_percent"),
        ram=metrics.get("ram_percent"),
        extra_info=metrics.get("extra"),
    )

    return {
        "device_id": device_id,
        "name": device["name"],
        **metrics,
    }


# --- Restart Route ---

@app.post("/restart/{device_id}")
def restart(device_id: int):
    """Send restart command to a device."""
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    result = restart_device(device)

    log_command(
        device_id=device_id,
        command="restart",
        output=result.get("output", ""),
        success=result.get("success", False),
    )

    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Restart failed"))

    # mark device as restarting
    update_device_status(device_id, status="restarting")

    return {"message": f"Restart command sent to '{device['name']}'", "output": result["output"]}


# --- Metrics History ---

@app.get("/metrics/{device_id}")
def device_metrics(device_id: int, limit: int = 50):
    """Get recent metrics history for a device."""
    device = get_device_by_id(device_id)
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    history = get_recent_metrics(device_id, limit=limit)
    return {"device_id": device_id, "metrics": history}


# --- Health Check ---

@app.get("/health")
def health():
    return {"status": "ok", "service": "noc-backend"}
