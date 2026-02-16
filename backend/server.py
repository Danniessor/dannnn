from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Response, Request
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import httpx
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'rina-visuals-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

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
    created_at: datetime

class ServicePackage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    package_id: str = Field(default_factory=lambda: f"pkg_{uuid.uuid4().hex[:12]}")
    name: str
    category: str  # photography, photobooth
    description: str
    price: float
    inclusions: List[str]
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ServicePackageCreate(BaseModel):
    name: str
    category: str
    description: str
    price: float
    inclusions: List[str]

class PortfolioItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    item_id: str = Field(default_factory=lambda: f"port_{uuid.uuid4().hex[:12]}")
    title: str
    category: str  # wedding, birthday, corporate, photobooth
    image_url: str
    description: Optional[str] = None
    is_featured: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PortfolioItemCreate(BaseModel):
    title: str
    category: str
    image_url: str
    description: Optional[str] = None
    is_featured: bool = False

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
    payment_proof_url: Optional[str] = None
    status: str = "pending"  # pending, confirmed, rejected, cancelled
    admin_notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

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
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    return User(**user_doc)

async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "role": "user",
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_jwt_token(user_id, user_data.email, "user")
    return {"token": token, "user": {"user_id": user_id, "email": user_data.email, "name": user_data.name, "role": "user"}}

