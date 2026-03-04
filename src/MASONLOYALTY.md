# End-to-End Flow: Mason Loyalty Program, TSO Approval, and Backend Routes

This document provides a detailed breakdown of the complete Mason Loyalty Program lifecycle, focusing on the contractor's experience and the corresponding transactional logic and approval checkpoints handled by your Express.js backend.

-----

## I. Onboarding, Registration, and Verification (Pre-Earning)

This phase establishes the Mason's identity and eligibility for the scheme, enforced by mandatory KYC validation.

| Flow Step & User Action | Backend Route (Method) | Tables Involved | Key Backend Logic & Status Change |
| :--- | :--- | :--- | :--- |
| **1. Mason Registration** | `POST /api/masons` | `masonPcSide`, `pointsLedger` | **Atomic Transaction (Credit):** A Mason profile is created (e.g., by a TSO). The logic calculates a **`joiningBonus`**, sets the initial `pointsBalance` to that bonus, and immediately inserts a corresponding **credit record** into the `pointsLedger` to document the source of the points. |
| **2. Scheme Enrollment** | `POST /api/masons-on-scheme` | `masonOnScheme` | Mason opts into a specific loyalty scheme. Logic handles foreign key checks and returns **409 Conflict** if the Mason is already enrolled. |
| **3. KYC Submission** | `POST /api/kyc-submissions` | `kycSubmissions`, `masonPcSide` | **Atomic Transaction:** Inserts the detailed submission record. Crucially, it updates the primary `masonPcSide.kycStatus` to **'pending'**, gating future earning and redemption access until approval. |
| **4. TSO KYC Approval** | `PATCH /api/kyc-submissions/:id` | `kycSubmissions`, `masonPcSide` | TSO action. **Atomic Transaction:** Updates the specific submission record's status. The core logic ensures the main `masonPcSide.kycStatus` is updated to **'approved'** or **'rejected'** to unlock the full application features. |

-----

-----

## II. Earning Points: The TSO Approval Loop (The Core Logic)

The heart of the program is the double-verification system: points are calculated on submission but only credited upon TSO approval.

| Flow Step & User Action | Backend Route (Method) | Tables Involved | Key Backend Logic & Point Flow |
| :--- | :--- | :--- | :--- |
| **5. Bag Lift Submission** | `POST /api/bag-lifts` | `bagLifts` | Creates a new record with `status: 'pending'`. **Server-Side Calculation:** Points are immediately calculated using `calculateBaseAndBonanzaPoints` and stored in the **`pointsCredited`** column, but **not yet applied** to the Mason's balance. |
| **6. TSO Bag Lift Approval** | `PATCH /api/bag-lifts/:id` | `bagLifts`, `pointsLedger`, `masonPcSide` | **(Protected by `tsoAuth`)<br>Atomic Transaction (Credit):**<br>1. Updates `bagLifts.status` to **'approved'**.<br>2. Inserts a **POSITIVE** ledger entry for Base/Bonanza points.<br>3. **Calculates & applies Extra Bonus** for slab crossing; inserts a *separate* ledger entry if applicable.<br>4. **Checks & applies Referral Bonus** to the *referrer's* account, inserting a *third* ledger entry.<br>5. Atomically updates `masonPcSide.pointsBalance` and increments `bagsLifted`. |
| **7. TSO Rejection/Unwind** | `PATCH /api/bag-lifts/:id` | `bagLifts`, `pointsLedger`, `masonPcSide` | **(Protected by `tsoAuth`)<br>Atomic Transaction (Debit/Unwind):**<br>1. If reversing a previous approval, inserts a **NEGATIVE** debit/adjustment record into `pointsLedger`.<br>2. Reduces `masonPcSide.pointsBalance` and `bagsLifted` using atomic subtraction to reverse the initial credit. |
| **8. View Submission Status** | `GET /api/bag-lifts/mason/:masonId` | `bagLifts` (Joined with `masonPcSide`, `dealers`, `users`) | Allows the Mason to track their submissions by status: `pending`, `approved`, or `rejected`. Includes joins to show dealer and approver names. |
| **9. Account Statement** | `GET /api/points-ledger/mason/:masonId` | `pointsLedger` | **(Protected by `tsoAuth`)**<br>The single source of truth for all point movements (+/-) derived from approved lifts, redemptions, and adjustments. |

-----

-----

## III. Redemption and Fulfillment Phase

This phase allows the Mason to utilize their earned points, which triggers an immediate atomic debit, followed by manual administrative fulfillment.

