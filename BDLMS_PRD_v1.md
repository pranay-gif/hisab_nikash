# Business Daily Ledger Management System (BDLMS)

## Version 1 - Product Requirement Document

---

## Project Overview

Build a web application that digitizes a current handwritten daily business ledger.

> **This is NOT a restaurant POS software.**

This is a custom business management application based on a daily workflow.

The goal is to replace the daily notebook while keeping the same business process.

Version 1 focuses on **manual data entry** with **automatic calculations** and **reports**.

Billing and POS automation will be implemented in **Version 2**.

---

## Tech Stack

### Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Shadcn UI

### Backend
- Node.js
- Express.js
- JWT Authentication

### Database
- MongoDB Atlas
- Mongoose

### Charts
- Recharts

---

## Core Principles

1. **Daily Sheet is the heart of the application.**
2. **Every business day has exactly one Daily Sheet.**
3. **Once a day is closed, historical values must never change.**
4. **Later due payments should never modify previous day's sales.**
5. **Only payment status can change.**

### Example

```
06 Aug

Sales          ₹12,000
Outstanding Due  ₹1,500
Status         🟡 Pending

--- After customer pays later ---

Sales               ₹12,000   ← NEVER CHANGES
Outstanding Due Created ₹1,500
Status              🟢 All Paid
```

> ⚠️ Sales amount never changes. Only payment status updates.

---

## Version 1 Modules

---

### 1. Dashboard

**Display:**
- Today's Sales
- Today's Expenses
- Current Cash
- Outstanding Due
- Present Employees
- Today's Stock Summary
- Recent Sales

---

### 2. Daily Sheet

This page should look similar to a handwritten diary.

**Sections:**
1. Previous Day Cash
2. Today's Selling
3. Today's Expenses
4. Today's Stock
5. Employee Attendance
6. Summary
7. Closing Cash
8. Outstanding Due
9. Status
10. Notes

---

### 3. Selling Module

> There is **NO billing system** in Version 1. Sales are entered manually.

**Workflow:**

User clicks → **Add Sale**

**Form Fields:**
| Field | Description |
|-------|-------------|
| Customer | Walk-in / Existing / New |
| Product | Product name |
| Quantity | Qty sold |
| Selling Price | Per unit price |
| Discount | Discount applied |
| Paid Amount | Amount paid now |
| Due Amount | Remaining balance |
| Payment Mode | Cash / UPI / etc. |
| Remarks | Optional notes |

The sale is **immediately reflected** inside Today's Selling section.

---

### 4. Customer Management

Customer selection options:
- **Walk-in Customer**
- **Existing Customer**
- **New Customer**

**When an existing customer is selected, automatically display:**
- Customer Name
- Phone
- Outstanding Due
- Previous Purchases
- Previous Product Prices
- Payment History
- Notes

---

### 5. Customer Purchase History

When a customer **and** a product are both selected, the system should **automatically display previous selling prices**.

**Example:**

```
Customer: Rahul
Product:  Egg Roll

History:
  04 Aug  |  Qty 10  |  Price ₹45
  28 Jul  |  Qty 8   |  Price ₹42

Average Price: ₹43.50
```

**Purpose:** Helps decide today's selling price. Current selling price remains **editable**.

---

### 6. Due Management

**Rule:** Whenever `Due Amount > 0`, automatically create a **pending due**.

**User Flow:**
1. Open customer profile
2. Click **Receive Payment**
3. Enter amount
4. Save

**System Actions:**
- Update remaining due
- Store payment history
- Mark invoice/sale as paid when due becomes zero
- **Previous Daily Sheet must NEVER change**
- Only the **Status** field changes: `🟡 Pending` → `🟢 All Paid`

---

### 7. Expenses

Manual Entry Form

**Fields:**
| Field | Description |
|-------|-------------|
| Category | Dropdown (see categories below) |
| Amount | Expense amount |
| Payment Mode | Cash / UPI / etc. |
| Description | Optional details |
| Date | Date of expense |

