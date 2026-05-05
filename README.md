# Coupon-Based Lead Form (MERN ES6)

Advanced assignment implementation using **MongoDB + Express + React + Node.js** with ES6 modules.

## Features Implemented

- Lead form with required fields:
  - Name, Phone Number, Email, City, Requirement Type, Budget Range, Message (optional), Coupon Code
- Phone and email validation
- Apply Coupon flow:
  - Validates coupon from backend
  - Shows discount and final price
  - Shows errors for invalid, expired, non-applicable, or rule-failed coupons
- Coupon validation rules:
  - Expiry check
  - Minimum order value
  - Applicable requirement types
  - Limited usage
  - First-time user only
- Lead submission:
  - Stores complete form data + coupon + discount + final price
  - Prevents duplicate submissions by same email/phone within a configurable cooldown
- Bonus:
  - Rate limiting for APIs (anti-spam)
  - Postman collection included
  - Basic dashboard to view leads
  - Loading states and UX feedback

## Project Structure

```
CouponBasedLead/
  backend/
  frontend/
  CouponBasedLead.postman_collection.json
```

## Setup

### 1) Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

Set values in `.env` as needed:

- `PORT=5000`
- `MONGO_URI=mongodb://127.0.0.1:27017/coupon_lead_db`
- `CLIENT_ORIGIN=http://localhost:5173`
- `SUBMISSION_COOLDOWN_MINUTES=10`

### 2) Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Default frontend URL: `http://localhost:5173`

## API Endpoints

- `GET /api/health`
- `POST /api/coupons/validate`
- `POST /api/leads`
- `GET /api/leads`

## Test Coupon Codes (Seeded Automatically)

- `SAVE10` -> 10% off, min order Rs. 500
- `FLAT100` -> Rs. 100 off, only for `Service`
- `NEWUSER` -> 20% off, first-time users only
- `EXPIRE50` -> expired coupon (for test case)

## Notes

- Coupons are auto-seeded at server start.
- Backend increments coupon usage count when couponed lead is successfully submitted.
