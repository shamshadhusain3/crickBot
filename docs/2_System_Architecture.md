# AI Cricket Umpire PWA - System Architecture

## 1. Production System Design

> **Architectural Paradigm Shift:** True "real-time" frame-by-frame streaming over 4G to a cloud GPU server and back will suffer from network jitter, ruining the "umpire" experience. 
> 
> **The Smart Approach:** The PWA acts as an edge buffer. It continually records. When the device detects "action" (or simply records a 5-second chunk of the delivery), it sends that tight video chunk to the Python backend via WebSockets/HTTP. The backend processes the 5-sec chunk in < 1 sec, and returns the decision (Wide, No Ball, Track data).

```mermaid
graph TD
    subgraph Frontend "React PWA (Client Edge)"
        A[Camera Feed / Canvas] -->|Buffered| B(Action Detection / Clip Maker)
        C[Scoreboard UI] --> D(React State & Redux/Zustand)
        B -->|Sends 5s MP4/Frames| E[WebSocket / REST]
    end

    subgraph Backend "Node.js API (Fastify)"
        E --> F(Event Router & Auth)
        F --> G[Redis Pub/Sub]
        F --> H[(PostgreSQL)]
    end

    subgraph AI Service "Python (FastAPI + OpenCV)"
        G -->|Frame / Clip Payload| I[Frame Extraction]
        I --> J[YOLOv8 Object Detection]
        I --> K[MediaPipe Pose]
        J --> L(Tracking & Match Rules Engine)
        K --> L
        L -->|Decision: WIDE, DOT| G
    end

    subgraph CDN & Storage
        E -->|Save Replay| M[S3 / R2 Bucket]
    end
```

1.  **Frontend:** React + Vite, Tailwind. Service Workers configured to cache the UI.
2.  **Backend:** Fastify (Node.js) handles match logic, JWT auth, and WebSocket management.
3.  **AI Engine:** Python/FastAPI running on a GPU-backed VPS. It consumes standard HTTP/WS requests containing video buffers, runs `ultralytics` YOLOv8, and replies with JSON coordinates + decisions.
4.  **Database:** PostgreSQL (Supabase/Neon for serverless ease).
5.  **Offline/PWA:** IndexedDB (via localForage or Dexie) caches match data if the connection drops, syncing once reconnected.

***

## 2. Database Design

Use an RDBMS (PostgreSQL) because cricket matches are highly relational (Match -> Inning -> Over -> Delivery -> Player).

```sql
-- Core Schema Concept

TABLE Users {
  id UUID PK
  phone_number VARCHAR
  name VARCHAR
  role ENUM(umpire, player, admin)
}

TABLE Matches {
  id UUID PK
  team_a_id UUID
  team_b_id UUID
  overs INT
  status ENUM(scheduled, live, completed)
  umpire_user_id UUID
}

TABLE Innings {
  id UUID PK
  match_id UUID
  batting_team_id UUID
  total_runs INT
  total_wickets INT
}

TABLE Deliveries {
  id UUID PK
  inning_id UUID
  bowler_id UUID
  batter_id UUID
  over_number INT -- e.g., 1
  ball_number INT -- e.g., 1 to 6
  runs INT
  extras INT
  extra_type ENUM(none, wide, no_ball, bye, leg_bye)
  wicket_type ENUM(none, bowled, catch, lbw, run_out)
  video_clip_url VARCHAR -- S3 link to the isolated delivery
  pitch_x_coord FLOAT -- Ball bounce coordinate
  pitch_y_coord FLOAT
}
```
*Index Strategy:* Index heavily on `inning_id` and `over_number` in `Deliveries` as that will be queried constantly for the live scoreboard.

***

## 3. API Design

**Architecture:** REST for standard CRUD, WebSockets for live video ingestion and match state broadcasting.

```yaml
# REST Endpoints
POST /api/v1/auth/login
POST /api/v1/matches
GET  /api/v1/matches/:id/scorecard
PUT  /api/v1/matches/:id/override-decision # Manual umpire override

# WebSocket Events (via Socket.io or native WS)
WS /ws/match/:id
-> { "event": "START_DELIVERY_RECORD" }
<- { "event": "FRAME_CHUNK_SENT", "payload": <binary_blob> }
-> { "event": "AI_DECISION", "payload": { "type": "WIDE", "confidence": 0.92 } }
-> { "event": "SCORE_UPDATED", "payload": { "team_runs": 45, "wickets": 2 } }
```

***

## 4. Codebase Structure

Use TurboRepo or npm workspaces for easy context sharing.

```text
ai-umpire-monorepo/
├── apps/
│   ├── umpire-pwa/         # React, Vite, Tailwind, Zustand
│   └── admin-dashboard/    # Optional: Next.js or plain React for master control
├── services/
│   ├── api-gateway/        # Fastify, Node, Postgres, Socket.io
│   └── cv-engine/          # Python, FastAPI, YOLO, OpenCV
├── packages/
│   ├── database/           # Prisma or Drizzle schema & migrations
│   ├── shared-types/       # TypeScript types shared between PWA and API
│   └── cv-models/          # .pt / .onnx weights and python utils
├── docker-compose.yml      # Local dev spin-up (Postgres, API, Redis)
└── dev-scripts/            # Bash scripts for starting local environment
```
