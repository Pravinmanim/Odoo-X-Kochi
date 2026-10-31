# Brightloop Subscription Management System

Foundation architecture and core scaffolding for the Brightloop Subscription Management System. Built as a monorepo consisting of an Express + Prisma backend and a React + Vite + Tailwind CSS frontend.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js** (v18+ recommended, v20+ / v22+ fully tested)
- **PostgreSQL** running locally on port 5432
- *(Optional)* **Mailpit** or any local SMTP server on port 1025 for capturing password reset emails

---

### 1. Installation

Install all root, server, and client dependencies:
```bash
npm run install:all
```
*(Or run `npm install` inside both `/server` and `/client` directories)*

---

### 2. Environment Setup

Create `.env` files in both root and `/server`:
```bash
cp .env.example .env
cp .env.example server/.env
```

Ensure `server/.env` contains your database connection string:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brightloop?schema=public"
PORT=5000
NODE_ENV=development
JWT_SECRET="super-secret-jwt-key-brightloop-foundation-2026"
JWT_EXPIRES_IN="7d"
CLIENT_URL="http://localhost:5173"
SMTP_HOST="localhost"
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="no-reply@brightloop.local"
```

---

### 3. Database Migration & Seeding

Create the database and apply the Prisma schema migration:
```bash
# Run migrations
npm run migrate

# Seed demo users & sample reference products
npm run seed
```

---

### 4. Running the Application

Start both the backend API (`http://localhost:5000`) and the frontend client (`http://localhost:5173`) concurrently:
```bash
npm run dev
```

---

## 👥 Demo Credentials

The database seed provisions three pre-configured accounts:

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@brightloop.com` | `AdminPassword123!` | Full CRUD on Products, Staff provisioning, Configuration |
| **Staff** | `staff@brightloop.com` | `StaffPassword123!` | Read-only view on Products, Subscriptions & Invoices operations |
| **Customer** | `customer@brightloop.com` | `CustomerPassword123!` | Customer Portal: My Subscriptions, My Invoices, Profile |

*Note: You can click the "Quick Demo Logins" buttons directly on the Login page for 1-click test credential entry.*

---

## 📧 Mailpit (Password Reset Testing)

The auth module dispatches single-use, 30-minute hashed password reset tokens via Nodemailer.
- If **Mailpit** is running on `localhost:1025`, emails will be captured and visible on the Mailpit web UI (`http://localhost:8025`).
- If Mailpit is not running, the application catches the connection notice and safely logs the full reset link to the server console so developers can test the password reset flow without friction.

---

## 📁 Repository Structure

```text
.
├── .env.example                # Example environment settings
├── .gitignore                  # Git exclusions (no .env, no node_modules)
├── package.json                # Monorepo scripts (dev, migrate, seed, install:all)
├── docs/
│   └── CONVENTIONS.md          # Architectural guide & pattern reference for Developer 2
├── client/                     # Frontend (React 19 + Vite + Tailwind CSS)
│   ├── src/
│   │   ├── api/                # Axios client with JWT interceptor & 401 redirect
│   │   │   ├── client.js
│   │   │   ├── auth.js
│   │   │   └── products.js
│   │   ├── components/         # Reusable UI component library
│   │   │   ├── Badge.jsx       # Standardized status color badges
│   │   │   ├── Button.jsx      # Buttons with variants and loading spinners
│   │   │   ├── ConfirmDialog.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Loader.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── PasswordChecklist.jsx
│   │   │   ├── Select.jsx
│   │   │   └── Table.jsx
│   │   ├── config/             # Conflict-free config files
│   │   │   ├── navConfig.js    # Role-based sidebar items
│   │   │   └── routesConfig.jsx# Route definitions with role guards
│   │   ├── context/            # AuthContext & ToastContext
│   │   ├── layouts/            # AppLayout (Sidebar, Topbar, Breadcrumbs)
│   │   └── pages/
│   │       ├── auth/           # Login, Signup, Forgot, Reset
│   │       ├── products/       # Products reference module
│   │       ├── staff/          # Staff list & provision modal
│   │       └── PlaceholderPage.jsx
│   └── vite.config.js          # Vite config with /api proxy to port 5000
└── server/                     # Backend API (Node.js + Express + Prisma)
    ├── prisma/
    │   ├── schema.prisma       # 17 complete database models, enums & relations
    │   └── migrations/         # Migration history
    └── src/
        ├── app.js              # Express app (helmet, cors, morgan, error handler)
        ├── routes.js           # API root router (/api/v1)
        ├── config/             # Config & env loader
        ├── database/           # Prisma singleton & seed script
        ├── middleware/         # Auth, requireRole, checkOwnership, validate, rateLimiter
        ├── modules/
        │   ├── auth/           # Signup, Login, Forgot, Reset, Me
        │   ├── staff/          # Admin-only staff creation & directory
        │   └── products/       # Full CRUD reference module with variants & calculated pricing
        └── utils/              # Standard AppError, Pagination helper, Nodemailer transport
```

---

## 🛡️ Reference Module (Products)

The **Products** module demonstrates the complete architecture pattern:
1. **Server**: Clean separation of `product.routes.js`, `product.controller.js`, `product.service.js`, and `product.validator.js`.
2. **Pricing**: Product base `sales_price` + variant `extra_price` = `final_price` calculated cleanly on the backend.
3. **RBAC**: Admin has full CRUD; Staff has read-only access; Customers have zero access.
4. **Client**: List page with server-side pagination, search, status badge, and Create/Edit modal with dynamic variants and live price preview.


# Odoo-X-Kochi
