# Secrets & Key Management Review — DEEP SHOP (Vibe Gadget)

## 1. Scope & Objective
This document outlines where secrets, tokens, API keys, and credentials are expected, how they are stored and handled across client and server tiers, the risks of exposure, and recommendations for secure key lifecycle management.

---

## 2. Inventory of Expected & Discovered Secrets

| Secret / Identifier | Expected Location | Actual Observed Location | Exposure Scope | Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| **Firebase Service Account** | `process.env.FIREBASE_SERVICE_ACCOUNT` or `firebase-service-account.json` | `server.ts` checks environment var & local JSON | Server-side only (Protected) | **Low** (if env var kept private) |
| **VAPID Push Private Key** | `process.env.VAPID_PRIVATE_KEY` | `server.ts` checks env var, falls back to `vapid.json` / Firestore | Server-side only (Protected) | **Low** |
| **VAPID Push Public Key** | `process.env.VAPID_PUBLIC_KEY` | `server.ts` & exposed via `GET /api/web-push/public-key` | Public Client (Intended) | **None** |
| **SMTP Password (`SMTP_PASS`)** | `process.env.SMTP_PASS` | Referenced in `.env.example` / `server.ts` | Server-side only | **Low** |
| **ImgBB API Key** | Backend environment variable | Hardcoded in `services/imgbb.ts` (`0af2a5c...`) | Client-side Bundle (Exposed) | **High** |
| **Telegram Bot Token** | Backend environment variable / Firestore `settings/platform` | Hardcoded fallback in `services/telegram.ts` (`8571639361:AAEu...`) | Client-side Bundle (Exposed) | **High** |
| **Firebase Public Client Config** | `firebase.ts` | Hardcoded in `firebase.ts` (`apiKey: "AIzaSy..."`) | Client-side (Public by design) | **Low** (Relies on Firestore Rules) |
| **Google OAuth Client ID** | `process.env.VITE_GOOGLE_CLIENT_ID` | Referenced in `.env.example` / client auth | Public Client (Intended) | **None** |

---

## 3. Detailed Findings with Code Evidence

### Finding S-01: Hardcoded ImgBB API Key in Frontend Service
* **Severity**: **High**
* **Evidence**: File `services/imgbb.ts` line 2:
  ```typescript
  const IMGBB_API_KEY = "0af2a5cbe01e0fdb3a12e6a8b7efcc8d";
  ```
* **Risk**: The API key is compiled directly into the client-side JavaScript bundle. Any visitor or external scraper can inspect network traffic or bundle assets to extract the key, using it to upload arbitrary files or exhausting the project's upload quota.
* **Affected Location**: `services/imgbb.ts` (lines 2-10).
* **Recommended Fix**: Remove the key from client-side code. Implement a backend proxy endpoint (e.g. `POST /api/upload-image`) where the ImgBB or Cloudinary API key is kept strictly in server-side environment variables.

---

### Finding S-02: Hardcoded Telegram Bot Token in Frontend Service
* **Severity**: **High**
* **Evidence**: File `services/telegram.ts` lines 9-11 & line 22:
  ```typescript
  let token = data.telegramToken || "8571639361:AAEuplHuF4mh6rkaCCWoC-D_c57Iho7rM8YY";
  ...
  return {
    token: "8571639361:AAEuplHuF4mh6rkaCCWoC-D_c57Iho7rM8YY",
    chatIds: ["5494141897"]
  };
  ```
* **Risk**: The Telegram Bot authentication token is exposed in the frontend bundle. An adversary can use this token to query bot updates, send spoofed messages, delete webhook configurations, or disrupt administrator notification channels.
* **Affected Location**: `services/telegram.ts` (lines 4-25).
* **Recommended Fix**: Dispatch all Telegram notifications exclusively via the backend endpoint `POST /api/notify-telegram` in `server.ts`, reading the token from `process.env.TELEGRAM_BOT_TOKEN`.

---

### Finding S-03: Local File Generation of VAPID Keys in Serverless / Container Fallbacks
* **Severity**: **Low**
* **Evidence**: File `server.ts` lines 105-112:
  ```typescript
  const vapidPath = getLocalFilePath("vapid.json");
  if (fs.existsSync(vapidPath)) {
      try { keysToUse = JSON.parse(fs.readFileSync(vapidPath, "utf-8")); } catch(e) {}
  }
  if (!keysToUse) {
      keysToUse = webpush.generateVAPIDKeys();
      safeWriteFileSync(vapidPath, JSON.stringify(keysToUse, null, 2));
  }
  ```
* **Risk**: In ephemeral serverless environments (like Vercel or AWS Lambda), temporary filesystem writes to `vapid.json` are lost on instance recycle, leading to regenerated VAPID keys that invalidate existing client push subscriptions.
* **Affected Location**: `server.ts` (lines 86-129).
* **Recommended Fix**: Explicitly supply `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in deployment environment variables rather than relying on automatic local file creation.

---

## 4. Client-Side vs Server-Side Secrets Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND BUNDLE (Vite / React SPA) - UNTRUSTED ENVIRONMENT              │
│  - Public Firebase Config (apiKey, projectId, appId)      [OK]          │
│  - VAPID Public Key (via GET /api/web-push/public-key)    [OK]          │
│  - Google Client ID (VITE_GOOGLE_CLIENT_ID)               [OK]          │
│  - ImgBB API Key                                          [VIOLATION]   │
│  - Telegram Bot Token Fallback                            [VIOLATION]   │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ BACKEND SERVER (Node.js / Express) - TRUSTED ENVIRONMENT                │
│  - FIREBASE_SERVICE_ACCOUNT (Private Key JSON)            [SECURE]      │
│  - VAPID_PRIVATE_KEY                                      [SECURE]      │
│  - SMTP_PASS & SMTP_USER                                  [SECURE]      │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Git & Repository Exposure Controls
* `.gitignore` configuration must ensure the following patterns are strictly ignored:
  * `.env`
  * `.env.local`
  * `*.pem`
  * `firebase-service-account.json`
  * `vapid.json`
  * `local_db/`

---

## 6. Secret Rotation & Emergency Plan
1. **Compromised Telegram Token**:
   * Revoke existing token immediately via Telegram `@BotFather` (`/revoke`).
   * Update server environment variable `TELEGRAM_BOT_TOKEN`.
2. **Compromised ImgBB Key**:
   * Generate new API key in ImgBB developer portal.
   * Move key to backend environment variable.
3. **Compromised Firebase Service Account**:
   * Access Google Cloud Console -> IAM & Admin -> Service Accounts.
   * Delete compromised private key.
   * Create new key and update `FIREBASE_SERVICE_ACCOUNT` in deployment environment.
