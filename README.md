# 🍴 Yummy Eats — Business Daily Ledger Management System (BDLMS)

> A digital version of your handwritten business diary.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v20+
- MongoDB Atlas account (or local MongoDB)
- npm v10+

### 1. Configure MongoDB

Edit `backend/.env` and replace the `MONGODB_URI` with your Atlas connection string:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/bdlms?retryWrites=true&w=majority
```

### 2. Start Backend

```bash
cd backend
npm run dev
```

Backend runs on: http://localhost:5000

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on: http://localhost:3000

### 4. First Login

1. Open http://localhost:3000
2. Click **Register** to create your owner account
3. Login and you're ready!

---

## 📁 Project Structure

```
hisab_nikash/
├── backend/                    # Express + MongoDB API
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts     # MongoDB connection
│   │   ├── middleware/
│   │   │   ├── auth.ts         # JWT middleware
│   │   │   └── errorHandler.ts # Global error handler
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── User.ts
│   │   │   ├── Customer.ts
│   │   │   ├── Employee.ts
│   │   │   ├── Sale.ts         # Line-item product storage
│   │   │   ├── Expense.ts
│   │   │   ├── Stock.ts
│   │   │   ├── Attendance.ts
│   │   │   ├── DuePayment.ts
│   │   │   ├── DailyLedger.ts  # Core daily record
│   │   │   ├── Product.ts
│   │   │   └── Settings.ts
│   │   ├── routes/             # API endpoints
│   │   │   ├── auth.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── dailyLedger.ts
│   │   │   ├── sales.ts
│   │   │   ├── customers.ts
│   │   │   ├── expenses.ts
│   │   │   ├── stocks.ts
│   │   │   ├── attendance.ts
│   │   │   ├── employees.ts
│   │   │   ├── duePayments.ts
│   │   │   ├── reports.ts
│   │   │   ├── products.ts
│   │   │   └── settings.ts
│   │   └── server.ts           # Entry point
│   ├── .env                    # 🔑 Set MONGODB_URI here
│   └── package.json
│
├── frontend/                   # Next.js 14 App Router
│   ├── app/
│   │   ├── (app)/              # Protected app routes
│   │   │   ├── layout.tsx      # Sidebar + topbar
│   │   │   ├── dashboard/      # KPI cards + charts
│   │   │   ├── daily-sheet/    # Core diary view
│   │   │   ├── sales/          # Sales list + new sale
│   │   │   ├── customers/      # Customer list + profiles
│   │   │   ├── due-management/ # Due collection
│   │   │   ├── expenses/       # Expense tracking
│   │   │   ├── stock/          # Manual stock entries
│   │   │   ├── attendance/     # Employee attendance
│   │   │   ├── employees/      # Employee management
│   │   │   ├── reports/        # 8 report types
│   │   │   └── settings/       # Business settings
│   │   ├── login/              # Auth page
│   │   ├── globals.css         # Full design system
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── api.ts              # Axios client + JWT
│   │   └── utils.ts            # Helpers
│   └── .env.local              # API URL config
│
└── BDLMS_PRD_v1.md             # Full requirements doc
```

---

## 🔑 Core Business Rules

| Rule | Implementation |
|------|---------------|
| Daily Sheet immutability | `DailyLedger.status === 'Closed'` blocks all writes |
| Opening cash carry-forward | Auto-fetched from last closed ledger on day creation |
| Due creation on sale | Auto-created when `dueAmount > 0` |
| Due payment ≠ past sale edit | Only `dueAmount`, `paidAmount`, `paymentStatus` change on sale |
| Product-level line items | Every sale stores `items[]` with product details |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/dashboard` | Dashboard stats |
| GET | `/api/daily-ledger/today` | Get/create today's ledger |
| PATCH | `/api/daily-ledger/:id/close` | Close the day |
| POST | `/api/sales` | Create sale |
| GET | `/api/sales/customer/:id/product/:name` | Price history |
| GET | `/api/customers` | List customers |
| POST | `/api/due-payments` | Receive due payment |
| GET | `/api/reports/daily` | Daily report |
| GET | `/api/reports/monthly` | Monthly report |
| GET | `/api/reports/profit` | Profit report |

---

## 📊 Pages

| Route | Description |
|-------|-------------|
| `/dashboard` | KPIs, trends, recent sales |
| `/daily-sheet` | Full diary view for today |
| `/sales/new` | Add new sale |
| `/customers` | Customer directory |
| `/customers/[id]` | Customer profile + history |
| `/due-management` | Collect outstanding dues |
| `/expenses` | Daily expense tracking |
| `/stock` | Manual stock records |
| `/attendance` | Employee attendance |
| `/reports` | 8 report types |
| `/settings` | Business configuration |

---

## 🔮 Version 2 Roadmap

Architecture is ready for:
- Invoice & bill printing
- Thermal printer (ESC/POS)
- Barcode scanning
- GST integration
- Full POS system
- Automatic customer ledger

---

*Built with Next.js 14, Express, MongoDB Atlas*
