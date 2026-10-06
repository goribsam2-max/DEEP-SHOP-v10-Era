# Comprehensive Security Checklist & Audit Findings — DEEP SHOP (Vibe Gadget)

## 1. Executive Summary & Assessment Criteria
This document provides a comprehensive security checklist and actionable audit findings covering 20 core security domains across the DEEP SHOP (Vibe Gadget) full-stack codebase.

Each critical finding is structured as:
`Severity → Evidence → Risk → Affected location → Why it matters → Recommended fix`

Findings are strictly classified under:
* **[Confirmed Vulnerability]**: Verifiable security flaw present in the code.
* **[Security Weakness]**: Fragile or suboptimal security architecture.
* **[Missing Control]**: Standard defense-in-depth measure that is absent.
* **[Potential Risk Requiring Verification]**: Architecture pattern requiring environmental or operational verification.
* **[Recommendation]**: Best-practice enhancement.

---

## 2. 20-Domain Security Checklist

### 1. Authentication
* [x] Firebase Authentication integrated for email/password and Google OAuth.
* [ ] **[Missing Control]** Multi-Factor Authentication (MFA/2FA) not enforced for Super Admin accounts.
* [ ] **[Confirmed Vulnerability]** Backend endpoints `/api/admin/change-password` and `/api/admin/delete-user` execute privileged user modifications without verifying a caller's Firebase Auth ID token.

> **Finding SEC-01 [Confirmed Vulnerability]**
> * **Severity**: **Critical**
> * **Evidence**: `server.ts` lines 629–645 (`/api/admin/change-password`) and lines 667–680 (`/api/admin/delete-user`):
>   ```typescript
>   app.post("/api/admin/change-password", express.json(), async (req, res) => {
>     const { uid, newPassword } = req.body;
>     await admin.auth().updateUser(uid, { password: newPassword });
>     res.json({ success: true });
>   });
>   ```
> * **Risk**: Any unauthenticated remote client can post a JSON payload containing an arbitrary user's `uid` and take over or delete any customer, seller, or administrator account.
> * **Affected Location**: `server.ts` (lines 629–685).
> * **Why it matters**: Direct account takeover and database destruction without credential requirement.
> * **Recommended Fix**: Add a middleware that extracts `req.headers.authorization`, verifies the caller's Firebase ID token using `admin.auth().verifyIdToken()`, and asserts that the caller's email matches an authorized Super Admin before executing.

---

### 2. Authorization & Role-Based Access Control (RBAC)
* [x] Client-side admin routes guarded in UI (`currentUser?.role === 'admin' || currentUser?.email === 'deepshop@gmail.com'`).
* [x] Firestore security rules enforce `isAdmin()` for settings and blog writes.
* [ ] **[Confirmed Vulnerability]** Firestore rules for direct messages and peer-to-peer chats do not restrict read/write access to conversation participants.

> **Finding SEC-02 [Confirmed Vulnerability]**
> * **Severity**: **High**
> * **Evidence**: `firestore.rules` lines 100, 104, 109, 112:
>   ```
>   match /chats/{chatId} { allow read, write: if isSignedIn() || isAdmin(); }
>   match /chats/{chatId}/messages/{messageId} { allow read, write: if isSignedIn() || isAdmin(); }
>   match /p2p_chats/{chatId} { allow read, write: if isSignedIn() || isAdmin(); }
>   match /p2p_chats/{chatId}/messages/{messageId} { allow read, write: if isSignedIn() || isAdmin(); }
>   ```
> * **Risk**: Any authenticated customer can construct a Firestore query for arbitrary chat IDs and read private conversations, voice notes, transaction confirmations, or post fake messages.
> * **Affected Location**: `firestore.rules` (lines 98–114).
> * **Why it matters**: Violates confidentiality and privacy of buyer-seller negotiations and private customer support.
> * **Recommended Fix**: Update the rule to require that `request.auth.uid in resource.data.participants` or `request.auth.uid in request.resource.data.participants`.

---

