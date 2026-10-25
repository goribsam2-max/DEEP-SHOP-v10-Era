# Zero-Storage Social Video Embeds & Clean On-Demand Category Drawer

Streamline News Hub post creation so videos play directly from YouTube, Facebook, and TikTok CDNs without consuming any Firebase Storage or slowing down the backend, while cleaning up the Create Post composer so the Category & Topics selector only appears when tapped from the bottom toolbar.

### User Review & Critical Decisions

> [!IMPORTANT]
> Both product and UX choices below reflect your confirmed preferences and keep the News Hub feed fast, lightweight, and clutter-free.

- **Confirmed Decision 1 — Social Video Links Only (Zero File Upload)**: Direct video file uploads to Firebase Storage and the backend server will be completely removed. Users can share videos by pasting YouTube, Facebook, or TikTok links (either directly in the post caption or in the Video Link panel), keeping server bandwidth and storage usage at zero while preserving instant feed embedding, viewport autoplay, play/pause, and forward/backward seeking.
- **Confirmed Decision 2 — On-Demand Category & Topics Selector**: The permanently visible Category & Topics card in the Create Post composer will be removed, eliminating the duplicate category UI. Category & Topics selection (including group filters and topic chips) will open exclusively when the user taps the Category icon in the bottom floating toolbar, and close cleanly when tapped again.

---

### 1. Overview & Core Concept

- **What It Does**:
  1. **Zero-Storage Social Video Posting**: Removes device video file upload controls, backend video storage endpoints, and Firebase Storage video upload logic. Users simply paste a YouTube (Watch/Shorts/Live), Facebook (Video/Watch/Reel/Share), or TikTok link with their caption to embed a playable, autoplaying video directly in the News Hub feed.
  2. **Clean, Single-Source Category Drawer**: Removes the always-visible Category & Topics block from the Create Post form and unifies all category group tabs and topic selection chips inside the single bottom-toolbar toggle panel.
- **Target Audience / Persona**: News Hub community members and admins sharing tech updates, discussions, and scam alerts on mobile and desktop without experiencing slow uploads or cluttered composer forms.
- **Key Value**: Protects Firebase Storage quotas and backend memory/CPU from heavy video binaries, ensures instant video streaming via global platform CDNs, and gives the Create Post screen a clean, focused writing experience.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Posting a Social Video with Caption**:
     - The user opens Create Post and types a caption along with a YouTube, Facebook, or TikTok link directly in the text area — or taps the Video icon in the bottom toolbar to paste a link in the dedicated link input.
     - As soon as a valid video link is pasted, short share links (`vt.tiktok.com`, `vm.tiktok.com`, `fb.watch`, `facebook.com/share/...`) automatically resolve and render a live embedded video preview right inside the composer.
     - Once published, the video appears embedded directly in the News Hub feed card, autoplays muted when scrolled into view, pauses when scrolled away, and lets viewers play, pause, scrub/seek forward and backward, unmute, or enter fullscreen without leaving the site.
  2. **Selecting Categories on Demand**:
     - When opening Create Post, the composer shows only the clean author header, caption area, and bottom floating action toolbar — no permanent Category & Topics box taking up vertical space.
     - Tapping the Category icon in the bottom toolbar smoothly opens a single unified Category & Topics drawer containing group filter tabs (`All` + topic groups) and selectable topic buttons. Tapping the toolbar icon again (or tapping the close button) hides the drawer.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Clean, touch-first mobile social sheet expanding gracefully on desktop, prioritizing open writing space and thumb-zone ergonomics.
  - *Color Palette & Mood*: Crisp neutral white/dark-zinc sheet surfaces (`60%` canvas, `30%` subtle `#F5F7FA` / `zinc-800` drawer surfaces) paired with `#1877F2` primary action accents (`10%` accent budget) and high-contrast `zinc-950` video theater frames.
  - *Typography & Hierarchy*: Clear `16px`–`22px` readable post prose, `12px`–`13px` single-line (`whitespace-nowrap`) interactive filter buttons, and `tabular-nums` timecodes on video playback controls.
  - *Component Styling & Layout*: Minimum `44px × 44px` touch hitboxes across bottom toolbar triggers in the natural thumb reach zone; single-elevation rounded containers (`rounded-3xl`) with zero duplicate nested cards; vertical (`9:16`) framing for Shorts, Reels, and TikToks vs. widescreen (`16:9`) framing for standard videos.