**Expense Categories:**
- Vegetables
- Gas
- Milk
- Salary
- Electricity
- Transport
- Others

---

### 8. Stock

> **No automatic stock deduction.** Stock is **completely manual**.

**Fields:**
| Field | Description |
|-------|-------------|
| Item Name | Stock item |
| Purchased Today | Qty purchased |
| Remaining Stock | Current remaining |
| Remarks | Notes |

**Example:**
```
Item: Maida
Purchased Today:  20 KG
Remaining Stock:  12 KG
```

- Store daily history.
- **Never overwrite previous stock records.**

---

### 9. Employee Attendance

Simple daily attendance system.

**Options per employee:**
- ✅ Present
- ❌ Absent
- 🕐 Half Day
- 📝 Remarks

---

### 10. Reports

**Generate the following reports:**
- Daily Report
- Monthly Report
- Yearly Report
- Expense Report
- Customer Due Report
- Stock Report
- Attendance Report
- Profit Report

---

## Customer Profile

**Each customer profile contains:**

- Basic Details
- Purchase History
- Due History
- Payment History
- Notes

**Example:**

```
Customer: Rahul
Outstanding Due: ₹350

Purchase History:
  04 Aug  |  Egg Roll   |  Qty 10  |  ₹45
  30 Jul  |  Chowmein   |  Qty 8   |  ₹50

Payment History:
  06 Aug  |  ₹100
  10 Aug  |  ₹200
  15 Aug  |  ₹300
```

---

## Daily Closing

At end of business, user clicks **Close Day**.

**System Actions:**
1. Calculate Closing Cash
2. Calculate Total Sales
3. Calculate Total Expenses
4. Calculate Outstanding Due
5. **Lock the Day** (no further editing)
6. Generate Daily Report
7. Carry Closing Cash → next day's Opening Cash

> ⚠️ **Closed days cannot be edited.**

---

## Database Collections

| Collection | Description |
|------------|-------------|
| `users` | App users / owners |
| `employees` | Employee records |
| `customers` | Customer profiles |
| `sales` | All sale transactions |
| `expenses` | Daily expense entries |
| `stocks` | Daily stock records |
| `attendance` | Employee attendance logs |
| `due_payments` | Due payment receipts |
| `daily_ledgers` | One document per business day |
| `settings` | App configuration |

---

## Sales Collection Schema

**Every sale belongs to a customer.**

Each sale contains:
- Customer reference
- Products (array)
  - Product name
  - Quantity
  - Price per unit
  - Discount
- Total Paid Amount
- Total Due Amount
- Remarks
- Date

### ✅ Correct Data Structure

```json
{
  "customer": "Rahul",
  "items": [
    { "product": "Egg Roll",  "qty": 5, "price": 45 },
    { "product": "Chowmein", "qty": 2, "price": 50 }
  ],
  "paid": 300,
  "due": 150
}
```

### ❌ Wrong Data Structure

```json
{
  "customer": "Rahul",
  "total": 450
}
```

> **Reason:** Future billing system depends on product-level history. Always store line-item details.

---

## Important Business Rules

1. Every sale must store **product-level information** — never just totals.
2. Historical Daily Sheet data is **immutable** once the day is closed.
3. Due payments only update **status**, never past sales figures.
4. Stock entries are **manual** — no automated inventory deduction.
5. Closing cash of Day N = Opening cash of Day N+1 (auto-carried).

---

## Design Philosophy

> This application should feel like a **digital version of a handwritten business diary**.

- Data entry should be **simple and fast**.
- Most values should be **calculated automatically**.
- **Historical data must remain unchanged.**
- The system should prioritize **business accuracy** over automation.
- Automation (billing, POS) will be added in **future versions** without changing the database structure.

---

## Future — Version 2 (Do NOT implement now)

> Keep architecture ready for these features.

- Invoice generation
- Bill printing
- Thermal printer support
- Barcode scanning
- GST integration
- POS system
- Automatic sales entry
- Automatic bill generation
- Automatic customer ledger

---

*Document Version: 1.0*
*Last Updated: 2026-08-06*
