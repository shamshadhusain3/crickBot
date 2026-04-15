# AI Cricket Umpire PWA - Execution & Business Strategy

## 1. Master Implementation Plan

*   **Day 1:** Scaffold monorepo. Init React+Vite PWA, Fastify API. Define SQL Schema.
*   **Day 2:** Build Match setup UI. Teams, Players, Toss UI.
*   **Day 3:** Build Live Scoreboard UI (Buttons for 0-6, W, Wides). Connect to Postgres via API.
*   **Day 3.5 [NEW]:** Architect Player Analytics & Authentication. Implement JWT auth, dynamic React Hook Forms for 11-man rosters.
*   **Day 4:** Implement WebSockets. Update scoreboard instantly on a secondary phone.
*   **Day 5:** Camera Integration. Access camera stream in PWA, draw absolute positioning canvas guidelines over it.
*   **Day 6-12:** Python AI Pipeline & Processing.
*   **Day 13:** Visual Polish. Tailwind animations, Player analytical Dashboards for vanity.

***

## 2. Dev Roadmap (Solo Founder)

**Phase 1: The Scoreable MVP**
*   Goal: Stable web-based manual scoring app (PWA) with dual modes (Quick vs Pro).
*   Tech: React, Fastify, Postgres, Zustand, React Query.

**Phase 1.5: Authentication & Pro Analytics [NEW]**
*   Goal: User registration, Player Profiles, granular delivery tracking.

**Phase 2: The Pitch Calibrator**
*   Goal: Camera integration. User can open camera, draw pitch boundary.

**Phase 3: The Wide & No-Ball Engine**
*   Goal: Train YOLOv8 on cricket balls. Process Wides/No-Balls.

***

## 3. Go-To-Market (GTM)

1.  **The "Tripod Guy" Strategy:** Set up the phone behind the umpire.
2.  **WhatsApp Viral Loops:** When a match is done, generate a Player Card: "John took 4 wickets - certified by AI Umpire." This hits the vanity nerve perfectly because of our Pro Mode analytics tracking.
3.  **Instagram Creators:** Sponsor local cricket Instagrammers.

***

## 4. Monetization Ideas

1.  **Player Vanity (Freemium):** Live umpiring is free. Players pay $2.99/mo to download high-res "Dismissal Replay" videos or see deep pace-tracking profiles. Due to the "Pro Mode" roster system, players become incredibly invested in their stats.
2.  **Tournament Organizers (SaaS):** Charge $50 per tournament for official leaderboards.