- **Interactive Feedback & Motion**:
  - Sub-200ms active press feedback (`active:scale-95`) and haptic response on toolbar toggles, category selections, and player seek buttons.
  - Active indicator highlight on the Category toolbar button whenever the Category drawer is open, and on the Video toolbar button whenever a video link is embedded or the Video Link panel is open.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: External CDN Embeds Only vs. Backend / Firebase Video Hosting**
  - *Chosen Approach*: Accept YouTube, Facebook, and TikTok links exclusively and stream directly via their official embed players; remove all binary video upload endpoints and Firebase Storage video upload helpers.
  - *Why*: Video files quickly exhaust Firebase Storage free/paid quotas and tie up Node.js memory and disk I/O during uploads and byte-range streaming. Delegating video delivery to YouTube, Facebook, and TikTok CDNs keeps post documents tiny (storing only a URL string) and keeps the site fast under heavy traffic.
  - *Alternatives Considered*: Hosting uploaded MP4 files on Firebase Storage or local server disk was rejected because it risks filling storage quotas and degrading server responsiveness.
- **Decision 2: Unified On-Demand Category Panel vs. Always-Visible Category Card**
  - *Chosen Approach*: Remove the always-open Category & Topics card in the main composer flow and upgrade the bottom toolbar's Category panel to include both group filter tabs and topic chips in one place.
  - *Why*: Eliminates the confusing duplicate UI where clicking the toolbar icon opened a second theme picker below an already-visible category card, while freeing vertical screen space on mobile viewports.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                         Create Post Composer                              │
│                                                                           │
│  ┌──────────────────────────┐      ┌───────────────────────────────────┐  │
│  │ Caption Textarea         │─────►│ Social Video URL Parser           │  │
│  │ (Text, #Tags, Video URL) │      │ (YouTube / Facebook / TikTok)     │  │
│  └──────────────────────────┘      └─────────────────┬─────────────────┘  │
│                                                      │                    │
│  ┌───────────────────────────────────────────────────▼─────────────────┐  │
│  │ Bottom Thumb-Zone Toolbar (Single Active Inline Panel State)        │  │
│  │  [Aa Style]  [Photos]  [Video Link]  [Category & Topics]  [Privacy] │  │
│  └───────────────────────────┬───────────────────────┬─────────────────┘  │
│                              │                       │                    │
│              ┌───────────────▼──────┐       ┌────────▼──────────────┐     │
│              │ Video Link Panel     │       │ Unified Category &    │     │
│              │ (Paste Social URL    │       │ Topics Drawer (Hidden │     │
│              │  + Live Embed View)  │       │ by default; Group     │     │
│              └───────────────┬──────┘       │ Tabs + Topic Chips)   │     │
│                              │              └───────────────────────┘     │
└──────────────────────────────┼────────────────────────────────────────────┘
                               │ Short Share URL? (vt.tiktok / fb.watch)
                               ▼
              ┌─────────────────────────────────┐
              │ Lightweight Redirect Resolver   │
              │ (SSRF-Guarded Canonical Lookup) │
              └────────────────┬────────────────┘
                               │ Canonical Embed URL saved in Firestore
                               ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                      News Hub Feed & Post Details                         │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Embedded Social Video Player (Zero Local/Firebase Video Storage)    │  │
│  │  • Viewport IntersectionObserver (Autoplay >= 45%, Pause < 15%)     │  │
│  │  • Single-Active-Video Coordinator across Feed Cards                │  │
│  │  • In-Site Play, Pause, Seek Scrubber (-10s/+10s), Sound & Fullscr. │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Post Record (`scam_posts`)**: Stores `description` (caption text), `videoUrl` (canonical YouTube, Facebook, or TikTok URL string — zero binary blobs), `themes` (selected category IDs, defaulting to `tech_news` for normal posts or `scam_watch` for scam reports even if the user never opens the Category drawer), and `contentType: "video"` when a social video link is attached.
  - **Composer Inline Panel State (`activeInlinePanel`)**: Strictly mutually exclusive union (`"media" | "video" | "themes" | "audience" | "voice" | null`). Defaults to `null` on normal entry (or `"video"` when entering via `?tab=video`), ensuring Category & Topics is hidden until explicitly toggled.
- **Interactive Component & State Mapping**:
  - **Caption & Video Link Input**: Typing or pasting a YouTube, Facebook, or TikTok URL in either the caption or the Video Link panel triggers canonical parsing (and background short-URL redirect resolution if needed), rendering the live embedded video preview with a one-tap remove (`×`) button. Non-video links or raw file uploads are ignored/unsupported for video embedding, with clear inline guidance if an unsupported video URL is pasted in the Video Link field.
  - **Bottom Toolbar Category Toggle**: Clicking the Category icon toggles `activeInlinePanel` between `"themes"` and `null`. Inside `"themes"`, selecting a category group tab (`All` or specific groups) filters the visible topic buttons, and clicking a topic button toggles its ID in `selectedThemes`.
  - **Feed & Detail Video Playback**: Scrolling a video post into view (`>= 45%` visibility) triggers muted autoplay and pauses any other active video in the feed; scrolling out of view (`< 15%`) pauses playback automatically. Clicking Play, Pause, `-10s`/`+10s` seek buttons, timeline scrubbers, or Mute/Unmute stops event propagation (`stopPropagation`) so interacting with the player never accidentally navigates away from the feed.
