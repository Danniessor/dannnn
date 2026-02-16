# Rina Visuals - Photography & Photobooth Website PRD

## Project Overview
A professional photography and photobooth business website for Rina Visuals with an online booking system, portfolio showcase, and admin management dashboard.

## Original Problem Statement
Create a modern, professional, and visually elegant website for a photography and photobooth business named Rina Visuals with:
- Event photography and photobooth services showcase
- Professional portfolio galleries
- Online booking system with admin-controlled confirmation
- Payment proof upload functionality
- Admin dashboard for managing bookings, portfolio, and services

## User Choices
- Authentication: Both JWT-based and Google OAuth
- Payment: Static payment details for manual transfer (bank/GCash)
- Images: Placeholder photography images from Unsplash
- Design: Warm tones (beige, cream, gold accents)

## Architecture

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Main API server
- Authentication: JWT tokens + Google OAuth via Emergent Auth
- Collections: users, user_sessions, packages, portfolio, bookings, contact_messages, testimonials

### Frontend (React + Tailwind CSS)
- Pages: Home, Portfolio, Services, Booking, About, Contact, Login, Register, Admin Dashboard
- Components: Navbar, Footer, Lightbox, Calendar
- Styling: Warm minimalist luxury theme with Cormorant Garamond + Montserrat fonts

## User Personas

### 1. Event Organizers (Primary)
- Planning weddings, birthdays, corporate events
- Need: Easy booking, clear pricing, portfolio inspiration

### 2. Admin/Business Owner
- Managing bookings and calendar
- Need: Dashboard for approvals, portfolio management

## Core Requirements (Static)

### Public Features
- [x] Home page with hero, services preview, featured portfolio, testimonials
- [x] Portfolio gallery with category filtering (Wedding, Birthday, Corporate, Photobooth)
- [x] Lightbox image preview
- [x] Services page with Photography and Photobooth packages
- [x] Multi-step booking wizard (Date → Package → Details → Payment)
- [x] Calendar availability system
- [x] Payment proof upload
- [x] About Us page with team and company story
- [x] Contact page with form and map

### Admin Features
- [x] Secure login (JWT + Google OAuth)
- [x] Booking management (view, approve, reject)
- [x] Payment verification (view uploaded proofs)
- [x] Calendar availability control
- [x] Portfolio management
- [x] User role management

## What's Been Implemented

### Date: February 16, 2026

**Backend:**
- FastAPI server with all API endpoints
- MongoDB integration with proper ObjectId handling
- JWT + Google OAuth authentication
- CRUD for packages, portfolio, bookings, contacts
- Seed data with 6 packages, 6 portfolio items, 3 testimonials
- Admin-protected routes

**Frontend:**
- 9 pages: Home, Portfolio, Services, Booking, About, Contact, Login, Register, Admin
- Warm color scheme (#F9F5F1 cream, #C5A059 gold, #2C2420 espresso)
- Responsive design with mobile navigation
- Shadcn UI components (Calendar, Dialog, Table, Badge)
- Toast notifications with Sonner

**Testing Results:**
- Backend: 100% pass rate (14 API tests)
- Frontend: 90% pass rate (all major features working)

## Prioritized Backlog

### P0 (Critical) - DONE
- [x] Core booking flow
- [x] Admin authentication
- [x] Portfolio display
- [x] Services/packages display

### P1 (High Priority) - Future
- [ ] Email notifications for booking confirmations
- [ ] Calendar view in admin dashboard
- [ ] Image upload to cloud storage (currently base64)

### P2 (Medium Priority) - Future
- [ ] Client portal for booking status tracking
- [ ] Automated email reminders
- [ ] Analytics dashboard

### P3 (Nice to Have) - Future
- [ ] Online payment integration (Stripe/PayPal)
- [ ] Blog/news section
- [ ] Testimonial submission form

## Next Tasks
1. Add email notifications for bookings
2. Implement cloud storage for uploaded images
3. Add calendar view in admin dashboard
4. Create client booking status portal

## Admin Access
- Email: admin@rinavisuals.com
- Password: admin123