| Flow Step & User Action | Backend Route (Method) | Tables Involved | Key Backend Logic & Status Change |
| :--- | :--- | :--- | :--- |
| **10. View Catalogue** | `GET /api/rewards` | `rewards`, `rewardCategories` | Fetches the live reward catalogue, with details like `pointCost` and `stock`, joined with category names and filtered by `isActive` status. |
| **11. Place Redemption Order** | `POST /api/rewards-redemption` | `rewardRedemptions`, `pointsLedger`, `masonPcSide` | **Atomic Transaction (Debit):**<br>1. **Critical Check:** Validates `masonPcSide.pointsBalance` against the total cost.<br>2. Creates order in `rewardRedemptions` with status **'placed'**.<br>3. Inserts a **NEGATIVE** debit record into `pointsLedger` linking to the redemption ID.<br>4. Atomically updates `masonPcSide.pointsBalance` (debit). |
| **12. View Order History** | `GET /api/rewards-redemption/mason/:masonId` | `rewardRedemptions` | Mason views their orders and their current fulfillment status, joined with reward item names. |
| **13. Fulfillment Tracking (TSO/Admin)** | `PATCH /api/rewards-redemption/:id` | `rewardRedemptions` | **(Protected by `tsoAuth`)**<br>TSO/Admin tool. Used to manually update the order's status through its lifecycle (`'placed'` → `'approved'` → `'shipped'` → `'delivered'`). **No financial transaction occurs here** as the points were already debited in Step 11. |

-----

-----

## IV. Administrative & TSO Routes

These routes support TSO/Admin roles for managing the scheme's resources, participants, and related field activities.

| Route (Method) | Purpose | Data Access Example |
| :--- | :--- | :--- |
| `POST /api/points-ledger` | **Manual Point Adjustment** | **(Protected by `tsoAuth`)**<br>TSO manually credits/debits points via an atomic transaction, updating `pointsLedger` and `masonPcSide.pointsBalance`. |
| `GET /api/points-ledger` | **Audit/Reconciliation** | **(Protected by `tsoAuth`)**<br>View the *entire* ledger of point movements across all participants for audit purposes. |
| `POST /api/dealers` | **Dealer Creation** | Create a new dealer, which also makes a call to an external service (Radar) to create a geofence for that dealer. |
| `PATCH /api/dealers/:id` | **Dealer Update** | Update dealer details; also triggers a `PUT` request to the Radar geofence service to keep it in sync. |
| `GET /api/masons` | **Mason Master List** | Fetch a full list of all Mason/Contractor profiles, joined with Dealer and TSO names for TSO dashboards. |
| `PATCH /api/rewards/:id` | **Catalogue Maintenance** | Adjust `stock`, `pointCost`, or toggle `isActive` status of a gift. |
| `GET /api/rewards-redemption` | **Order Management (Admin)** | Fetch a list of all redemption orders for fulfillment processing, filtered by status (`'placed'`). |
| `GET /api/pjp` | **View Journey Plans** | TSO views Permanent Journey Plans, filterable by user, dealer, or date. |
| `GET /api/daily-visit-reports` | **View Visit Reports** | TSO views Daily Visit Reports (DVRs), filterable by user, dealer, or date range. |


-----------------------------

### ROUTES EXPLAINED - GET / POST / PATCH|PUT 
## MASON LOYALTY + TSO APPROVAL FLOW

## GET ROUTES 


Specifically for your **Mason - Rewards - Redemption - Gifts** flow, here is the confirmation:

1.  **👀 View Rules:** `schemeSlabs.ts` correctly fetches the rules ("100 Bags = 650 Pts") and joins with the `rewards` table to show the Item Name/Image if a specific gift is attached.
2.  **🏆 View Progress:** `masonSlabAchievements.ts` correctly joins `schemesOffers` so the Mason sees *"Chaar ka Vaar - Level 1 Completed"*.
3.  **🛍️ Shop:** `rewards.ts` provides the full catalog with categories.
4.  **📦 Order History:** `rewardsRedemption.ts` tracks the status (Placed -> Approved -> Delivered).
5.  **💰 Bank Statement:** `pointsLedger.ts` tracks the `+` and `-` of points.

-----

## POST ROUTES 

Here is the breakdown of why your implementation is safe and robust:

### 1. 🧱 Mason Creation (`masonpcSide.ts`)
* **Logic:** Create Mason + Give Joining Bonus + Record in Ledger.
* **Verdict:** **Correct.** You used a transaction to ensure the Mason starts with the correct `pointsBalance` and the Ledger has the corresponding entry.