### 3. Session & Token Security
* [x] Firebase Authentication SDK manages ID token refresh and local storage tokens securely.
* [ ] **[Security Weakness]** Client-side Biometric PIN lock is stored as plaintext PIN in `localStorage` (`localStorage.setItem('deepshop_biometric_pin', pin)` in `BiometricSetup.tsx`).
* [ ] **[Recommendation]** Hash PIN with a cryptographic salt (e.g., SHA-256 via Web Crypto API) before storing in browser storage.

---

### 4. Input Validation & Sanitization
* [x] Banned word filter implemented (`lib/wordFilter.ts`).
* [x] Scam review moderation filter implemented (`lib/reviewModeration.ts`).
* [ ] **[Security Weakness]** Word filter is enforced primarily on the client side; direct Firestore writes can bypass client validation.
* [ ] **[Recommendation]** Implement Firestore Cloud Functions or server-side triggers for message and review text sanitation.

---

### 5. Injection Prevention (SQL / NoSQL / Command Injection)
* [x] No raw SQL queries or string concatenation in database operations (Cloud Firestore Document SDK used throughout).
* [x] No dynamic shell command execution (`child_process.exec`) with user input in `server.ts`.

---

### 6. XSS & CSRF Defenses
* [x] React JSX automatically escapes dynamic expressions, mitigating standard reflected XSS.
* [x] No unsafe `dangerouslySetInnerHTML` injections in user-generated chat or review text components.
* [ ] **[Potential Risk Requiring Verification]** Link previews parse raw OpenGraph metadata HTML strings from external servers in `server.ts`.

---

### 7. API Security & Server-Side Request Forgery (SSRF)
* [ ] **[Confirmed Vulnerability]** Unrestricted URL fetching in `/api/link-preview` allows Server-Side Request Forgery (SSRF).

> **Finding SEC-03 [Confirmed Vulnerability]**
> * **Severity**: **High**
> * **Evidence**: `server.ts` lines 443–465:
>   ```typescript
>   app.get("/api/link-preview", async (req, res) => {
>     const targetUrl = req.query.url as string;
>     const response = await fetch(targetUrl, { signal: controller.signal });
>     const html = await response.text();
>   });
>   ```
> * **Risk**: An attacker can supply internal URLs (e.g. `http://127.0.0.1:3000`, `http://169.254.169.254/computeMetadata/v1/`) causing the backend server to make requests to internal services or cloud metadata APIs.
> * **Affected Location**: `server.ts` (lines 443–518).
> * **Why it matters**: Can lead to cloud infrastructure credential leakage or internal port scanning.
> * **Recommended Fix**: Validate protocols (`http:`, `https:` only), resolve domain DNS to IP, and reject private/loopback/link-local IP addresses (e.g. `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`, `169.254.0.0/16`) before initiating `fetch()`.

---

### 8. Rate Limiting & Abuse Prevention
* [ ] **[Missing Control]** Express server lacks rate-limiting middleware (`express-rate-limit`) on sensitive endpoints (`/api/reset-password-request`, `/api/ads/reward`, `/api/send-push-*`, `/api/gateway/sms`).
* [ ] **[Security Weakness]** `/api/ads/reward` allows unbounded shopping coin increment requests if called in an automated loop.
* [ ] **[Recommended Fix]** Install and mount `express-rate-limit` on all `/api/*` routes, with strict limits on auth, sms, and reward endpoints.

---

### 9. File Uploads & Media Handling
* [ ] **[Security Weakness]** Client-side upload directly to ImgBB (`services/imgbb.ts`) using an embedded API key.
* [ ] **[Security Weakness]** National ID (NID) and KYC document images uploaded to public third-party image host (ImgBB) instead of private cloud storage with signed URLs.
* [ ] **[Recommended Fix]** Transition KYC and identity uploads to private Firebase Storage with Firestore Security Rules restricting read access strictly to the document owner and verified administrators.

---

### 10. Database Security & Integrity
* [x] Firestore security rules configured in `firestore.rules`.
* [ ] **[Potential Risk Requiring Verification]** Orders collection allows all signed-in users to read all orders (`firestore.rules` line 86: `allow read: if isSignedIn();`).
* [ ] **[Recommended Fix]** Restrict order reading to: `allow read: if isAdmin() || (isSignedIn() && (resource.data.userId == request.auth.uid || resource.data.sellerId == request.auth.uid));`.

