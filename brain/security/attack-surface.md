# Attack Surface Analysis — DEEP SHOP (Vibe Gadget)

## 1. Scope & System Architecture Overview
This document catalogs all reachable interfaces, entry points, APIs, user input parameters, data stores, third-party hooks, and administrative interfaces across the DEEP SHOP / Vibe Gadget platform.

---

## 2. HTTP & API Endpoint Surface

### 2.1 Backend Express REST Endpoints (`server.ts`)

| Endpoint | Method | Auth Requirement | Input Parameters | Purpose & Surface Risk |
| :--- | :--- | :--- | :--- | :--- |
| `/api/web-push/public-key` | `GET` | Public | None | Returns VAPID public key. Low risk. |
| `/api/web-push/subscribe` | `POST` | Public | `subscription: PushSubscription`, `userId?: string` | Stores web push subscription token. |
| `/api/send-push-user` | `POST` | Unchecked | `userId`, `title`, `body`, `url`, `icon` | Sends targeted push notification to specific user. |
| `/api/send-push-channel` | `POST` | Unchecked | `channelId`, `title`, `body`, `url` | Sends push notification to all subscribers of a channel. |
| `/api/send-push-admin` | `POST` | Unchecked | `title`, `body`, `url`, `orderId`, `type` | Sends push notifications to site administrators. |
| `/api/send-push-all` | `POST` | Unchecked | `title`, `body`, `url`, `icon` | Broadcasts push notification to all registered devices. |
| `/api/send-welcome-push` | `POST` | Unchecked | `userId`, `name` | Dispatches welcome notification to a newly registered user. |
| `/api/link-preview` | `GET` | Public | `url: string` (query param) | Fetches external URL metadata (title, image, description). **SSRF Surface**. |
| `/api/notify-telegram` | `POST` | Unchecked | `type`, `order`, `deposit`, `review`, `customMessage` | Formats and relays notification to Telegram chat. |
| `/api/admin/change-password` | `POST` | Unchecked | `uid`, `newPassword` | Directly invokes `admin.auth().updateUser(uid, { password })`. **Privileged Surface**. |
| `/api/admin/delete-user` | `POST` | Unchecked | `uid` | Directly invokes `admin.auth().deleteUser(uid)`. **Privileged Surface**. |
| `/api/lookup-auth-email` | `POST` | Public | `identifier: string` (phone or email) | Looks up user email from Firestore. User enumeration vector. |
| `/api/reset-password-request` | `POST` | Public | `email: string` | Generates Firebase password reset link and dispatches via Nodemailer. |
| `/api/ads/record` | `POST` | Public | `adId`, `userId`, `type` ('impression' \| 'click' \| 'watch') | Records advertisement engagement statistics. |
| `/api/ads/reward` | `POST` | Public | `adId`, `userId` | Credits shopping coins to user document. Potential reward manipulation vector. |
| `/api/ads/analytics` | `GET` | Public | None | Returns cached advertisement metrics. |
| `/api/gateway/sms` | `POST` | Unchecked | `phone`, `message` | Gateway SMS relay endpoint. |
| `*` (Catch-all) | `GET` | Public | URL path | Serves Vite SPA HTML/JS bundles. |

---

## 3. Database & Storage Surface (Cloud Firestore)

### 3.1 Collections & Rule Analysis (`firestore.rules`)

```
                                  CLOUD FIRESTORE
                                         │
    ┌────────────────┬───────────────────┼───────────────────┬────────────────┐
    ▼                ▼                   ▼                   ▼                ▼
[users]          [orders]         [p2p_chats]         [products]        [settings]
  Read: Public     Read: User Auth  Read: User Auth     Read: Public      Read: Public
  Write: Owner/Adm Write: Buyer/Adm Write: User Auth    Write: Seller/Adm Write: Admin
```

* **`users/{userId}`**:
  * Read: `public` (anyone can view profile, shop name, ratings).
  * Write: `isOwner(userId) || isAdmin()`.
* **`products/{productId}`**:
  * Read: `public`.
  * Write: `isAdmin() || isSeller()`.
* **`orders/{orderId}`**:
  * Read: `isSignedIn()` (any logged-in user).
  * Write: `isSignedIn()` (create), `isAdmin() || isSeller()` (update/delete).
* **`p2p_chats/{chatId}` & `chats/{chatId}`**:
  * Read/Write: `isSignedIn() || isAdmin()`. (Overly broad: does not enforce participant membership).