@api_router.post("/auth/login")
async def login(credentials: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
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
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
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
        "role": user.role
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

@api_router.get("/packages", response_model=List[ServicePackage])
async def get_packages():
    packages = await db.packages.find({"is_active": True}, {"_id": 0}).to_list(100)
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
async def get_portfolio(category: Optional[str] = None, featured: Optional[bool] = None):
    query = {}
    if category:
        query["category"] = category
    if featured is not None:
        query["is_featured"] = featured
    
    items = await db.portfolio.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    for item in items:
        if isinstance(item.get('created_at'), str):
            item['created_at'] = datetime.fromisoformat(item['created_at'])
    return items

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
    """Get all confirmed booking dates"""
    bookings = await db.bookings.find(
        {"status": "confirmed"},
        {"_id": 0, "event_date": 1}
    ).to_list(500)
    return [b["event_date"] for b in bookings]

# ==================== BOOKING ROUTES ====================

@api_router.post("/bookings")
async def create_booking(booking_data: BookingCreate):
    # Check if date is available
    existing = await db.bookings.find_one({
        "event_date": booking_data.event_date,
        "status": {"$in": ["pending", "confirmed"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="This date is already booked or has a pending booking")
    
    booking = BookingRequest(**booking_data.model_dump())
    doc = booking.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.bookings.insert_one(doc)
    return {"booking_id": booking.booking_id, "message": "Booking request submitted successfully"}

@api_router.post("/bookings/{booking_id}/upload-payment")
async def upload_payment_proof(booking_id: str, file: UploadFile = File(...)):
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Read file and convert to base64
    content = await file.read()
    base64_content = base64.b64encode(content).decode()
    data_url = f"data:{file.content_type};base64,{base64_content}"
    
    await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": {"payment_proof_url": data_url}}
    )
    
    return {"message": "Payment proof uploaded successfully"}

@api_router.get("/bookings/{booking_id}/status")
async def get_booking_status(booking_id: str):
    booking = await db.bookings.find_one({"booking_id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return {"booking_id": booking_id, "status": booking["status"]}

# ==================== CONTACT ROUTES ====================

@api_router.post("/contact")
async def submit_contact(message_data: ContactMessageCreate):
    message = ContactMessage(**message_data.model_dump())
    doc = message.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.contact_messages.insert_one(doc)
    return {"message": "Message sent successfully"}

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/bookings")
async def admin_get_bookings(
    status: Optional[str] = None,
    user: User = Depends(require_admin)
):
    query = {}
    if status:
        query["status"] = status
    
    bookings = await db.bookings.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    for booking in bookings:
        if isinstance(booking.get('created_at'), str):
            booking['created_at'] = datetime.fromisoformat(booking['created_at'])
    return bookings

@api_router.put("/admin/bookings/{booking_id}")
async def admin_update_booking(
    booking_id: str,
    status: str,
    admin_notes: Optional[str] = None,
    user: User = Depends(require_admin)
):
    if status not in ["pending", "confirmed", "rejected", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    update = {"status": status}
    if admin_notes:
        update["admin_notes"] = admin_notes
    
    result = await db.bookings.update_one(
        {"booking_id": booking_id},
        {"$set": update}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Booking updated successfully"}

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

@api_router.post("/admin/portfolio")
async def admin_create_portfolio(item_data: PortfolioItemCreate, user: User = Depends(require_admin)):
    item = PortfolioItem(**item_data.model_dump())
    doc = item.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.portfolio.insert_one(doc)
    return {"item_id": item.item_id, "message": "Portfolio item created"}

@api_router.put("/admin/portfolio/{item_id}")
async def admin_update_portfolio(item_id: str, item_data: PortfolioItemCreate, user: User = Depends(require_admin)):
    result = await db.portfolio.update_one(
        {"item_id": item_id},
        {"$set": item_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Portfolio item updated"}

@api_router.delete("/admin/portfolio/{item_id}")
async def admin_delete_portfolio(item_id: str, user: User = Depends(require_admin)):
    result = await db.portfolio.delete_one({"item_id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Portfolio item deleted"}

# ==================== ADMIN PACKAGES ROUTES ====================

@api_router.post("/admin/packages")
async def admin_create_package(pkg_data: ServicePackageCreate, user: User = Depends(require_admin)):
    pkg = ServicePackage(**pkg_data.model_dump())
    doc = pkg.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.packages.insert_one(doc)
    return {"package_id": pkg.package_id, "message": "Package created"}

@api_router.get("/admin/packages")
async def admin_get_all_packages(user: User = Depends(require_admin)):
    packages = await db.packages.find({}, {"_id": 0}).to_list(100)
    for pkg in packages:
        if isinstance(pkg.get('created_at'), str):
            pkg['created_at'] = datetime.fromisoformat(pkg['created_at'])
    return packages

@api_router.put("/admin/packages/{package_id}")
async def admin_update_package(package_id: str, pkg_data: ServicePackageCreate, user: User = Depends(require_admin)):
    result = await db.packages.update_one(
        {"package_id": package_id},
        {"$set": pkg_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"message": "Package updated"}

@api_router.delete("/admin/packages/{package_id}")
async def admin_delete_package(package_id: str, user: User = Depends(require_admin)):
    result = await db.packages.delete_one({"package_id": package_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Package not found")
    return {"message": "Package deleted"}

# ==================== ADMIN TESTIMONIALS ROUTES ====================

@api_router.post("/admin/testimonials")
async def admin_create_testimonial(
    client_name: str,
    event_type: str,
    content: str,
    rating: int = 5,
    is_featured: bool = False,
    user: User = Depends(require_admin)
):
    testimonial = Testimonial(
        client_name=client_name,
        event_type=event_type,
        content=content,
        rating=rating,
        is_featured=is_featured
    )
    doc = testimonial.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.testimonials.insert_one(doc)
    return {"testimonial_id": testimonial.testimonial_id, "message": "Testimonial created"}

@api_router.delete("/admin/testimonials/{testimonial_id}")
async def admin_delete_testimonial(testimonial_id: str, user: User = Depends(require_admin)):
    result = await db.testimonials.delete_one({"testimonial_id": testimonial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Testimonial not found")
    return {"message": "Testimonial deleted"}

# ==================== ADMIN USER MANAGEMENT ====================

@api_router.get("/admin/users")
async def admin_get_users(user: User = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    for u in users:
        if isinstance(u.get('created_at'), str):
            u['created_at'] = datetime.fromisoformat(u['created_at'])
    return users

@api_router.put("/admin/users/{user_id}/role")
async def admin_update_user_role(user_id: str, role: str, user: User = Depends(require_admin)):
    if role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    result = await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"role": role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User role updated"}

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    """Seed initial data for packages, portfolio, and testimonials"""
    
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
            "inclusions": [
                "4 hours of coverage",
                "1 professional photographer",
                "100+ edited photos",
                "Online gallery",
                "Digital downloads"
            ],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "package_id": f"pkg_{uuid.uuid4().hex[:12]}",
            "name": "Premium Coverage",
            "category": "photography",
            "description": "Comprehensive documentation for your special day",
            "price": 30000,
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
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "package_id": f"pkg_{uuid.uuid4().hex[:12]}",
            "name": "Luxury Collection",
            "category": "photography",
            "description": "The complete experience for your once-in-a-lifetime event",
            "price": 50000,
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
            "inclusions": [
                "2 hours of service",
                "Unlimited prints",
                "Custom photo template",
                "Props included",
                "Digital copies",
                "Guest book"
            ],
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "package_id": f"pkg_{uuid.uuid4().hex[:12]}",
            "name": "Premium Booth",
            "category": "photobooth",
            "description": "Enhanced booth experience with premium features",
            "price": 15000,
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
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "package_id": f"pkg_{uuid.uuid4().hex[:12]}",
            "name": "360 Experience",
            "category": "photobooth",
            "description": "The ultimate interactive photo experience",
            "price": 25000,
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
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Beach Wedding Ceremony",
            "category": "wedding",
            "image_url": "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800",
            "description": "Sunset beach wedding",
            "is_featured": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Emma's Sweet 16",
            "category": "birthday",
            "image_url": "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800",
            "description": "Elegant birthday celebration",
            "is_featured": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Corporate Annual Gala",
            "category": "corporate",
            "image_url": "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800",
            "description": "Professional corporate event coverage",
            "is_featured": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Fun Photobooth Moments",
            "category": "photobooth",
            "image_url": "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800",
            "description": "Guests having fun at the photobooth",
            "is_featured": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "item_id": f"port_{uuid.uuid4().hex[:12]}",
            "title": "Church Wedding",
            "category": "wedding",
            "image_url": "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800",
            "description": "Traditional church ceremony",
            "is_featured": False,
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
    
    return {"message": "Data seeded successfully"}

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
