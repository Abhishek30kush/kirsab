# KIRSAB (किरसाब) — Full-Stack Hyperlocal Vegetable Delivery System
> **सब्ज़ी | किराना | घर तक**  
> Serving **Shervani Legacy, Prayagraj, Uttar Pradesh, India**

![KIRSAB Logo](/public/logo.png)

---

## 1. System Architecture Overview

KIRSAB is an end-to-end, production-quality hyperlocal vegetable ordering application equipped with a **PostgreSQL database**, **Node.js/Express REST API**, **Prisma ORM**, and a **secure Admin Dashboard** for daily price updates, stock management, live orders tracking, and store configuration.

```
kirsabweb/
├── public/                 # Optimized static assets & official KIRSAB logo
├── src/                    # Frontend (React 18 + Vite + Tailwind CSS)
│   ├── components/         # Reusable UI components & customer shop
│   │   ├── admin/          # Admin Dashboard & Admin Login Modal
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── AdminLoginModal.jsx
│   │   │   └── ProductEditModal.jsx
│   │   ├── Header.jsx      # Dynamic navigation with Admin Portal trigger
│   │   ├── CartDrawer.jsx  # Slide-over cart with free delivery threshold meter
│   │   ├── CheckoutModal.jsx # Validated checkout form submitting to backend API
│   │   └── ...
│   ├── context/            # Global Cart state synchronized with API & localStorage
│   ├── utils/              # Client API wrapper, currency formatting, validation
│   └── App.jsx             # Root application with dual Customer / Admin views
├── server/                 # Backend (Node.js + Express + Prisma + PostgreSQL)
│   ├── config/             # Database connection & environment configuration
│   ├── controllers/        # Auth, Products, Orders, and Store Settings controllers
│   ├── middleware/         # JWT Auth, Rate Limiter, and Request Validators
│   ├── prisma/             # PostgreSQL Schema & Migrations
│   ├── routes/             # RESTful API route definitions
│   ├── scripts/            # CLI Admin creator and database seed scripts
│   ├── tests/              # Automated test suite (8 tests covering auth, pricing, DB)
│   ├── index.js            # Express server entry point
│   ├── .env.example        # Server environment variables template
│   └── package.json        # Server scripts and dependencies
├── tailwind.config.js      # Brand green palette (#176B3A, #2E8B57, #F7FAF5)
├── package.json            # Frontend scripts and dependencies
└── README.md               # Complete architecture & deployment guide
```

---

## 2. Core Features & Business Logic

### A. Customer Experience (Zero Friction)
- **Live Product Catalogue**: Fetches today's live stock directly from the database.
- **Strict Price Protection**: Unconfigured vegetables (where `price: null`) display **“भाव प्रतीक्षारत”** and cannot be ordered, preventing ₹0 orders.
- **No Mandatory Login**: Customers can checkout with just their name, 10-digit mobile number, and tower/flat number.
- **Server-Side Price Validation**: The backend recalculates all item totals, delivery fees, and minimum order rules from authentic database records before placing orders.
- **Atomic Order Persistence**: Creates an immutable snapshot of item names, units, and prices in PostgreSQL, ensuring historical orders are immune to subsequent price changes.
- **WhatsApp Order Confirmation**: Generates a pre-formatted bilingual message including the unique order reference (e.g. `#KIR-2026-TCSV5087`).

### B. Admin Dashboard (`#admin` or via Header)
- **Sales & Overview Stats**: Real-time tracking of today's revenue, all-time revenue, today's orders, pending orders, and active vegetable count.
- **Product Management**:
  - Live table of all vegetables.
  - 1-Click **Stock Toggle** (In Stock / Out of Stock).
  - Add / Edit product modal (Hindi & English names, category, units, price, stock quantity, badge, image URL).
  - Safe deactivation for items with order history to protect historical data integrity.
- **Order Management**:
  - Filter orders by status: `pending`, `confirmed`, `packed`, `out_for_delivery`, `delivered`, `cancelled`.
  - Search by Order #, Customer Name, Mobile Number, or Flat.
  - Live status updater with direct **WhatsApp Customer Update button** to notify buyers with one click.
- **Store Configuration**:
  - Toggle Store Open / Closed.
  - Update business WhatsApp number.
  - Adjust Minimum Order Value (₹150 default), Delivery Fee (₹10 default), and Free Delivery Threshold (₹299 default).
  - Update Delivery Slots and Service Area descriptions.

