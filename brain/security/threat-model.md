# Project Threat Model — DEEP SHOP (Vibe Gadget)

## 1. Executive Summary
This document provides a systematic Threat Model for the DEEP SHOP / Vibe Gadget full-stack e-commerce, peer-to-peer marketplace, and community platform. It identifies critical assets, actors, trust boundaries, entry points, specific threats, attack scenarios, risk severities, existing mitigations, and identified security gaps based strictly on evidence in the codebase.

---

## 2. Core Assets
| Asset Category | Description & Location | Sensitivity |
| :--- | :--- | :--- |
| **Customer PII** | Full names, delivery addresses, phone numbers, emails (`users`, `orders`, `shippingAddress`) | **High** |
| **KYC / Identity Documents** | National ID (NID) photos, passport scans, verification statuses (`kyc_requests`, `users.kycStatus`) | **Critical** |
| **Financial & Transaction Records** | Payment receipts, bKash/Nagad/Rocket transaction IDs, bank slip uploads, deposit proofs (`orders`, `deposits`, `withdrawals`) | **Critical** |
| **Private Communications** | Direct buyer-seller 1-on-1 chats, voice notes, attachments, image transfers (`chats`, `p2p_chats`, `community_channels`) | **High** |
| **Admin & Platform Control** | Super admin credentials, product moderation, group inspector, word filter configuration (`settings`, `pages/admin/*`) | **Critical** |
| **Service Credentials & Keys** | Firebase Service Account JSON, VAPID Private Keys, SMTP passwords, ImgBB API keys, Telegram Bot tokens (`server.ts`, `services/*`, `.env`) | **Critical** |
| **User Wallet / Shopping Credits** | Coin balances, reward credits, referral rewards (`users.shoppingCoins`, `users.balance`) | **High** |

---

## 3. Trust Boundaries
```
+-----------------------------------------------------------------------------------+
| UNTRUSTED EXTERNAL ENVIRONMENT                                                    |
|  - Anonymous Internet Users                                                       |
|  - Web Crawlers & Automated Scanners                                              |
|  - Adversaries & Compromised Clients                                              |
+-----------------------------------------------------------------------------------+
                                  │
                                  ▼ [Boundary 1: HTTPS Web Entry Point]
+-----------------------------------------------------------------------------------+
| CLIENT BROWSER / PWA APPLET                                                        |
|  - React SPA (Vite + TypeScript)                                                  |
|  - Local Storage (auth cache, theme, pinned chats)                                 |
|  - IndexedDB / Service Worker Cache                                               |
+-----------------------------------------------------------------------------------+
        │                                                     │
        ▼ [Boundary 2: Direct Firebase SDK]                    ▼ [Boundary 3: Express REST API]
+------------------------------------+             +--------------------------------+
| GOOGLE CLOUD / FIREBASE INFRA      |             | FULL-STACK BACKEND (server.ts)  |
|  - Firebase Authentication         |             |  - Express.js HTTP Server      |
|  - Cloud Firestore (Rules Enforced)|             |  - Firebase Admin SDK          |
|  - Firebase Cloud Messaging        |             |  - Web Push (VAPID) Service    |
+------------------------------------+             |  - SMTP Nodemailer Relay       |
                                                   +--------------------------------+
                                                                   │
                                                                   ▼ [Boundary 4: 3rd Party APIs]
                                                   +--------------------------------+
                                                   | THIRD-PARTY INTEGRATIONS       |
                                                   |  - ImgBB Image API             |
                                                   |  - Telegram Bot API            |
                                                   |  - Steadfast Courier API       |
                                                   |  - WebPush Push Gateways       |
                                                   +--------------------------------+
```

---

## 4. Threat Actors & Personas
1. **Anonymous Attacker (External Unauthenticated)**: Attempts public enumeration, unauthenticated API scraping, SSRF via link preview, or automated spamming.
2. **Malicious Authenticated Buyer**: Attempts price tampering during checkout, fake transaction ID submission, reading other users' private messages or orders, bypassing review filters.
3. **Compromised / Rogue Seller**: Attempts unauthorized product uploads, exfiltrating buyer delivery details, or forging reviews.
4. **Disgruntled Group Admin**: Attempts abusing group admin status in community channels.
5. **Privileged Insider / Super Admin**: Manages full platform data, group inspection, user bans, and database records.

---

## 5. Entry Points & Attack Vectors
* **Frontend Web Routes**: React router endpoints (`/`, `/checkout`, `/messages`, `/admin/*`, `/cart`, `/payment`, `/kyc-verification`).
* **Backend Express API Endpoints**:
  * `POST /api/send-push-admin`, `POST /api/send-push-all`, `POST /api/send-push-user`, `POST /api/send-push-channel`
  * `POST /api/admin/change-password`, `POST /api/admin/delete-user`
  * `GET /api/link-preview?url=...`
  * `POST /api/notify-telegram`
  * `POST /api/lookup-auth-email`
  * `POST /api/reset-password-request`
  * `POST /api/gateway/sms`
  * `POST /api/ads/record`, `POST /api/ads/reward`
