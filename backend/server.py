from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Response, Request, Form, Query
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import secrets
import hashlib
import mimetypes
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
import bcrypt
import jwt
import httpx
import base64
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
(UPLOADS_DIR / "payments").mkdir(exist_ok=True)
(UPLOADS_DIR / "portfolio").mkdir(exist_ok=True)
(UPLOADS_DIR / "qr_codes").mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'rina-visuals-secret-key-2024-secure')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Rate limiting storage (in-memory for simplicity)
login_attempts: Dict[str, List[datetime]] = {}
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================

class UserRole(str, Enum):
    USER = "user"
    WORKER = "worker"
    ADMIN = "admin"
    SUPER_ADMIN = "super_admin"

class BookingStatus(str, Enum):
    PENDING = "pending"
    PARTIALLY_PAID = "partially_paid"
    PAYMENT_REVIEW = "payment_review"
    CONFIRMED_BOOKED = "confirmed_booked"
    REJECTED = "rejected"
    CANCELLED = "cancelled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

class PaymentStatus(str, Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"

class PaymentMethodType(str, Enum):
    QR = "qr"
    ACCOUNT_NUMBER = "account_number"
    BANK_DETAILS = "bank_details"
    OTHER = "other"

class NotificationType(str, Enum):
    NEW_BOOKING = "new_booking"
    PAYMENT_UPLOADED = "payment_uploaded"
    PAYMENT_APPROVED = "payment_approved"
    PAYMENT_REJECTED = "payment_rejected"
    BOOKING_CONFIRMED = "booking_confirmed"
    BOOKING_CANCELLED = "booking_cancelled"
    USER_CREATED = "user_created"
    ROLE_CHANGED = "role_changed"

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserCreateAdmin(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    role: str = "user"
    is_active: bool = True
    created_at: datetime

class ServicePackage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    package_id: str = Field(default_factory=lambda: f"pkg_{uuid.uuid4().hex[:12]}")
    name: str
    category: str  # photography, photobooth
    description: str
    price: float
    downpayment_amount: float = 0
    duration: Optional[str] = None
    inclusions: List[str]
    add_ons: Optional[List[Dict[str, Any]]] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class ServicePackageCreate(BaseModel):
    name: str
    category: str
    description: str
    price: float
    downpayment_amount: float = 0
    duration: Optional[str] = None
    inclusions: List[str]
    add_ons: Optional[List[Dict[str, Any]]] = None
    is_active: bool = True
    sort_order: int = 0

class Album(BaseModel):
    model_config = ConfigDict(extra="ignore")
    album_id: str = Field(default_factory=lambda: f"album_{uuid.uuid4().hex[:12]}")
    title: str
    description: Optional[str] = None
    cover_image: Optional[str] = None
    tags: List[str] = []
    is_visible: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AlbumPhoto(BaseModel):
    model_config = ConfigDict(extra="ignore")
    photo_id: str = Field(default_factory=lambda: f"photo_{uuid.uuid4().hex[:12]}")
    album_id: str
    image_url: str
    thumbnail_url: Optional[str] = None
    caption: Optional[str] = None
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PortfolioItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str = Field(default_factory=lambda: f"port_{uuid.uuid4().hex[:12]}")
    title: str
    category: str
    image_url: str
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None
    is_featured: bool = False
    is_visible: bool = True
    album_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PortfolioItemCreate(BaseModel):
    title: str
    category: str
    image_url: str
    description: Optional[str] = None
    is_featured: bool = False
    is_visible: bool = True
    album_id: Optional[str] = None

class PaymentMethod(BaseModel):
    model_config = ConfigDict(extra="ignore")
    method_id: str = Field(default_factory=lambda: f"pm_{uuid.uuid4().hex[:12]}")
    name: str
    method_type: str  # qr, account_number, bank_details, other
    qr_image_path: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    bank_name: Optional[str] = None
    instructions_text: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class PaymentMethodCreate(BaseModel):
    name: str
    method_type: str
    qr_image_path: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    bank_name: Optional[str] = None
    instructions_text: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    payment_id: str = Field(default_factory=lambda: f"pay_{uuid.uuid4().hex[:12]}")
    booking_id: str
    payment_method_id: str
    amount: float
    transaction_ref: Optional[str] = None
    proof_path: Optional[str] = None
    status: str = "pending"  # pending, under_review, approved, rejected
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class BookingRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    booking_id: str = Field(default_factory=lambda: f"book_{uuid.uuid4().hex[:12]}")
    client_name: str
    client_email: str
    client_phone: str
    event_date: str
    event_time: str
    event_type: str
    venue: str
    package_id: str
    special_requests: Optional[str] = None
    status: str = "pending"
    operational_status: Optional[str] = None  # in_progress, completed
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class BookingCreate(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str
    event_date: str
    event_time: str
    event_type: str
    venue: str
    package_id: str
    special_requests: Optional[str] = None

class PaymentSubmission(BaseModel):
    payment_method_id: str
    amount: float
    transaction_ref: Optional[str] = None

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str = Field(default_factory=lambda: f"notif_{uuid.uuid4().hex[:12]}")
    user_id: Optional[str] = None  # None means for all admins
    target_roles: List[str] = ["super_admin"]  # Which roles should see this
    notification_type: str
    title: str
    message: str
    link: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CMSSection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    section_id: str
    section_name: str
    content: Dict[str, Any]
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_by: Optional[str] = None

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    log_id: str = Field(default_factory=lambda: f"log_{uuid.uuid4().hex[:12]}")
    user_id: str
    action: str
    target_type: str
    target_id: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    name: str
    email: str
    phone: Optional[str] = None
    subject: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactMessageCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    subject: str
    message: str

class Testimonial(BaseModel):
    model_config = ConfigDict(extra="ignore")
    testimonial_id: str = Field(default_factory=lambda: f"test_{uuid.uuid4().hex[:12]}")
    client_name: str
    event_type: str
    content: str
    rating: int = 5
    is_featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== SECURITY HELPERS ====================

def sanitize_input(value: str) -> str:
    """Sanitize user input to prevent XSS"""
    if not value:
        return value
    # Remove potential script tags and dangerous patterns
    value = re.sub(r'<script[^>]*>.*?</script>', '', value, flags=re.IGNORECASE | re.DOTALL)
    value = re.sub(r'javascript:', '', value, flags=re.IGNORECASE)
    value = re.sub(r'on\w+\s*=', '', value, flags=re.IGNORECASE)
    return value.strip()

def validate_file_upload(file: UploadFile, allowed_types: List[str], max_size_mb: int = 10) -> bool:
    """Validate uploaded file type and size"""
    # Check content type
    content_type = file.content_type or ""
    if content_type not in allowed_types:
        return False
    
    # Check extension
    ext = Path(file.filename or "").suffix.lower()
    allowed_extensions = {
        "image/jpeg": [".jpg", ".jpeg"],
        "image/png": [".png"],
        "image/webp": [".webp"],
        "application/pdf": [".pdf"],
    }
    
    valid_extensions = []
    for ct in allowed_types:
        valid_extensions.extend(allowed_extensions.get(ct, []))
    
    if ext not in valid_extensions:
        return False
    
    return True

def generate_secure_filename(original_filename: str) -> str:
    """Generate a secure random filename while preserving extension"""
    ext = Path(original_filename).suffix.lower()
    random_name = secrets.token_hex(16)
    return f"{random_name}{ext}"

async def check_rate_limit(identifier: str) -> bool:
    """Check if login attempts exceed rate limit"""
    now = datetime.now(timezone.utc)
    
    if identifier not in login_attempts:
        login_attempts[identifier] = []
    
    # Clean up old attempts
    cutoff = now - timedelta(minutes=LOCKOUT_DURATION_MINUTES)
    login_attempts[identifier] = [t for t in login_attempts[identifier] if t > cutoff]
    
    if len(login_attempts[identifier]) >= MAX_LOGIN_ATTEMPTS:
        return False
    
    return True

async def record_login_attempt(identifier: str):
    """Record a failed login attempt"""
    now = datetime.now(timezone.utc)
    if identifier not in login_attempts:
        login_attempts[identifier] = []
    login_attempts[identifier].append(now)

def get_client_ip(request: Request) -> str:
    """Get client IP address"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except:
        return False

def create_jwt_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> User:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Then check Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # First try to verify as JWT token
    try:
        payload = jwt.decode(session_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_doc = await db.users.find_one({"user_id": payload["user_id"]}, {"_id": 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        if not user_doc.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account deactivated")
        if isinstance(user_doc.get('created_at'), str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        pass  # Not a JWT, try session token
    
    # Try as session token (Google OAuth)
    session_doc = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account deactivated")
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    return User(**user_doc)

# ==================== ROLE-BASED ACCESS CONTROL ====================

async def require_worker_or_above(user: User = Depends(get_current_user)) -> User:
    """Require at least WORKER role"""
    allowed_roles = [UserRole.WORKER.value, UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]
    if user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return user

async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Require at least ADMIN role"""
    allowed_roles = [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]
    if user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

async def require_super_admin(user: User = Depends(get_current_user)) -> User:
    """Require SUPER_ADMIN role"""
    if user.role != UserRole.SUPER_ADMIN.value:
        raise HTTPException(status_code=403, detail="Super Admin access required")
    return user

# ==================== AUDIT LOGGING ====================

async def create_audit_log(
    user_id: str,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    """Create an audit log entry"""
    log = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        ip_address=ip_address
    )
    doc = log.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.audit_logs.insert_one(doc)

# ==================== NOTIFICATION HELPERS ====================

async def create_notification(
    notification_type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    target_roles: List[str] = None,
    user_id: Optional[str] = None
):
    """Create a notification"""
    if target_roles is None:
        target_roles = ["super_admin", "admin"]
    
    notif = Notification(
        notification_type=notification_type,
        title=title,
        message=message,
        link=link,
        metadata=metadata,
        target_roles=target_roles,
        user_id=user_id
    )
    doc = notif.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.notifications.insert_one(doc)
    return notif.notification_id

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate, request: Request):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": sanitize_input(user_data.email),
        "name": sanitize_input(user_data.name),
        "password_hash": hash_password(user_data.password),
        "role": "user",
        "is_active": True,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.email, "user")
    return {"token": token, "user": {"user_id": user_id, "email": user_data.email, "name": user_data.name, "role": "user"}}

@api_router.post("/auth/login")
async def login(credentials: UserLogin, request: Request, response: Response):
    client_ip = get_client_ip(request)
    rate_key = f"{credentials.email}:{client_ip}"
    
    # Check rate limit
    if not await check_rate_limit(rate_key):
        await create_audit_log(
            user_id="unknown",
            action="login_rate_limited",
            target_type="auth",
            details={"email": credentials.email},
            ip_address=client_ip
        )
        raise HTTPException(status_code=429, detail="Too many login attempts. Please try again later.")
    
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        await record_login_attempt(rate_key)
        await create_audit_log(
            user_id="unknown",
            action="login_failed",
            target_type="auth",
            details={"email": credentials.email, "reason": "user_not_found"},
            ip_address=client_ip
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc.get("is_active", True):
        raise HTTPException(status_code=401, detail="Account deactivated")
    
    if not verify_password(credentials.password, user_doc.get("password_hash", "")):
        await record_login_attempt(rate_key)
        await create_audit_log(
            user_id=user_doc.get("user_id", "unknown"),
            action="login_failed",
            target_type="auth",
            details={"email": credentials.email, "reason": "invalid_password"},
            ip_address=client_ip
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Clear rate limit on successful login
    if rate_key in login_attempts:
        del login_attempts[rate_key]
    
    token = create_jwt_token(user_doc["user_id"], user_doc["email"], user_doc.get("role", "user"))
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=JWT_EXPIRATION_HOURS * 3600
    )
    
    # Regenerate session - audit log for successful login
    await create_audit_log(
        user_id=user_doc["user_id"],
        action="login_success",
        target_type="auth",
        ip_address=client_ip
    )
    
    return {
        "token": token,
        "user": {
            "user_id": user_doc["user_id"],
            "email": user_doc["email"],
            "name": user_doc["name"],
            "role": user_doc.get("role", "user"),
            "picture": user_doc.get("picture")
        }
    }

@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    """Process Google OAuth session_id and return user data"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get session data
    async with httpx.AsyncClient() as http_client:
        try:
            auth_response = await http_client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = auth_response.json()
        except Exception as e:
            logger.error(f"Auth error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
    
    email = session_data.get("email")
    name = session_data.get("name")
    picture = session_data.get("picture")
    session_token = session_data.get("session_token")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": email}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        if not existing_user.get("is_active", True):
            raise HTTPException(status_code=401, detail="Account deactivated")
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
        role = existing_user.get("role", "user")
    else:
        # Create new user
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        role = "user"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user_doc)
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 3600
    )
    
    return {
        "user": {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": role
        }
    }

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture,
        "role": user.role,
        "is_active": user.is_active
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ==================== PUBLIC ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Rina Visuals API"}

@api_router.get("/packages")
async def get_packages():
    packages = await db.packages.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    for pkg in packages:
        if isinstance(pkg.get('created_at'), str):
            pkg['created_at'] = datetime.fromisoformat(pkg['created_at'])
    return packages

@api_router.get("/packages/{package_id}")
async def get_package(package_id: str):
    pkg = await db.packages.find_one({"package_id": package_id}, {"_id": 0})
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    if isinstance(pkg.get('created_at'), str):
        pkg['created_at'] = datetime.fromisoformat(pkg['created_at'])
    return pkg

@api_router.get("/portfolio")
async def get_portfolio(category: Optional[str] = None, featured: Optional[bool] = None, album_id: Optional[str] = None):
    query = {"is_visible": True}
    if category:
        query["category"] = category
    if featured is not None:
        query["is_featured"] = featured
    if album_id:
        query["album_id"] = album_id
    
    items = await db.portfolio.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.get("/albums")
async def get_albums():
    albums = await db.albums.find({"is_visible": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    for album in albums:
        if isinstance(album.get('created_at'), str):
            album['created_at'] = datetime.fromisoformat(album['created_at'])
    return albums

@api_router.get("/albums/{album_id}")
async def get_album(album_id: str):
    album = await db.albums.find_one({"album_id": album_id, "is_visible": True}, {"_id": 0})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    # Get photos
    photos = await db.album_photos.find({"album_id": album_id}, {"_id": 0}).sort("sort_order", 1).to_list(500)
    album["photos"] = photos
    
    return album

@api_router.get("/testimonials")
async def get_testimonials(featured: Optional[bool] = None):
    query = {}
    if featured is not None:
        query["is_featured"] = featured
    
    items = await db.testimonials.find(query, {"_id": 0}).to_list(50)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.get("/booked-dates")
async def get_booked_dates():
    """Get booking dates with their status for calendar display"""
    bookings = await db.bookings.find(
        {"status": {"$in": [BookingStatus.CONFIRMED_BOOKED.value, BookingStatus.PENDING.value, BookingStatus.PARTIALLY_PAID.value, BookingStatus.PAYMENT_REVIEW.value]}},
        {"_id": 0, "event_date": 1, "status": 1}
    ).to_list(500)
    
    result = {
        "booked": [],  # Confirmed dates (blocked)
        "pending": []  # Pending dates (show as pending)
    }
    
    for b in bookings:
        if b["status"] == BookingStatus.CONFIRMED_BOOKED.value:
            result["booked"].append(b["event_date"])
        else:
            result["pending"].append(b["event_date"])
    
    return result

@api_router.get("/payment-methods")
async def get_payment_methods():
    """Get active payment methods for clients"""
    methods = await db.payment_methods.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    return methods

@api_router.get("/cms/{section_id}")
async def get_cms_section(section_id: str):
    """Get CMS section content"""
    section = await db.cms_sections.find_one({"section_id": section_id}, {"_id": 0})
    if not section:
        return {"section_id": section_id, "content": {}}
    return section

# ==================== BOOKING ROUTES ====================

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate, request: Request):
    # Sanitize inputs
    booking_data.client_name = sanitize_input(booking_data.client_name)
    booking_data.venue = sanitize_input(booking_data.venue)
    if booking_data.special_requests:
        booking_data.special_requests = sanitize_input(booking_data.special_requests)
    
    # Check if date is available (only block confirmed bookings)
    existing = await db.bookings.find_one({
        "event_date": booking_data.event_date,
        "status": BookingStatus.CONFIRMED_BOOKED.value
    })
    if existing:
        raise HTTPException(status_code=400, detail="This date is already booked")
    
    booking = BookingRequest(**booking_data.model_dump())
    booking.status = BookingStatus.PENDING.value
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.bookings.insert_one(doc)
    
    # Create notification for admins
    await create_notification(
        notification_type=NotificationType.NEW_BOOKING.value,
        title="New Booking Request",
        message=f"New booking from {booking.client_name} for {booking.event_date}",
        link=f"/admin?tab=bookings&id={booking.booking_id}",
        metadata={
            "booking_id": booking.booking_id,
            "client_name": booking.client_name,
            "event_date": booking.event_date,
            "package_id": booking.package_id
        },
        target_roles=["super_admin", "admin"]
    )
    
    return {"booking_id": booking.booking_id, "message": "Booking request submitted successfully"}

@api_router.post("/bookings/{booking_id}/payment")
async def submit_booking_payment(
    booking_id: str,
    payment_method_id: str = Form(...),
    amount: float = Form(...),
    transaction_ref: Optional[str] = Form(None),
    file: UploadFile = File(...)
):
    """Submit payment proof for a booking"""
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Validate payment method exists
    payment_method = await db.payment_methods.find_one({"method_id": payment_method_id, "is_active": True}, {"_id": 0})
    if not payment_method:
        raise HTTPException(status_code=400, detail="Invalid payment method")
    
    # Validate file
    allowed_types = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if not validate_file_upload(file, allowed_types, max_size_mb=10):
        raise HTTPException(status_code=400, detail="Invalid file type. Allowed: jpg, png, webp, pdf")
    
    # Save file securely
    secure_filename = generate_secure_filename(file.filename or "proof.jpg")
    file_path = UPLOADS_DIR / "payments" / secure_filename
    
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(status_code=400, detail="File too large. Maximum 10MB.")
    
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create payment record
    payment = Payment(
        booking_id=booking_id,
        payment_method_id=payment_method_id,
        amount=amount,
        transaction_ref=sanitize_input(transaction_ref) if transaction_ref else None,
        proof_path=str(file_path),
        status=PaymentStatus.UNDER_REVIEW.value
    )
    doc = payment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.payments.insert_one(doc)
    
    # Update booking status
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {
            "status": BookingStatus.PAYMENT_REVIEW.value,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Create notification for super admin
    await create_notification(
        notification_type=NotificationType.PAYMENT_UPLOADED.value,
        title="Payment Proof Uploaded",
        message=f"Payment proof submitted for booking {booking_id} - Amount: ₱{amount:,.2f}",
        link=f"/admin?tab=bookings&id={booking_id}",
        metadata={
            "booking_id": booking_id,
            "payment_id": payment.payment_id,
            "amount": amount,
            "client_name": booking.get("client_name")
        },
        target_roles=["super_admin"]
    )
    
    return {"payment_id": payment.payment_id, "message": "Payment proof submitted for review"}

@api_router.get("/bookings/{booking_id}/status")
async def get_booking_status(booking_id: str):
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get payment info
    payments = await db.payments.find({"booking_id": booking_id}, {"_id": 0, "proof_path": 0}).to_list(10)
    
    return {
        "booking_id": booking_id,
        "status": booking["status"],
        "event_date": booking["event_date"],
        "payments": payments
    }

# ==================== CONTACT ROUTES ====================

@api_router.post("/contact")
async def submit_contact(message_data: ContactMessageCreate):
    # Sanitize inputs
    message_data.name = sanitize_input(message_data.name)
    message_data.message = sanitize_input(message_data.message)
    message_data.subject = sanitize_input(message_data.subject)
    
    message = ContactMessage(**message_data.model_dump())
    doc = message.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.contact_messages.insert_one(doc)
    return {"message": "Message sent successfully"}

# ==================== WORKER ROUTES ====================

@api_router.get("/worker/schedule")
async def worker_get_schedule(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(require_worker_or_above)
):
    """Get booking schedule for workers"""
    query = {"status": {"$in": [BookingStatus.CONFIRMED_BOOKED.value, BookingStatus.IN_PROGRESS.value]}}
    
    if start_date:
        query["event_date"] = {"$gte": start_date}
    if end_date:
        if "event_date" in query:
            query["event_date"]["$lte"] = end_date
        else:
            query["event_date"] = {"$lte": end_date}
    
    bookings = await db.bookings.find(
        query,
        {"_id": 0, "admin_notes": 0}  # Hide admin notes from workers
    ).sort("event_date", 1).to_list(100)
    
    # Enrich with package info
    for booking in bookings:
        pkg = await db.packages.find_one({"package_id": booking.get("package_id")}, {"_id": 0, "name": 1, "category": 1})
        booking["package"] = pkg
        if isinstance(booking.get('created_at'), str):
            booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    
    return bookings

@api_router.put("/worker/bookings/{booking_id}/status")
async def worker_update_operational_status(
    booking_id: str,
    operational_status: str,
    request: Request,
    user: User = Depends(require_worker_or_above)
):
    """Update operational status (in_progress, completed)"""
    if operational_status not in ["in_progress", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid operational status")
    
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking["status"] != BookingStatus.CONFIRMED_BOOKED.value:
        raise HTTPException(status_code=400, detail="Can only update confirmed bookings")
    
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {
            "operational_status": operational_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    await create_audit_log(
        user_id=user.user_id,
        action="booking_operational_update",
        target_type="booking",
        target_id=booking_id,
        details={"operational_status": operational_status},
        ip_address=get_client_ip(request)
    )
    
    return {"message": "Operational status updated"}

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/bookings")
async def admin_get_bookings(
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user: User = Depends(require_admin)
):
    query = {}
    if status:
        query["status"] = status
    if start_date:
        query["event_date"] = {"$gte": start_date}
    if end_date:
        if "event_date" in query:
            query["event_date"]["$lte"] = end_date
        else:
            query["event_date"] = {"$lte": end_date}
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Enrich with payment info
    for booking in bookings:
        payments = await db.payments.find({"booking_id": booking["booking_id"]}, {"_id": 0}).to_list(10)
        booking["payments"] = payments
        
        pkg = await db.packages.find_one({"package_id": booking.get("package_id")}, {"_id": 0, "name": 1, "price": 1, "downpayment_amount": 1})
        booking["package"] = pkg
        
        if isinstance(booking.get('created_at'), str):
            booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    
    return bookings

@api_router.get("/admin/bookings/{booking_id}")
async def admin_get_booking_detail(booking_id: str, user: User = Depends(require_admin)):
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Get payments
    payments = await db.payments.find({"booking_id": booking_id}, {"_id": 0}).to_list(10)
    booking["payments"] = payments
    
    # Get package
    pkg = await db.packages.find_one({"package_id": booking.get("package_id")}, {"_id": 0})
    booking["package"] = pkg
    
    return booking

@api_router.put("/admin/bookings/{booking_id}/status")
async def admin_update_booking_status(
    booking_id: str,
    status: str,
    admin_notes: Optional[str] = None,
    rejection_reason: Optional[str] = None,
    request: Request = None,
    user: User = Depends(require_admin)
):
    """Update booking status"""
    valid_statuses = [s.value for s in BookingStatus]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    update = {
        "status": status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if admin_notes:
        update["admin_notes"] = sanitize_input(admin_notes)
    if rejection_reason:
        update["rejection_reason"] = sanitize_input(rejection_reason)
    
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": update}
    )
    
    # Create notifications based on status change
    if status == BookingStatus.CONFIRMED_BOOKED.value:
        await create_notification(
            notification_type=NotificationType.BOOKING_CONFIRMED.value,
            title="Booking Confirmed",
            message=f"Booking {booking_id} has been confirmed for {booking['event_date']}",
            metadata={"booking_id": booking_id, "client_email": booking.get("client_email")},
            target_roles=["super_admin", "admin", "worker"]
        )
    elif status == BookingStatus.REJECTED.value:
        await create_notification(
            notification_type=NotificationType.PAYMENT_REJECTED.value,
            title="Booking Rejected",
            message=f"Booking {booking_id} has been rejected. Reason: {rejection_reason or 'Not specified'}",
            metadata={"booking_id": booking_id},
            target_roles=["super_admin", "admin"]
        )
    elif status == BookingStatus.CANCELLED.value:
        await create_notification(
            notification_type=NotificationType.BOOKING_CANCELLED.value,
            title="Booking Cancelled",
            message=f"Booking {booking_id} has been cancelled",
            metadata={"booking_id": booking_id},
            target_roles=["super_admin", "admin"]
        )
    
    await create_audit_log(
        user_id=user.user_id,
        action="booking_status_update",
        target_type="booking",
        target_id=booking_id,
        details={"new_status": status, "rejection_reason": rejection_reason},
        ip_address=get_client_ip(request) if request else None
    )
    
    return {"message": "Booking status updated"}

@api_router.put("/admin/payments/{payment_id}/review")
async def admin_review_payment(
    payment_id: str,
    status: str,
    rejection_reason: Optional[str] = None,
    request: Request = None,
    user: User = Depends(require_admin)
):
    """Review and approve/reject payment"""
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")
    
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    update = {
        "status": status,
        "reviewed_by": user.user_id,
        "reviewed_at": datetime.now(timezone.utc).isoformat()
    }
    if rejection_reason:
        update["rejection_reason"] = sanitize_input(rejection_reason)
    
    await db.payments.update_one(
        {"payment_id": payment_id},
        {"$set": update}
    )
    
    # Update booking status based on payment review
    booking = await db.bookings.find_one({"booking_id": payment["booking_id"]}, {"_id": 0})
    if status == "approved":
        await db.bookings.update_one(
            {"booking_id": payment["booking_id"]},
            {"$set": {
                "status": BookingStatus.CONFIRMED_BOOKED.value,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await create_notification(
            notification_type=NotificationType.PAYMENT_APPROVED.value,
            title="Payment Approved",
            message=f"Payment for booking {payment['booking_id']} approved. Booking confirmed!",
            metadata={"booking_id": payment["booking_id"], "payment_id": payment_id},
            target_roles=["super_admin", "admin"]
        )
    else:
        await db.bookings.update_one(
            {"booking_id": payment["booking_id"]},
            {"$set": {
                "status": BookingStatus.REJECTED.value,
                "rejection_reason": rejection_reason,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await create_notification(
            notification_type=NotificationType.PAYMENT_REJECTED.value,
            title="Payment Rejected",
            message=f"Payment for booking {payment['booking_id']} rejected. Reason: {rejection_reason}",
            metadata={"booking_id": payment["booking_id"], "payment_id": payment_id},
            target_roles=["super_admin", "admin"]
        )
    
    await create_audit_log(
        user_id=user.user_id,
        action="payment_review",
        target_type="payment",
        target_id=payment_id,
        details={"status": status, "rejection_reason": rejection_reason, "booking_id": payment["booking_id"]},
        ip_address=get_client_ip(request) if request else None
    )
    
    return {"message": f"Payment {status}"}

@api_router.get("/admin/payments/{payment_id}/proof")
async def admin_get_payment_proof(payment_id: str, user: User = Depends(require_admin)):
    """Get payment proof file (protected)"""
    payment = await db.payments.find_one({"payment_id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    proof_path = payment.get("proof_path")
    if not proof_path or not Path(proof_path).exists():
        raise HTTPException(status_code=404, detail="Proof file not found")
    
    # Read file and return as base64
    with open(proof_path, "rb") as f:
        content = f.read()
    
    # Determine content type
    ext = Path(proof_path).suffix.lower()
    content_types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".pdf": "application/pdf"}
    content_type = content_types.get(ext, "application/octet-stream")
    
    return {
        "content_type": content_type,
        "data": base64.b64encode(content).decode()
    }

@api_router.get("/admin/messages")
async def admin_get_messages(user: User = Depends(require_admin)):
    messages = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for msg in messages:
        if isinstance(msg.get('created_at'), str):
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    return messages

@api_router.put("/admin/messages/{message_id}/read")
async def admin_mark_message_read(message_id: str, user: User = Depends(require_admin)):
    result = await db.contact_messages.update_one(
        {"message_id": message_id},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Marked as read"}

# ==================== ADMIN PORTFOLIO ROUTES ====================

@api_router.get("/admin/portfolio")
async def admin_get_portfolio(user: User = Depends(require_admin)):
    items = await db.portfolio.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.post("/admin/portfolio")
async def admin_create_portfolio(item_data: PortfolioItemCreate, request: Request, user: User = Depends(require_admin)):
    item = PortfolioItem(**item_data.model_dump())
    doc = item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.portfolio.insert_one(doc)
    
    await create_audit_log(
        user_id=user.user_id,
        action="portfolio_create",
        target_type="portfolio",
        target_id=item.item_id,
        ip_address=get_client_ip(request)
    )
    
    return {"item_id": item.item_id, "message": "Portfolio item created"}

@api_router.put("/admin/portfolio/{item_id}")
async def admin_update_portfolio(item_id: str, item_data: PortfolioItemCreate, request: Request, user: User = Depends(require_admin)):
    result = await db.portfolio.update_one(
        {"item_id": item_id},
        {"$set": item_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await create_audit_log(
        user_id=user.user_id,
        action="portfolio_update",
        target_type="portfolio",
        target_id=item_id,
        ip_address=get_client_ip(request)
    )
    
    return {"message": "Portfolio item updated"}

@api_router.delete("/admin/portfolio/{item_id}")
async def admin_delete_portfolio(item_id: str, request: Request, user: User = Depends(require_admin)):
    result = await db.portfolio.delete_one({"item_id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await create_audit_log(
        user_id=user.user_id,
        action="portfolio_delete",
        target_type="portfolio",
        target_id=item_id,
        ip_address=get_client_ip(request)
    )
    
    return {"message": "Portfolio item deleted"}

# ==================== ADMIN ALBUMS ROUTES ====================

@api_router.get("/admin/albums")
async def admin_get_albums(user: User = Depends(require_admin)):
    albums = await db.albums.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    for album in albums:
        # Count photos
        photo_count = await db.album_photos.count_documents({"album_id": album["album_id"]})
        album["photo_count"] = photo_count
        if isinstance(album.get('created_at'), str):
            album['created_at'] = datetime.fromisoformat(album['created_at'])
    return albums

@api_router.post("/admin/albums")
async def admin_create_album(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    tags: str = Form(""),
    is_visible: bool = Form(True),
    request: Request = None,
    user: User = Depends(require_admin)
):
    album = Album(
        title=sanitize_input(title),
        description=sanitize_input(description) if description else None,
        tags=[t.strip() for t in tags.split(",") if t.strip()],
        is_visible=is_visible
    )
    doc = album.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.albums.insert_one(doc)
    
    await create_audit_log(
        user_id=user.user_id,
        action="album_create",
        target_type="album",
        target_id=album.album_id,
        ip_address=get_client_ip(request) if request else None
    )
    
    return {"album_id": album.album_id, "message": "Album created"}

@api_router.put("/admin/albums/{album_id}")
async def admin_update_album(
    album_id: str,
    title: str = Form(...),
    description: Optional[str] = Form(None),
    tags: str = Form(""),
    is_visible: bool = Form(True),
    sort_order: int = Form(0),
    request: Request = None,
    user: User = Depends(require_admin)
):
    result = await db.albums.update_one(
        {"album_id": album_id},
        {"$set": {
            "title": sanitize_input(title),
            "description": sanitize_input(description) if description else None,
            "tags": [t.strip() for t in tags.split(",") if t.strip()],
            "is_visible": is_visible,
            "sort_order": sort_order
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    
    return {"message": "Album updated"}

@api_router.delete("/admin/albums/{album_id}")
async def admin_delete_album(album_id: str, request: Request, user: User = Depends(require_admin)):
    # Delete all photos in album
    await db.album_photos.delete_many({"album_id": album_id})
    
    result = await db.albums.delete_one({"album_id": album_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Album not found")
    
    return {"message": "Album and photos deleted"}

@api_router.post("/admin/albums/{album_id}/photos")
async def admin_add_album_photo(
    album_id: str,
    caption: Optional[str] = Form(None),
    file: UploadFile = File(...),
    request: Request = None,
    user: User = Depends(require_admin)
):
    """Upload photo to album"""
    album = await db.albums.find_one({"album_id": album_id}, {"_id": 0})
    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    
    # Validate file
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if not validate_file_upload(file, allowed_types, max_size_mb=10):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    # Save file
    secure_filename = generate_secure_filename(file.filename or "photo.jpg")
    file_path = UPLOADS_DIR / "portfolio" / secure_filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create photo record
    photo = AlbumPhoto(
        album_id=album_id,
        image_url=f"/uploads/portfolio/{secure_filename}",
        caption=sanitize_input(caption) if caption else None
    )
    doc = photo.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.album_photos.insert_one(doc)
    
    # Update album cover if first photo
    if not album.get("cover_image"):
        await db.albums.update_one(
            {"album_id": album_id},
            {"$set": {"cover_image": photo.image_url}}
        )
    
    return {"photo_id": photo.photo_id, "message": "Photo uploaded"}

@api_router.delete("/admin/albums/{album_id}/photos/{photo_id}")
async def admin_delete_album_photo(album_id: str, photo_id: str, user: User = Depends(require_admin)):
    result = await db.album_photos.delete_one({"photo_id": photo_id, "album_id": album_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Photo not found")
    return {"message": "Photo deleted"}

# ==================== ADMIN PACKAGES ROUTES ====================

@api_router.get("/admin/packages")
async def admin_get_all_packages(user: User = Depends(require_admin)):
    packages = await db.packages.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    for pkg in packages:
        if isinstance(pkg.get('created_at'), str):
            pkg['created_at'] = datetime.fromisoformat(pkg['created_at'])
    return packages

@api_router.post("/admin/packages")
async def admin_create_package(pkg_data: ServicePackageCreate, request: Request, user: User = Depends(require_admin)):
    pkg = ServicePackage(**pkg_data.model_dump())
    doc = pkg.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.packages.insert_one(doc)
    
    await create_audit_log(
        user_id=user.user_id,
        action="package_create",
        target_type="package",
        target_id=pkg.package_id,
        ip_address=get_client_ip(request)
    )
    
    return {"package_id": pkg.package_id, "message": "Package created"}

@api_router.put("/admin/packages/{package_id}")
async def admin_update_package(package_id: str, pkg_data: ServicePackageCreate, request: Request, user: User = Depends(require_admin)):
    update_data = pkg_data.model_dump()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.packages.update_one(
        {"package_id": package_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    
    await create_audit_log(
        user_id=user.user_id,
        action="package_update",
        target_type="package",
        target_id=package_id,
        ip_address=get_client_ip(request)
    )
    
    return {"message": "Package updated"}

@api_router.delete("/admin/packages/{package_id}")
async def admin_delete_package(package_id: str, request: Request, user: User = Depends(require_admin)):
    result = await db.packages.delete_one({"package_id": package_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    
    await create_audit_log(
        user_id=user.user_id,
        action="package_delete",
        target_type="package",
        target_id=package_id,
        ip_address=get_client_ip(request)
    )
    
    return {"message": "Package deleted"}

# ==================== ADMIN PAYMENT METHODS ROUTES ====================

@api_router.get("/admin/payment-methods")
async def admin_get_payment_methods(user: User = Depends(require_admin)):
    methods = await db.payment_methods.find({}, {"_id": 0}).sort("sort_order", 1).to_list(50)
    return methods

@api_router.post("/admin/payment-methods")
async def admin_create_payment_method(
    name: str = Form(...),
    method_type: str = Form(...),
    account_name: Optional[str] = Form(None),
    account_number: Optional[str] = Form(None),
    bank_name: Optional[str] = Form(None),
    instructions_text: Optional[str] = Form(None),
    is_active: bool = Form(True),
    sort_order: int = Form(0),
    qr_image: Optional[UploadFile] = File(None),
    request: Request = None,
    user: User = Depends(require_admin)
):
    """Create payment method with optional QR image"""
    qr_path = None
    
    if qr_image and qr_image.filename:
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if not validate_file_upload(qr_image, allowed_types, max_size_mb=5):
            raise HTTPException(status_code=400, detail="Invalid QR image type")
        
        secure_filename = generate_secure_filename(qr_image.filename)
        file_path = UPLOADS_DIR / "qr_codes" / secure_filename
        
        content = await qr_image.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        qr_path = f"/uploads/qr_codes/{secure_filename}"
    
    method = PaymentMethod(
        name=sanitize_input(name),
        method_type=method_type,
        qr_image_path=qr_path,
        account_name=sanitize_input(account_name) if account_name else None,
        account_number=sanitize_input(account_number) if account_number else None,
        bank_name=sanitize_input(bank_name) if bank_name else None,
        instructions_text=sanitize_input(instructions_text) if instructions_text else None,
        is_active=is_active,
        sort_order=sort_order
    )
    doc = method.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.payment_methods.insert_one(doc)
    
    await create_audit_log(
        user_id=user.user_id,
        action="payment_method_create",
        target_type="payment_method",
        target_id=method.method_id,
        ip_address=get_client_ip(request) if request else None
    )
    
    return {"method_id": method.method_id, "message": "Payment method created"}

@api_router.put("/admin/payment-methods/{method_id}")
async def admin_update_payment_method(
    method_id: str,
    name: str = Form(...),
    method_type: str = Form(...),
    account_name: Optional[str] = Form(None),
    account_number: Optional[str] = Form(None),
    bank_name: Optional[str] = Form(None),
    instructions_text: Optional[str] = Form(None),
    is_active: bool = Form(True),
    sort_order: int = Form(0),
    qr_image: Optional[UploadFile] = File(None),
    request: Request = None,
    user: User = Depends(require_admin)
):
    """Update payment method"""
    existing = await db.payment_methods.find_one({"method_id": method_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Payment method not found")
    
    qr_path = existing.get("qr_image_path")
    
    if qr_image and qr_image.filename:
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if not validate_file_upload(qr_image, allowed_types, max_size_mb=5):
            raise HTTPException(status_code=400, detail="Invalid QR image type")
        
        secure_filename = generate_secure_filename(qr_image.filename)
        file_path = UPLOADS_DIR / "qr_codes" / secure_filename
        
        content = await qr_image.read()
        with open(file_path, "wb") as f:
            f.write(content)
        
        qr_path = f"/uploads/qr_codes/{secure_filename}"
    
    update = {
        "name": sanitize_input(name),
        "method_type": method_type,
        "qr_image_path": qr_path,
        "account_name": sanitize_input(account_name) if account_name else None,
        "account_number": sanitize_input(account_number) if account_number else None,
        "bank_name": sanitize_input(bank_name) if bank_name else None,
        "instructions_text": sanitize_input(instructions_text) if instructions_text else None,
        "is_active": is_active,
        "sort_order": sort_order,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_methods.update_one(
        {"method_id": method_id},
        {"$set": update}
    )
    
    return {"message": "Payment method updated"}

@api_router.delete("/admin/payment-methods/{method_id}")
async def admin_delete_payment_method(method_id: str, request: Request, user: User = Depends(require_admin)):
    result = await db.payment_methods.delete_one({"method_id": method_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return {"message": "Payment method deleted"}

# ==================== ADMIN CMS ROUTES ====================

@api_router.get("/admin/cms")
async def admin_get_all_cms(user: User = Depends(require_admin)):
    """Get all CMS sections"""
    sections = await db.cms_sections.find({}, {"_id": 0}).to_list(100)
    return sections

@api_router.get("/admin/cms/{section_id}")
async def admin_get_cms_section(section_id: str, user: User = Depends(require_admin)):
    section = await db.cms_sections.find_one({"section_id": section_id}, {"_id": 0})
    if not section:
        return {"section_id": section_id, "section_name": section_id, "content": {}}
    return section

@api_router.put("/admin/cms/{section_id}")
async def admin_update_cms_section(
    section_id: str,
    request: Request,
    user: User = Depends(require_admin)
):
    """Update CMS section content"""
    body = await request.json()
    content = body.get("content", {})
    section_name = body.get("section_name", section_id)
    
    await db.cms_sections.update_one(
        {"section_id": section_id},
        {"$set": {
            "section_id": section_id,
            "section_name": section_name,
            "content": content,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "updated_by": user.user_id
        }},
        upsert=True
    )
    
    await create_audit_log(
        user_id=user.user_id,
        action="cms_update",
        target_type="cms",
        target_id=section_id,
        ip_address=get_client_ip(request)
    )
    
    return {"message": "CMS section updated"}

# ==================== ADMIN NOTIFICATIONS ROUTES ====================

@api_router.get("/admin/notifications")
async def admin_get_notifications(
    unread_only: bool = False,
    user: User = Depends(require_worker_or_above)
):
    """Get notifications for the current user's role"""
    query = {"target_roles": user.role}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    for notif in notifications:
        if isinstance(notif.get('created_at'), str):
            notif['created_at'] = datetime.fromisoformat(notif['created_at'])
    
    return notifications

@api_router.get("/admin/notifications/count")
async def admin_get_notification_count(user: User = Depends(require_worker_or_above)):
    """Get unread notification count"""
    count = await db.notifications.count_documents({
        "target_roles": user.role,
        "is_read": False
    })
    return {"count": count}

@api_router.put("/admin/notifications/{notification_id}/read")
async def admin_mark_notification_read(notification_id: str, user: User = Depends(require_worker_or_above)):
    await db.notifications.update_one(
        {"notification_id": notification_id},
        {"$set": {"is_read": True}}
    )
    return {"message": "Notification marked as read"}

@api_router.put("/admin/notifications/read-all")
async def admin_mark_all_notifications_read(user: User = Depends(require_worker_or_above)):
    await db.notifications.update_many(
        {"target_roles": user.role},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

# ==================== SUPER ADMIN USER MANAGEMENT ====================

@api_router.get("/admin/users")
async def admin_get_users(user: User = Depends(require_super_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

@api_router.post("/admin/users")
async def admin_create_user(
    user_data: UserCreateAdmin,
    request: Request,
    user: User = Depends(require_super_admin)
):
    """Create new user (Super Admin only)"""
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate role
    valid_roles = [r.value for r in UserRole]
    if user_data.role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": sanitize_input(user_data.email),
        "name": sanitize_input(user_data.name),
        "password_hash": hash_password(user_data.password),
        "role": user_data.role,
        "is_active": True,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    await create_notification(
        notification_type=NotificationType.USER_CREATED.value,
        title="New User Created",
        message=f"User {user_data.name} ({user_data.email}) created with role {user_data.role}",
        target_roles=["super_admin"]
    )
    
    await create_audit_log(
        user_id=user.user_id,
        action="user_create",
        target_type="user",
        target_id=user_id,
        details={"email": user_data.email, "role": user_data.role},
        ip_address=get_client_ip(request)
    )
    
    return {"user_id": user_id, "message": "User created"}

@api_router.put("/admin/users/{target_user_id}/role")
async def admin_update_user_role(
    target_user_id: str,
    role: str,
    request: Request,
    user: User = Depends(require_super_admin)
):
    """Update user role (Super Admin only)"""
    valid_roles = [r.value for r in UserRole]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    # Prevent self-demotion
    if target_user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot change your own role")
    
    target_user = await db.users.find_one({"user_id": target_user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_role = target_user.get("role", "user")
    
    await db.users.update_one(
        {"user_id": target_user_id},
        {"$set": {"role": role}}
    )
    
    await create_notification(
        notification_type=NotificationType.ROLE_CHANGED.value,
        title="User Role Changed",
        message=f"User {target_user.get('name')} role changed from {old_role} to {role}",
        target_roles=["super_admin"]
    )
    
    await create_audit_log(
        user_id=user.user_id,
        action="user_role_change",
        target_type="user",
        target_id=target_user_id,
        details={"old_role": old_role, "new_role": role},
        ip_address=get_client_ip(request)
    )
    
    return {"message": "User role updated"}

@api_router.put("/admin/users/{target_user_id}/status")
async def admin_update_user_status(
    target_user_id: str,
    is_active: bool,
    request: Request,
    user: User = Depends(require_super_admin)
):
    """Activate/Deactivate user (Super Admin only)"""
    if target_user_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")
    
    result = await db.users.update_one(
        {"user_id": target_user_id},
        {"$set": {"is_active": is_active}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await create_audit_log(
        user_id=user.user_id,
        action="user_status_change",
        target_type="user",
        target_id=target_user_id,
        details={"is_active": is_active},
        ip_address=get_client_ip(request)
    )
    
    return {"message": f"User {'activated' if is_active else 'deactivated'}"}

@api_router.put("/admin/users/{target_user_id}/password")
async def admin_reset_user_password(
    target_user_id: str,
    new_password: str,
    request: Request,
    user: User = Depends(require_super_admin)
):
    """Reset user password (Super Admin only)"""
    result = await db.users.update_one(
        {"user_id": target_user_id},
        {"$set": {"password_hash": hash_password(new_password)}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    await create_audit_log(
        user_id=user.user_id,
        action="user_password_reset",
        target_type="user",
        target_id=target_user_id,
        ip_address=get_client_ip(request)
    )
    
    return {"message": "Password reset successful"}

# ==================== ADMIN AUDIT LOGS ====================

@api_router.get("/admin/audit-logs")
async def admin_get_audit_logs(
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = 100,
    user: User = Depends(require_super_admin)
):
    """Get audit logs (Super Admin only)"""
    query = {}
    if action:
        query["action"] = action
    if target_type:
        query["target_type"] = target_type
    if user_id:
        query["user_id"] = user_id
    
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    for log in logs:
        if isinstance(log.get('created_at'), str):
            log['created_at'] = datetime.fromisoformat(log['created_at'])
    
    return logs

# ==================== ADMIN TESTIMONIALS ====================

@api_router.get("/admin/testimonials")
async def admin_get_testimonials(user: User = Depends(require_admin)):
    items = await db.testimonials.find({}, {"_id": 0}).to_list(100)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

@api_router.post("/admin/testimonials")
async def admin_create_testimonial(
    client_name: str = Form(...),
    event_type: str = Form(...),
    content: str = Form(...),
    rating: int = Form(5),
    is_featured: bool = Form(False),
    user: User = Depends(require_admin)
):
    testimonial = Testimonial(
        client_name=sanitize_input(client_name),
        event_type=sanitize_input(event_type),
        content=sanitize_input(content),
        rating=rating,
        is_featured=is_featured
    )
    doc = testimonial.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.testimonials.insert_one(doc)
    return {"testimonial_id": testimonial.testimonial_id, "message": "Testimonial created"}

@api_router.put("/admin/testimonials/{testimonial_id}")
async def admin_update_testimonial(
    testimonial_id: str,
    client_name: str = Form(...),
    event_type: str = Form(...),
    content: str = Form(...),
    rating: int = Form(5),
    is_featured: bool = Form(False),
    user: User = Depends(require_admin)
):
    result = await db.testimonials.update_one(
        {"testimonial_id": testimonial_id},
        {"$set": {
            "client_name": sanitize_input(client_name),
            "event_type": sanitize_input(event_type),
            "content": sanitize_input(content),
            "rating": rating,
            "is_featured": is_featured
        }}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"message": "Testimonial updated"}

@api_router.delete("/admin/testimonials/{testimonial_id}")
async def admin_delete_testimonial(testimonial_id: str, user: User = Depends(require_admin)):
    result = await db.testimonials.delete_one({"testimonial_id": testimonial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"message": "Testimonial deleted"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    """Seed initial data"""
    
    # Check if already seeded
    existing_packages = await db.packages.count_documents({})
    if existing_packages > 0:
        return {"message": "Data already seeded"}
    
    # Photography packages
    photography_packages = [
        {
            "package_id": f"pkg_{uuid.uuid4().hex[:12]}",
            "name": "Essential Coverage",
            "category": "photography",
            "description": "Perfect for intimate ceremonies and small celebrations",
            "price": 15000,
            "downpayment_amount": 7500,
            "duration": "4 hours",
            "inclusions": [
                "4 hours of coverage",
                "1 professional photographer",
                "100+ edited photos",
                "Online gallery",
                "Digital downloads"
            ],
            "is_active": True,
            "sort_order": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "package_id": f"pkg_{uuid.uuid4().hex[:12]}",
            "name": "Premium Coverage",
            "category": "photography",
            "description": "Comprehensive documentation for your special day",
            "price": 30000,
            "downpayment_amount": 15000,
            "duration": "8 hours",
            "inclusions": [
                "8 hours of coverage",
                "2 professional photographers",
                "300+ edited photos",
                "Engagement shoot included",
                "Online gallery",
                "USB drive delivery",
                "1 premium photo album"
            ],
            "is_active": True,
            "sort_order": 2,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "package_id": f"pkg_{uuid.uuid4().hex[:12]}",
            "name": "Luxury Collection",
            "category": "photography",
            "description": "The complete experience for your once-in-a-lifetime event",
            "price": 50000,
            "downpayment_amount": 25000,
            "duration": "Full day",
            "inclusions": [
                "Full day coverage",
                "2 professional photographers",
                "500+ edited photos",
                "Pre-wedding shoot",
                "Same-day edit highlights",
                "Online gallery",
                "USB drive delivery",
                "2 premium photo albums",
                "Framed prints"
            ],
            "is_active": True,
            "sort_order": 3,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    # Photobooth packages
    photobooth_packages = [
        {
            "package_id": f"pkg_{uuid.uuid4().hex[:12]}",
            "name": "Classic Booth",
            "category": "photobooth",
            "description": "Fun and memorable photo experience for your guests",
            "price": 8000,
            "downpayment_amount": 4000,
            "duration": "2 hours",
            "inclusions": [
                "2 hours of service",
                "Unlimited prints",
                "Custom photo template",
                "Props included",
                "Digital copies",
                "Guest book"
            ],
            "is_active": True,
            "sort_order": 4,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "package_id": f"pkg_{uuid.uuid4().hex[:12]}",
            "name": "Premium Booth",
            "category": "photobooth",
            "description": "Enhanced booth experience with premium features",
            "price": 15000,
            "downpayment_amount": 7500,
            "duration": "4 hours",
            "inclusions": [
                "4 hours of service",
                "Unlimited prints",
                "Custom backdrop",
                "Premium props collection",
                "GIF and Boomerang mode",
                "Instant social sharing",
                "Digital gallery",
                "Custom guest book"
            ],
            "is_active": True,
            "sort_order": 5,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "package_id": f"pkg_{uuid.uuid4().hex[:12]}",
            "name": "360 Experience",
            "category": "photobooth",
            "description": "The ultimate interactive photo experience",
            "price": 25000,
            "downpayment_amount": 12500,
            "duration": "4 hours",
            "inclusions": [
                "4 hours of service",
                "360-degree video booth",
                "Slow-motion capture",
                "Custom music overlay",
                "Instant sharing",
                "Premium props",
                "On-site attendant",
                "Digital gallery"
            ],
            "is_active": True,
            "sort_order": 6,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.packages.insert_many(photography_packages + photobooth_packages)
    
    # Portfolio items
    portfolio_items = [
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Sarah & John's Wedding",
            "category": "wedding",
            "image_url": "https://images.unsplash.com/photo-1519741497674-611481863552?w=800",
            "description": "A beautiful garden wedding celebration",
            "is_featured": True,
            "is_visible": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Beach Wedding Ceremony",
            "category": "wedding",
            "image_url": "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800",
            "description": "Sunset beach wedding",
            "is_featured": True,
            "is_visible": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Emma's Sweet 16",
            "category": "birthday",
            "image_url": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800",
            "description": "Elegant birthday celebration",
            "is_featured": True,
            "is_visible": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Corporate Annual Gala",
            "category": "corporate",
            "image_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
            "description": "Professional corporate event coverage",
            "is_featured": False,
            "is_visible": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Fun Photobooth Moments",
            "category": "photobooth",
            "image_url": "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800",
            "description": "Guests having fun at the photobooth",
            "is_featured": True,
            "is_visible": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Church Wedding",
            "category": "wedding",
            "image_url": "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800",
            "description": "Traditional church ceremony",
            "is_featured": False,
            "is_visible": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.portfolio.insert_many(portfolio_items)
    
    # Testimonials
    testimonials = [
        {
            "testimonial_id": f"test_{uuid.uuid4().hex[:12]}",
            "client_name": "Maria Santos",
            "event_type": "Wedding",
            "content": "Rina Visuals captured our wedding day perfectly. Every emotion, every detail was beautifully documented. We couldn't be happier with our photos!",
            "rating": 5,
            "is_featured": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "testimonial_id": f"test_{uuid.uuid4().hex[:12]}",
            "client_name": "James & Ana Cruz",
            "event_type": "Wedding",
            "content": "Professional, creative, and so easy to work with. The team made us feel comfortable throughout the entire day. Highly recommended!",
            "rating": 5,
            "is_featured": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "testimonial_id": f"test_{uuid.uuid4().hex[:12]}",
            "client_name": "Corporate Events Inc.",
            "event_type": "Corporate",
            "content": "We've used Rina Visuals for multiple corporate events. Always professional, always delivers quality work on time.",
            "rating": 5,
            "is_featured": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.testimonials.insert_many(testimonials)
    
    # Default payment methods
    payment_methods = [
        {
            "method_id": f"pm_{uuid.uuid4().hex[:12]}",
            "name": "GCash",
            "method_type": "account_number",
            "account_name": "Rina Santos",
            "account_number": "0917-123-4567",
            "instructions_text": "Please send the exact amount and include booking ID in the message",
            "is_active": True,
            "sort_order": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "method_id": f"pm_{uuid.uuid4().hex[:12]}",
            "name": "BDO Bank Transfer",
            "method_type": "bank_details",
            "account_name": "Rina Visuals Corp.",
            "account_number": "1234-5678-9012",
            "bank_name": "BDO Unibank",
            "instructions_text": "Please use your name and booking ID as reference",
            "is_active": True,
            "sort_order": 2,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "method_id": f"pm_{uuid.uuid4().hex[:12]}",
            "name": "Maya",
            "method_type": "account_number",
            "account_name": "Rina Santos",
            "account_number": "0917-123-4567",
            "instructions_text": "Send to Maya account and screenshot the confirmation",
            "is_active": True,
            "sort_order": 3,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.payment_methods.insert_many(payment_methods)
    
    # Default CMS sections
    cms_sections = [
        {
            "section_id": "home_hero",
            "section_name": "Home Hero Section",
            "content": {
                "tagline": "Photography & Photobooth Services",
                "title": "Capturing Your Precious Moments",
                "description": "We specialize in creating timeless memories for your weddings, birthdays, corporate events, and special celebrations."
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "section_id": "about",
            "section_name": "About Us",
            "content": {
                "title": "About Rina Visuals",
                "story": "Founded in 2015, Rina Visuals began with a simple passion: to capture the authentic emotions and precious moments that make life beautiful.",
                "mission": "To preserve your most precious moments with artistry and authenticity."
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "section_id": "contact",
            "section_name": "Contact Information",
            "content": {
                "phone": "+63 912 345 6789",
                "email": "hello@rinavisuals.com",
                "address": "123 Creative Street, Makati City, Metro Manila, Philippines 1200",
                "hours": "Monday - Saturday, 9:00 AM - 6:00 PM"
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "section_id": "social_links",
            "section_name": "Social Media Links",
            "content": {
                "instagram": "https://instagram.com/rinavisuals",
                "facebook": "https://facebook.com/rinavisuals",
                "tiktok": ""
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "section_id": "booking_instructions",
            "section_name": "Booking Instructions",
            "content": {
                "steps": [
                    "Select your preferred date and package",
                    "Fill in your event details",
                    "Submit the required downpayment",
                    "Wait for confirmation from our team"
                ],
                "notes": "A 50% downpayment is required to secure your booking. Balance is due on the event day."
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "section_id": "faqs",
            "section_name": "FAQs",
            "content": {
                "items": [
                    {
                        "question": "How far in advance should I book?",
                        "answer": "We recommend booking at least 2-3 months in advance, especially for peak season (December-May)."
                    },
                    {
                        "question": "What is your cancellation policy?",
                        "answer": "Cancellations made 30 days before the event will receive a 50% refund. No refunds for cancellations made within 30 days."
                    },
                    {
                        "question": "How long does it take to receive our photos?",
                        "answer": "Edited photos are typically delivered within 2-4 weeks after the event."
                    }
                ]
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "section_id": "terms",
            "section_name": "Terms & Conditions",
            "content": {
                "text": "By booking our services, you agree to our terms and conditions. Full payment terms, cancellation policies, and usage rights are outlined in our service agreement."
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "section_id": "privacy",
            "section_name": "Privacy Policy",
            "content": {
                "text": "We respect your privacy. Your personal information is collected solely for booking purposes and will not be shared with third parties without your consent."
            },
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.cms_sections.insert_many(cms_sections)
    
    return {"message": "Data seeded successfully"}

# ==================== SERVE UPLOADED FILES ====================

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

@api_router.get("/uploads/{folder}/{filename}")
async def serve_upload(folder: str, filename: str, user: User = Depends(get_current_user)):
    """Serve uploaded files (requires authentication for payments)"""
    if folder == "payments":
        # Payment proofs require admin access
        if user.role not in [UserRole.ADMIN.value, UserRole.SUPER_ADMIN.value]:
            raise HTTPException(status_code=403, detail="Access denied")
    
    file_path = UPLOADS_DIR / folder / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

@api_router.get("/public-uploads/{folder}/{filename}")
async def serve_public_upload(folder: str, filename: str):
    """Serve public uploaded files (portfolio, QR codes)"""
    if folder not in ["portfolio", "qr_codes"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    file_path = UPLOADS_DIR / folder / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