---

## 3. Quick Start & Local Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL 14+ (Installed locally or hosted on Neon / Supabase)

### 1. Database Setup
Ensure PostgreSQL is running and create the database:
```sql
CREATE DATABASE kirsab_db;
```

### 2. Configure Backend
Navigate to `server/`:
```bash
cd server
npm install
```

Copy the environment template:
```bash
cp .env.example .env
```
Edit `server/.env` with your PostgreSQL connection URL:
```env
PORT=5000
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/kirsab_db?schema=public"
JWT_SECRET="kirsab_super_secret_jwt_key_shervani_legacy_prayagraj_2026"
CLIENT_URL="http://localhost:3000"
```

Sync the database schema and seed the initial catalogue:
```bash
npx prisma db push
npm run seed
```

### 3. Create the First Admin Account
Run the secure CLI script:
```bash
node scripts/createAdmin.js admin@kirsab.in YourStrongPassword "Shervani Store Manager"
```

### 4. Run the Backend Server
```bash
npm start
```
*Backend runs on `http://localhost:5000` (Health Check: `http://localhost:5000/api/health`)*

### 5. Run the Frontend Client
In the root directory:
```bash
cd ..
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## 4. API Endpoints Reference

### Public Endpoints
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check & server status |
| `GET` | `/api/products` | Active vegetable catalogue for customer shop |
| `GET` | `/api/settings` | Store configuration, delivery slots, pricing rules |
| `POST` | `/api/orders` | Place persistent order (recalculates totals on server) |

### Admin Endpoints (Require `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Admin login (Rate-limited, returns JWT) |
| `GET` | `/api/auth/me` | Fetch authenticated admin profile |
| `GET` | `/api/products/admin/all` | Get all products with search & category filters |
| `POST` | `/api/products/admin` | Create a new vegetable product |
| `PUT` | `/api/products/admin/:id` | Update product details, prices, or units |
| `PATCH` | `/api/products/admin/:id/toggle-stock` | Quick 1-click inStock toggle |
| `DELETE` | `/api/products/admin/:id` | Safe delete / deactivate product |
| `GET` | `/api/orders/admin` | List orders with status filters and search |
| `GET` | `/api/orders/admin/stats` | Daily revenue, order counts, and dashboard KPIs |
| `PATCH` | `/api/orders/admin/:id/status` | Update order status and get WhatsApp notification URL |
| `PUT` | `/api/settings/admin` | Update store configuration, WhatsApp number, and fees |

---

## 5. Automated Test Suite

Run the comprehensive automated tests:
```bash
cd server
npm test
```
The test suite covers:
1. `calculateOrderTotals`: Subtotal, standard fee, and free delivery thresholds.
2. `calculateOrderTotals`: Strict rejection of unconfigured or null-price products.
3. `calculateOrderTotals`: Rejection of orders below minimum order value.
4. `calculateOrderTotals`: Rejection of fractional or negative quantities.
5. `generateOrderNumber`: Unique human-readable reference formatting (`KIR-YYYY-XXXX`).
6. `Database & Auth`: Verification of bcrypt password hash matching and JWT validation.
7. `PostgreSQL Persistent Orders`: Atomic order creation, snapshot immutability, and status transition.
8. `Stock Toggle`: Database inStock toggling and verification.

---

## 6. Production Deployment Guide

### A. Database (Managed PostgreSQL)
Deploy PostgreSQL using any cloud provider:
- [Neon Serverless Postgres](https://neon.tech/) (Recommended, free tier available)
- [Supabase](https://supabase.com/)
- [Railway](https://railway.app/)

Get the pooled connection string (e.g. `postgresql://user:pass@ep-xyz.neon.tech/kirsab_db?sslmode=require`).

### B. Backend Deployment (Render / Railway / DigitalOcean)
1. Push the `server/` directory or repository.
2. Build command: `npm install && npx prisma generate`
3. Start command: `npm start`
4. Set Environment Variables:
   - `DATABASE_URL`: Your production PostgreSQL URL
   - `JWT_SECRET`: A 64-character random string
   - `CLIENT_URL`: Your production frontend domain (e.g. `https://kirsab.vercel.app`)
   - `NODE_ENV`: `production`

### C. Frontend Deployment (Vercel)
1. Deploy `kirsabweb` on Vercel.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set Environment Variable:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://api.kirsab.in/api`)
