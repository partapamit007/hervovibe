# Hervovibe MLM Platform — Complete System Guide

**A. Herbal Div. of Vibdrugs | Panchkula**
*Prepared for internal team and distributor onboarding*

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Business Logic — How Everything Works](#2-business-logic)
   - Rank Structure
   - ID Color System
   - Salary Rules
   - Business Commission
   - Product Incentive (PI)
   - Business Incentive (BI)
3. [Master Admin Guide](#3-master-admin-guide)
4. [Team Member (Sub-Admin) Guide](#4-team-member-guide)
5. [Distributor / Member Guide](#5-distributor-guide)
6. [Frequently Asked Questions](#6-faq)

---

# 1. System Overview

The Hervovibe platform is a web-based MLM management system that tracks members, sales, ranks, commissions, and payouts — all in one place.

**Access:** Open your browser and go to `hervovibe.vercel.app`

**Three types of users:**

| Role | Who | What they can do |
|---|---|---|
| **Master Admin** | Company owner / accounts team | Full control — add members, record sales, run rank engine, process payouts |
| **Team Member** | Sub-admin / field coordinators | Add sales for the distributors assigned to them |
| **Distributor** | MLM network members | View-only — see their own dashboard, earnings, rank, team |

---

# 2. Business Logic

This section explains the core rules that drive everything on the platform. Read this carefully — it is the foundation of how salaries and commissions are calculated.

---

## 2.1 Rank Structure

There are **8 ranks**. Every member starts as a **Distributor**. Ranks move **upward only — they are never taken away once earned.**

| Rank | Active Team Required | Monthly Salary |
|---|---|---|
| DISTRIBUTOR | — | No salary |
| BRONZE | 5 active members | No salary |
| SILVER | 25 active members | ₹1,000 / month |
| GOLDEN | 125 active members | ₹5,000 / month |
| DIAMOND | 625 active members | ₹15,000 / month |
| SUPER DIAMOND | 3,125 active members | ₹30,000 / month |
| PLATINUM | 15,625 active members | ₹75,000 / month |
| CENTENNIAL | 78,125 active members | ₹1,00,000 / month |

**"Active team member"** = any member in your entire downline (at any level) who has purchased **₹1,800 or more** in that calendar month.

### How promotion works

To move to the next rank in any given month, **both conditions must be met at the same time:**

1. **Your own purchase ≥ ₹1,800** that month
2. **Enough active team members** — each with ≥ ₹1,800 personal purchase that month

> **Example:** Ramesh is DISTRIBUTOR. He wants to become BRONZE.
> This month he himself purchases ₹2,000. He has 5 downline members — 4 of them have purchased ₹1,800+ each, but 1 has purchased only ₹500.
> → Ramesh does **not** promote to BRONZE this month. He needs all 5 to be active.
> Next month if all 5 are active, he promotes.

### Rank is permanent

Once a rank is achieved, **it stays forever** — even if the member goes inactive in future months. What gets affected is the **salary**, not the rank title.

---

## 2.2 ID Color System

Every member gets a color each month based on their personal purchase amount that month.

| Color | Purchase This Month | Meaning |
|---|---|---|
| 🟢 GREEN | ₹1,800 or more | Active — earning full benefits |
| 🟡 YELLOW | ₹1 to ₹1,799 | Partial — purchased but below minimum |
| 🔴 RED | ₹0 | No purchase this month |
| ⚫ BLACK | ₹0 for 3 months in a row | Consistently inactive |

**Where you see colors:**
- Admin member list — colored dots next to each member
- Each member's own dashboard — their own color shown at top right
- Member's "My Direct Team" section — color dot next to each direct downline member

**Why it matters:** A sponsor can see exactly which of their team members are inactive and follow up before the month ends.

---

## 2.3 Salary Rules

A member **earns their salary** in a month if:
- Their own purchase is ≥ ₹1,800 (they are GREEN)
- Their rank carries a salary (SILVER and above)

A member's **salary is withheld** that month if:
- Their own purchase is below ₹1,800, OR
- Any member in their downline has not met the ₹1,800 minimum

> **Note:** Salary is withheld — not lost forever. If conditions are met next month, salary resumes. The rank title is never affected.

---

## 2.4 Business Commission

When any member makes a sale, **commission travels upward** through their sponsor chain. Each upline member earns a percentage based on how many levels away they are from the seller.

| Level from Earner to Seller | Commission % | On ₹1,800 |
|---|---|---|
| 0 — own sale | 8% | ₹144 |
| 1 — direct downline sells | 4% | ₹72 |
| 2 — level 2 sells | 2% | ₹36 |
| 3 — level 3 sells | 1.5% | ₹27 |
| 4 — level 4 sells | 1% | ₹18 |
| 5 — level 5 sells | 0.75% | ₹13.50 |
| 6 — level 6 sells | 0.5% | ₹9 |
| 7 — level 7 sells | 0.25% | ₹4.50 |

**How many levels each rank can earn from:**

| Rank | Earns from depths |
|---|---|
| DISTRIBUTOR | Own sale only |
| BRONZE | Own + 1 level deep |
| SILVER | Own + 2 levels deep |
| GOLDEN | Own + 3 levels deep |
| DIAMOND | Own + 4 levels deep |
| SUPER DIAMOND | Own + 5 levels deep |
| PLATINUM | Own + 6 levels deep |
| CENTENNIAL | Own + 7 levels deep |

> **Example:** Sunita is SILVER. Her direct member Rajan makes a ₹1,800 sale.
> Sunita earns 4% = ₹72 (Rajan is 1 level below her).
> Rajan's own 8% = ₹144.
> Sunita's sponsor (if GOLDEN or above) earns 2% = ₹36 (Rajan is 2 levels below them).

Commission is calculated automatically by the system when a sale is recorded.

---

## 2.5 Product Incentive (PI)

- Every product in the catalog has a fixed **PI point value** (set by the company).
- When a sale is recorded, the seller earns PI points. Their upline members also earn PI points.
- At month end, the admin sets a **conversion rate** (e.g., ₹0.90 per point).
- **PI Payout = Total Points accumulated × Conversion Rate**
- PI is distributed monthly.

> **Example:** Rajan sells 2 units of Product A. Product A gives 5 PI points per unit.
> Rajan gets 10 PI points. If rate is ₹0.90, that's ₹9 from PI for this product.

---

## 2.6 Business Incentive (BI)

- Every product also has a fixed **BI value** (separate from PI, set by the company).
- BI is accumulated like PI but paid out **quarterly / half-yearly / yearly** (not monthly).
- Both the seller and their upline members earn BI points on each sale.

---

# 3. Master Admin Guide

Login at `hervovibe.vercel.app` with your Master Admin credentials.

---

## 3.1 Dashboard

The first page you see after login. Shows:
- **Total Members** — all distributors in the system
- **Active Members** — members with ACTIVE status
- **Sales This Month** — total rupee value of all sales recorded this month
- **RED This Month** — count of active members who have ₹0 purchase this month (needs follow-up)
- **6-Month Sales Trend** — bar chart of total monthly sales
- **Recent Sales** — last 6 sales entries
- **Recent Members** — last 6 members who joined

---

## 3.2 Managing Members

**Path: Admin → Members**

### Viewing the member list
- Shows all distributors with their rank, status, and ID color for the current month
- Filter by: ALL / GREEN / YELLOW / RED / BLACK
- Search by name or member ID
- Export all member data to CSV using the Export button

### Adding a new member
1. Click **Add Member**
2. Fill in: Name, Email, Phone, Joining Date, Sponsor (who referred them), Team Member (which sub-admin manages them)
3. Click **Create Member**
4. A **temporary password** is shown on screen — copy it and share it with the member. They can change it after first login.
5. Member starts with DISTRIBUTOR rank automatically.

### Editing a member
1. Click on any member → click **Edit**
2. You can change: Name, Email, Phone, Rank, Status, Sponsor, PAN, Aadhaar, Address, Bank details
3. Click **Save**

> **Important:** Only change rank manually if correcting a data error. In normal operations, the Rank Engine handles promotions automatically.

### Deactivating a member
- Click **Deactivate** on the member detail page
- Member cannot login but their data and history is preserved
- Click **Activate** to re-enable them

### Resetting a member's password
1. Click **Reset Password** on the member detail page
2. Confirm the action
3. A new temporary password is generated and shown on screen
4. Share the new password with the member

### Deleting a member
- Click **Delete** — this soft-deletes the member (hides them, does not erase data)
- Use only when a member was added by mistake

---

## 3.3 Recording Sales

**Path: Admin → Sales**

### Adding a sale
1. Click **Add Sale**
2. Select the **member** whose sale you are recording
3. Select the **month and year** the sale belongs to
4. Select **products** from the catalog and enter quantities — the total auto-calculates
5. Or enter a manual amount if not using the product selector
6. Upload invoice screenshot (optional but recommended)
7. Click **Save Sale**

The system automatically:
- Calculates business commission for all eligible upline members
- Records PI and BI points for seller and upline
- Updates the member's ID color for that month

### Deleting a sale
- Open the sale record → click Delete
- This also removes all commission records linked to that sale

---

## 3.4 Running the Rank Engine

**Path: Admin → Rank Engine**

The Rank Engine checks every member's current month data and promotes those who qualify.

**When to run:** On the last day of each month (or first day of the new month).

**How to run:**
1. Go to Rank Engine page
2. Select the **month and year** you are processing
3. Click **Run Rank Engine**
4. The system shows how many members were promoted and what their new ranks are

**What it does:**
- Counts each member's active downline (members with ≥ ₹1,800 purchase that month)
- Checks if their own purchase is ≥ ₹1,800
- If both conditions met and team count ≥ next rank minimum → promotes them
- Ranks never go down — only up
- Saves a history log of every promotion

**Rank History** section below shows all past promotions with reason, date, and member name.

---

## 3.5 Processing Payouts

**Path: Admin → Payouts**

Run payouts after the Rank Engine has been run for the month.

### Steps to process monthly payouts
1. Go to Payouts page
2. Select month and year
3. Click **Preview Payouts** — the system calculates for every active member:
   - Salary (if rank ≥ SILVER and own purchase ≥ ₹1,800)
   - Business commission earned
   - PI amount (points × current rate)
   - Total payout
4. Review the preview — red rows indicate members whose salary is blocked
5. Set the **PI Rate** for this month (₹ per point) before finalizing
6. Click **Record Payout** for each member to mark as paid
7. Enter payment mode (Bank Transfer / Cash / UPI) and reference number

### Payout is blocked if:
- Member's own purchase < ₹1,800 (salary blocked)
- Any downline member < ₹1,800 (salary blocked for upline too)
- Payout already recorded for this member + month (prevents duplicates)

---

## 3.6 Products / Catalog

**Path: Admin → Products**

### Adding a product
1. Click **Add Product**
2. Enter: Product Name, MRP, PI Points (per unit), BI Value (per unit)
3. Save

### Editing / Deactivating a product
- Click the product to edit name, MRP, or incentive values
- Deactivate a product to stop it from appearing in the sales entry form

---

## 3.7 Incentives (PI / BI Records)

**Path: Admin → Incentives**

Shows all PI and BI records generated from sales. Filter by member or month. Used for audit and verification before payout.

---

## 3.8 Reports

**Path: Admin → Reports**

- **Sales Overview** — bar chart of monthly sales volumes
- **Rank Distribution** — pie chart showing how many members are at each rank
- **Top Performers** — leaderboard of members by sales this month
- Export data to CSV from any report section

---

## 3.9 Team Members Management

**Path: Admin → Team Members**

Team Members are sub-admins who add sales for their assigned distributors.

### Adding a team member
1. Click **Add Team Member**
2. Enter: Name, Email
3. A temporary password is generated — share it with them
4. Assign distributors to them via the Members section (Edit member → Team Member field)

### Removing a team member
- Click **Remove** next to their name
- All distributors assigned to them become unassigned (can be reassigned later)

---

## 3.10 MLM Tree

**Path: Admin → MLM Tree**

Visual tree showing the full sponsor hierarchy. Click any node to expand downline. Useful for understanding the network structure.

---

# 4. Team Member Guide

Team Members (sub-admins) can add sales for the distributors assigned to them.

Login at `hervovibe.vercel.app` with the credentials given to you by the admin.

---

## 4.1 Dashboard

Shows a summary of your assigned members' activity for the current month.

---

## 4.2 Adding a Sale for a Member

**Path: Team → Add Sale**

1. Select the **member** from your assigned list (you can only see members assigned to you)
2. Select the **month and year**
3. Select products + quantities (total auto-calculates) or enter manual amount
4. Upload invoice screenshot if available
5. Click **Save Sale**

> You cannot add sales for members not assigned to you.

---

## 4.3 Viewing Member Status

**Path: Team → Members**

Shows all distributors assigned to you with:
- Their current month sales amount
- ID color (GREEN / YELLOW / RED / BLACK)
- Rank

Use this to identify who needs a follow-up call to make their ₹1,800 purchase before month end.

---

# 5. Distributor Guide

As a distributor, your account is **read-only** — you can see all your data but cannot change sales records. Contact your team member or admin to record a sale.

Login at `hervovibe.vercel.app` with the credentials given to you when you joined.

---

## 5.1 Dashboard

The first screen after login. Shows everything important at a glance:

**Your ID Color** — shown as a circle at the top right of your name.
- 🟢 GREEN = you have purchased ≥₹1,800 this month. Salary and commissions are active.
- 🟡 YELLOW = you've purchased something but below ₹1,800. Purchase more to unlock salary.
- 🔴 RED = no purchase this month. Your upline's salary is also blocked.
- ⚫ BLACK = no purchase for 3 months in a row.

**Salary Status Banner** — tells you whether you've met the ₹1,800 minimum this month and whether your salary is active.

**Four cards:**
- **This Month Sales** — your total personal purchase this month
- **Earned This Month** — salary + commission + PI for this month
- **Group Volume** — your sales + all your downline's sales combined this month
- **Active Team** — how many of your downline members are GREEN (≥₹1,800) this month

**My Direct Team** — shows each of your direct (level 1) members with their ID color. If any are RED or BLACK, the warning banner appears — they are blocking your salary.

**Recent Sales** — your last few months of sales history.

---

## 5.2 Rank Page

**Path: Menu → Rank**

Shows:
- Your current rank (permanent — never taken away)
- Your own sales this month vs ₹1,800 minimum
- How many active team members you have vs how many needed for next rank
- The full rank ladder — which ranks you've achieved and what future ranks require

**To reach the next rank you need both in the same month:**
1. Your own purchase ≥ ₹1,800
2. The required number of active team members (each with ≥ ₹1,800 purchase)

---

## 5.3 Earnings Page

**Path: Menu → Earnings**

Shows a full breakdown of your earnings:

**This Month:**
- Salary (if applicable for your rank)
- Business Commission earned from your downline's sales
- PI Points earned and their rupee value (once rate is set by admin)
- Total

**Commission History** — last 12 months of commission records

**Payout Records** — confirmed payouts made to you including payment mode and reference number

---

## 5.4 Profile Page

**Path: Menu → Profile**

Shows your account information: name, email, member ID, joining date, rank, sponsor, and status.

### What you can edit yourself:
- Phone number
- Address
- Bank Name, Account Number, IFSC Code
- UPI ID

Click **Edit** in the Contact & Bank Details section, make changes, click **Save Changes**.

> Bank details are used by admin to process your monthly payouts. Keep them accurate.

### Changing your password
Scroll to the bottom of the Profile page → **Change Password** section.
Enter your current password, then your new password twice, and click **Update Password**.

> If you forgot your password, contact your team member or admin to reset it.

---

# 6. FAQ

**Q: I purchased ₹1,800 this month but my color is still RED. Why?**
A: Sales take time to be recorded by your team member or admin. Contact them to confirm your sale has been entered for the correct month.

**Q: My salary shows ₹0 even though I'm SILVER rank.**
A: Two possible reasons: (1) Your own purchase this month is below ₹1,800, or (2) One or more members in your downline have not met ₹1,800 this month. Check your "My Direct Team" section — anyone showing RED or BLACK is blocking your salary.

**Q: I achieved GOLDEN rank last month. Will I lose it if I don't sell this month?**
A: No. Your rank is permanent — it stays GOLDEN even if you go inactive. Your salary for that month will be withheld, but the rank title never changes.

**Q: How is my business commission calculated?**
A: When any member in your downline makes a sale, you earn a percentage based on how many levels below you they are. Example: if someone 2 levels below you sells ₹1,800, you earn 2% = ₹36. Your own sale earns you 8% = ₹144.

**Q: When does the PI rate get set?**
A: The admin sets the PI conversion rate (₹ per point) each month before running payouts. Until it's set, your PI earnings show as "X points" without a rupee value.

**Q: My bank account changed. How do I update it?**
A: Go to Profile → Contact & Bank Details → Edit → update your account number and IFSC → Save. Make sure to do this before the monthly payout is processed.

**Q: I forgot my password.**
A: Contact your team member or the admin. They can reset your password and give you a new temporary one. You can then change it from your Profile page.

**Q: Can I see my downline's full tree?**
A: The member dashboard shows only your direct (level 1) team. For a full tree view, the admin can check the MLM Tree section.

---

*Hervovibe Platform — Version 1.0*
*Built by Digifame | digifame26@gmail.com*