* **Direct Firestore Channels**: Direct Firestore WebChannel connections via client SDK.
* **Third-Party Callback & Webhook Vectors**: Image upload proxy via ImgBB, Telegram notification dispatch.

---

## 6. Threat Analysis & Specific Scenarios

### Threat 1: Missing Server-Side Authentication Verification on Administrative Backend Endpoints
* **Scenario**: An unauthenticated attacker discovers `/api/admin/change-password`, `/api/admin/delete-user`, or `/api/send-push-admin`. The request body is sent directly with target parameters (e.g. `{ "uid": "target_user_id", "newPassword": "compromisedPassword123" }`).
* **Impact**: Critical. Arbitrary user password reset, account deletion, or unauthorized system-wide push notification broadcast.
* **Likelihood**: High (if endpoints are exposed without network-level restrictions).
* **Severity**: **Critical**
* **Existing Mitigation**: Firestore direct admin operations are guarded by `firestore.rules`.
* **Missing Mitigation**: Backend Express endpoints do not validate the incoming Firebase ID Token (`Bearer <token>`) using `admin.auth().verifyIdToken()`.

---

### Threat 2: Overly Permissive Firestore Rules on Peer-to-Peer and Channel Messages
* **Scenario**: In `firestore.rules`, lines 100, 104, 109, 112, 117, 120 specify:
  ```
  match /p2p_chats/{chatId} { allow read, write: if isSignedIn() || isAdmin(); }
  match /p2p_chats/{chatId}/messages/{messageId} { allow read, write: if isSignedIn() || isAdmin(); }
  ```
  Any signed-in user can construct a Firestore query for any `chatId` and read or inject messages into another buyer/seller's private chat.
* **Impact**: High. Confidentiality and integrity breach of direct private messaging.
* **Likelihood**: High.
* **Severity**: **High**
* **Existing Mitigation**: Client-side UI queries filter by user UID (`where('participants', 'array-contains', user.uid)`).
* **Missing Mitigation**: Server-side rule check ensuring `request.auth.uid in resource.data.participants` or `request.auth.uid in request.resource.data.participants`.

---

### Threat 3: Server-Side Request Forgery (SSRF) via `/api/link-preview`
* **Scenario**: In `server.ts` line 443 (`app.get("/api/link-preview", ...)`), the server fetches the user-supplied `req.query.url` using `fetch(targetUrl)` without validating whether the URL resolves to internal/private IP ranges (e.g., `127.0.0.1`, `169.254.169.254`, GCP metadata server).
* **Impact**: High. Internal network enumeration or cloud instance metadata extraction.
* **Likelihood**: Medium.
* **Severity**: **High**
* **Existing Mitigation**: Generic timeout (`AbortController` 5s) and HTML parsing limitations.
* **Missing Mitigation**: IP address validation and private CIDR block blacklisting before invoking `fetch()`.

---

### Threat 4: Hardcoded API Key & Token Exposures in Client-Side Code
* **Scenario**: 
  - `services/imgbb.ts` (line 2) contains `IMGBB_API_KEY = "0af2a5cbe01e0fdb3a12e6a8b7efcc8d"`.
  - `services/telegram.ts` (line 9) contains fallback Telegram bot token `"8571639361:AAEuplHuF4mh6rkaCCWoC-D_c57Iho7rM8YY"`.
* **Impact**: Medium to High. Depletion of ImgBB quota by unauthorized third parties; potential unauthorized message dispatch via the Telegram bot.
* **Likelihood**: High (visible in compiled frontend bundle).
* **Severity**: **Medium**
* **Existing Mitigation**: Telegram token is loaded from Firestore `settings/platform` when available.
* **Missing Mitigation**: Uploads and Telegram notifications should be relayed exclusively through backend endpoints without embedding provider tokens in client code.

---

### Threat 5: Order Total & Payment Amount Manipulation
* **Scenario**: When an order is placed in `Checkout.tsx`, the order document is created via direct Firestore write from the client with the calculated `totalAmount`. A malicious user could tamper with the client request payload to submit an order with price `1 BDT`.
* **Impact**: High. Financial discrepancy between order value and actual item value.
* **Likelihood**: Medium.
* **Severity**: **High**
* **Existing Mitigation**: Admin manual order verification, screenshot/slip upload requirement.
* **Missing Mitigation**: Server-side order creation calculating product prices directly from the `products` database collection.

---

## 7. Threat Summary Matrix

| Threat ID | Threat Name | Likelihood | Impact | Severity | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TM-01** | Backend Admin Endpoint Unauthenticated Execution | High | Critical | **Critical** | Missing Control |
| **TM-02** | Firestore Chat & P2P Rules Data Leakage | High | High | **High** | Missing Control |
| **TM-03** | SSRF on `/api/link-preview` | Medium | High | **High** | Missing Control |
| **TM-04** | Client-Side Embedded Third-Party API Keys | High | Medium | **Medium** | Security Weakness |
| **TM-05** | Client-Initiated Order Price Creation | Medium | High | **High** | Potential Risk |
| **TM-06** | Word Filter Bypass via Unicode / Zero-Width Chars | Medium | Low | **Low** | Security Weakness |