### 2. 🛍️ Redeeming Rewards (`rewardsRedemption.ts`)
* **Logic:**
    1.  **Check Stock:** You ensure `stock >= quantity` before proceeding (prevents ordering out-of-stock items).
    2.  **Deduct Points Immediately:** You debit the Mason's balance inside the POST request transaction.
    3.  **Delay Stock Deduction:** You deliberately *do not* deduct stock here (as noted in your comments), leaving that for the **TSO Approval (PATCH)** step.
* **Verdict:** **Correct.** This prevents "Double Spending" (ordering multiple items with the same points) while allowing TSOs to manage physical inventory assignment later.

### 3. 🏆 Achievements (`masonSlabAchievements.ts`)
* **Logic:** Record Achievement + Credit Points + Record in Ledger.
* **Verdict:** **Correct.** Using a transaction here is crucial. If the server crashed after "Recording Achievement" but before "Crediting Points," the user would have the badge but not the money. Your code prevents this.

### 4. 📋 Schemes & Slabs (`schemesOffers.ts`, `schemeSlabs.ts`)
* **Logic:** Simple record creation.
* **Verdict:** **Correct.** No transaction needed as these are just rules, not financial actions.

### 5. 🏗️ Bag Lifts (`bagsLift.ts`)
* **Logic:** Calculate Points -> Save as `Pending`.
* **Verdict:** **Correct.** You are **not** crediting the balance yet. You are saving the *calculated potential points* in the `bag_lifts` table. The actual credit will happen when the TSO approves this record (in your PATCH route).

### 🔍 Summary Checklist

| Route | Financial Impact? | Transaction Used? | Status |
| :--- | :--- | :--- | :--- |
| **POST /masons** | Yes (Joining Bonus) | ✅ Yes | **Safe** |
| **POST /rewards-redemption** | Yes (Debit Points) | ✅ Yes | **Safe** |
| **POST /mason-slab-achievements** | Yes (Credit Points) | ✅ Yes | **Safe** |
| **POST /points-ledger** | Yes (Manual Adjust) | ✅ Yes | **Safe** |
| **POST /bag-lifts** | No (Pending Approval) | No (Not needed yet) | **Safe** |
| **POST /schemes-offers** | No | No | **Safe** |


## UPDATE ROUTES 

You have correctly implemented the "Two-Step" logic:
1.  **User Action (POST):** Initiates the request (holds points or sets pending status).
2.  **TSO Action (PATCH):** Finalizes the financial/inventory impact (deducts stock, credits valid points, updates global status).

Here is the detailed breakdown of the approval flows:

### 1. 🏗️ Bag Lift Approval (`bagsLift.ts`)
This is the most complex route, and you handled it correctly.
* **Scenario: Approval (Pending → Approved)**
    * ✅ **Transaction Used:** Yes.
    * ✅ **Main Points:** Credits the Mason's balance and adds a Ledger entry.
    * ✅ **Stats:** Updates the Mason's `bagsLifted` count (crucial for levels).
    * ✅ **Bonuses:** Correctly calculates and awards **Extra Slab Bonuses** and **Referral Bonuses** if thresholds are crossed.
* **Scenario: Rejection (Approved → Rejected)**
    * ✅ **Reversal:** It correctly *debits* the points and *reduces* the bag count, effectively undoing the transaction.

### 2. 🛍️ Reward Order Approval (`rewardsRedemption.ts`)
* **Scenario: Approval (Placed → Approved)**
    * ✅ **Inventory Check:** It checks `stock >= quantity` *again* to be safe.
    * ✅ **Stock Deduction:** This is the exact moment physical stock is removed from the DB. (Points were already taken in the POST route, which is correct).
* **Scenario: Rejection (Any → Rejected)**
    * ✅ **Refunds:** It correctly calculates the points to refund and adds them back to the Mason's balance.
    * ✅ **Stock Return:** If the item was already approved (stock deducted), rejecting it *adds the stock back*. This is excellent edge-case handling.

### 3. 🆔 KYC Verification (`kycSubmission.ts`)
* **Logic:** Updates the submission status AND the Mason's profile status.
* **Verdict:** **Correct.** It keeps the Mason's profile (`masonPcSide.kycStatus`) in sync with their latest submission.

### 🔍 Final Verdict
Your `PATCH` routes are safe to deploy. They handle:
1.  **Race Conditions** (via SQL increments/decrements).
2.  **Data Integrity** (via Transactions).
3.  **Financial Accuracy** (Refunds and Stock returns are handled).