* **`community_channels/{channelId}`**:
  * Read/Write: `isSignedIn() || isAdmin()`.
* **`kyc_requests/{userId}`**:
  * Read/Write: `isOwner(userId) || isAdmin()`.
* **`deposits/{depositId}`**:
  * Read: `isOwner` or `isAdmin`.
  * Write: `isAdmin` (update/delete), `isSignedIn` (create).
* **`settings/{settingId}`**:
  * Read: `public`.
  * Write: `isAdmin()`.

---

## 4. User Input & Validation Surfaces

| Surface / Component | Input Source | Processing / Sanitization | Vulnerability Class / Risk |
| :--- | :--- | :--- | :--- |
| **Checkout Flow** (`Checkout.tsx`) | Shipping Address, Name, Phone, Note, Payment Method | Client-side form validation | Price tampering / invalid phone format |
| **P2P & Group Messaging** (`Messages.tsx`) | Chat message text, voice recordings, attachments, GIF URLs | Client word filter check (`checkContainsBannedWord`) | Incomplete client filter bypass |
| **Product Reviews** (`LeaveReview.tsx`) | Star rating, comment, uploaded review photo | `lib/reviewModeration.ts` scam filter | Review spamming / review spoofing |
| **KYC Submission** (`KycVerification.tsx`) | NID number, Full legal name, Front/Back photo uploads | Form state upload to ImgBB -> Firestore | PII upload to external third party |
| **Search Bar** (`Search.tsx`, `Header.tsx`) | Text query parameter | Regex and lowercase substring matching | Client resource consumption on long strings |
| **Link Preview Parser** (`server.ts`) | Query parameter `?url=...` | `fetch(url)` -> cheerio / DOM regex parsing | **SSRF (Server-Side Request Forgery)** |

---

## 5. File Upload Surfaces
* **Direct ImgBB API Upload** (`services/imgbb.ts`):
  * Invoked by: Product Reviews, KYC verification, Profile avatar change, Store banner update, Chat image attachments.
  * Mechanism: `POST https://api.imgbb.com/1/upload?key=...` with `FormData`.
  * Fallback: Local Base64 Data URL conversion if upload fails.
  * Risks:
    * Third-party PII storage (NID cards on external image host).
    * Client API key leakage.
    * Lack of MIME-type and magic-byte validation on the server.

---

## 6. Authentication & Session Surfaces
* **Primary Auth Provider**: Firebase Authentication (Email/Password, Google OAuth).
* **Secondary Local Locks**:
  * Biometric & PIN Passcode Lock (`localStorage.getItem('deepshop_biometric_pin')`).
  * Stored in client localStorage; does not encrypt underlying network traffic.
* **Role Verification Vectors**:
  * Admin check by Email match in client code: `user.email === 'deepshop@gmail.com' || 'goribsam2@gmail.com'`.
  * Admin check in Firestore security rules: token email list + `users/{uid}.role == 'admin'`.

---

## 7. Administrative & Privileged Surfaces (`pages/admin/*`)
The application contains over 30 administrative views:
1. `ManageGroups.tsx`: Live message inspection without joining, stealth message edit/delete, force member kick/promote.
2. `ManageUsers.tsx` / `ManageUsersMobile.tsx`: User role assignment, ban/unban, coin balance alteration.
3. `ManageOrders.tsx`: Order status update (Processing, Shipped, Delivered, Cancelled, Refunded).
4. `ManagePayments.tsx` / `ManageDeposits.tsx`: Manual payment verification, bank slip approval.
5. `ManageConfig.tsx`: Site-wide configuration, Telegram token/chat ID updates, platform fees.
6. `ManagePushNotifications.tsx`: Broadcast push notifications to all users.
7. `ManageFakeOrders.tsx`: Order generation simulator.

---

## 8. Third-Party Integration Reachability

```
┌───────────────────────────────────────────────────────────────────────────┐
│ DEEP SHOP PLATFORM                                                        │
│                                                                           │
│   ├──> Google Firebase (Auth, Firestore, FCM)                            │
│   ├──> ImgBB (Image Hosting)                                              │
│   ├──> Telegram Bot API (Order/Payment Notification Alerts)               │
│   ├──> Steadfast Courier API (Parcel Tracking & Dispatch)                 │
│   ├──> Web Push Services (Mozilla, Google FCM WebPush)                    │
│   └──> SMTP Server (Nodemailer Email Delivery)                            │
└───────────────────────────────────────────────────────────────────────────┘
```