---

### 11. Secrets Management
* [ ] **[Confirmed Vulnerability]** Hardcoded API keys in client-side code (`services/imgbb.ts` line 2, `services/telegram.ts` line 9).
* [x] Server-side Firebase service account loaded from environment variable (`FIREBASE_SERVICE_ACCOUNT`).
* [ ] **[Recommended Fix]** Move ImgBB API key and Telegram bot tokens exclusively to server-side environment variables.

---

### 12. Encryption & Transport Security
* [x] HTTPS enforced across deployment runtimes (Vercel / Cloud Run).
* [x] Database in transit and at rest encrypted by Google Cloud Firestore.

---

### 13. CORS & HTTP Security Headers
* [ ] **[Missing Control]** Express backend does not set security response headers (e.g. `helmet`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`).
* [ ] **[Recommendation]** Add `helmet` middleware in `server.ts` to attach standard defense-in-depth HTTP headers.

---

### 14. Dependency Security
* [x] Modern npm dependencies specified in `package.json`.
* [ ] **[Recommendation]** Schedule automated vulnerability scanning using `npm audit` in CI/CD pipeline.

---

### 15. Logging & Audit Trails
* [x] Super Admin live message inspection streams without joining groups.
* [ ] **[Missing Control]** Lack of persistent server-side audit logs for administrative actions (e.g., when a user is kicked, banned, or password changed).
* [ ] **[Recommendation]** Write audit log records to an immutable `admin_audit_logs` collection in Firestore whenever administrative endpoints are triggered.

---

### 16. Admin Panel Security
* [x] Multi-tier Super Admin verification in frontend components.
* [x] Hardcoded authorized administrator email whitelist (`deepshop@gmail.com`, `goribsam2@gmail.com`).
* [ ] **[Missing Control]** Admin action authentication is not cryptographically validated on the backend Express routes.

---

### 17. Deployment & Infrastructure
* [x] Supports containerized deployment (Cloud Run, Docker) and serverless deployment (Vercel).
* [x] Environment variable fallback isolation for ephemeral filesystem writes (`os.tmpdir()`).

---

### 18. Data Privacy & Compliance
* [x] Privacy Policy, Terms of Service, Cookie Policy, Refund Policy accessible to users.
* [ ] **[Security Weakness]** User public read rule on `users/{userId}` allows unauthenticated visitors to scrape user list metadata.

---

### 19. Error Handling & Information Disclosure
* [x] Production build strips stack traces from standard API JSON responses.
* [ ] **[Security Weakness]** Error messages in `server.ts` occasionally log full error objects to stdout.

---

### 20. Backup & Disaster Recovery
* [x] Cloud Firestore provides automatic managed replication and point-in-time recovery capabilities on Google Cloud Platform.
* [ ] **[Recommendation]** Configure automated daily Firestore export backups to Google Cloud Storage (GCS).

---

## 3. Prioritized Remediation Roadmap

| Priority | Finding ID | Domain | Action Item |
| :--- | :--- | :--- | :--- |
| **P0 (Immediate)** | **SEC-01** | Backend Auth | Add Firebase ID token verification middleware to all `/api/admin/*` and `/api/send-push-*` routes. |
| **P0 (Immediate)** | **SEC-02** | Firestore Rules | Scope `p2p_chats` and `orders` read/write rules to conversation/order participants only. |
| **P1 (High)** | **SEC-03** | API Security | Implement private IP filtering and URL validation in `/api/link-preview` to eliminate SSRF. |
| **P1 (High)** | **S-01, S-02** | Secrets | Move ImgBB API key and Telegram bot tokens from frontend files to backend proxy routes. |
| **P2 (Medium)** | **SEC-04** | Abuse / Rate Limit | Add `express-rate-limit` on reward, password reset, and notification endpoints. |
| **P2 (Medium)** | **SEC-05** | Privacy | Move KYC NID card uploads from public image hosts to private storage with signed URL access. |
