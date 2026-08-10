# GDG RVCE – The Turing Test
## Master Software Architecture Blueprint

**Role:** Senior Software Architect
**Status:** Design-only document. No code, no YAML. This is the foundation every future module must follow.

---

## 1. Overall Architecture Diagram

```
                                   ┌───────────────────────────┐
                                   │         Internet           │
                                   └──────────────┬─────────────┘
                                                  │ HTTPS
                                   ┌──────────────▼─────────────┐
                                   │   NGINX Ingress Controller │
                                   │  (TLS termination, routing)│
                                   └───────┬──────────────┬─────┘
                          /api, /socket.io │              │ /
                            ┌──────────────▼───┐   ┌──────▼───────────┐
                            │  Backend Service  │   │ Frontend Service │
                            │ (ClusterIP)       │   │ (ClusterIP)      │
                            └─────────┬─────────┘   └────────┬─────────┘
                                      │                       │
                     ┌────────────────┼───────────┐   ┌───────▼────────┐
                     │                │           │   │  Frontend Pods │
             ┌───────▼──────┐ ┌───────▼──────┐    │   │ (React + Vite  │
             │ Backend Pod 1│ │ Backend Pod 2│ ... │   │  static build, │
             │ Express +    │ │ Express +    │     │   │  served via    │
             │ Socket.IO    │ │ Socket.IO    │     │   │  NGINX)        │
             └───────┬──────┘ └───────┬──────┘     │   └────────────────┘
                     │                │             │
                     └────────┬───────┘             │
                              │                      │
                     ┌────────▼─────────┐            │
                     │   Redis Service   │            │
                     │   (ClusterIP)     │            │
                     └────────┬─────────┘            │
                              │                       │
                     ┌────────▼─────────┐             │
                     │    Redis Pod      │             │
                     │ (StatefulSet +    │             │
                     │  PersistentVolume)│             │
                     └───────────────────┘             │
                                                        │
     Browser (Participant / Admin) ◄── static assets ──┘
     Browser (Participant / Admin) ◄── REST + WS ───────► Backend Pods

ConfigMaps ──► inject non-secret env vars (REDIS_HOST, PORT, CORS_ORIGIN...)
Secrets    ──► inject JWT_SECRET, REDIS_PASSWORD, ADMIN_SEED_CREDENTIALS
```

**Notes on the diagram:**
- Ingress is the single public entry point. It routes `/` to the frontend service and `/api/*` + `/socket.io/*` to the backend service, so both HTTP and WebSocket traffic share one hostname (avoids CORS/mixed-origin issues).
- Backend is horizontally scalable (multiple pods). Because Socket.IO needs a shared state across pods for broadcasting, the backend will use the **Redis adapter for Socket.IO** so events emitted from one pod reach clients connected to another pod.
- Redis is the single source of truth (no separate SQL database). It runs as a StatefulSet with a PersistentVolumeClaim so event data survives pod restarts.
- Frontend is a static build served by NGINX inside its own pod — it does not talk to Redis directly, only through the backend REST/Socket API.

---

## 2. Folder Structure

```
turing-test/
├── frontend/
│   ├── public/
│   │   └── favicon.svg
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── routes/
│   │   │   └── AppRoutes.jsx
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── RegisterPage.jsx
│   │   │   ├── participant/
│   │   │   │   ├── WaitingScreen.jsx
│   │   │   │   ├── RoundPage.jsx
│   │   │   │   └── LeaderboardPage.jsx
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.jsx
│   │   │       ├── UserManagement.jsx
│   │   │       ├── RoundManagement.jsx
│   │   │       ├── QuestionManagement.jsx
│   │   │       ├── LiveResponses.jsx
│   │   │       ├── AdminLeaderboard.jsx
│   │   │       ├── SettingsPage.jsx
│   │   │       └── LogsPage.jsx
│   │   ├── layouts/
│   │   │   ├── AuthLayout.jsx
│   │   │   ├── ParticipantLayout.jsx
│   │   │   └── AdminLayout.jsx
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── admin/
│   │   │   └── participant/
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx
│   │   │   ├── SocketContext.jsx
│   │   │   └── EventStateContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useSocket.js
│   │   │   └── useLeaderboard.js
│   │   ├── sockets/
│   │   │   └── socketManager.js
│   │   ├── api/
│   │   │   ├── axiosClient.js
│   │   │   ├── authApi.js
│   │   │   ├── roundApi.js
│   │   │   ├── questionApi.js
│   │   │   ├── userApi.js
│   │   │   └── leaderboardApi.js
│   │   ├── utils/
│   │   │   ├── constants.js
│   │   │   └── validators.js
│   │   └── styles/
│   │       └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── app.js
│   │   ├── config/
│   │   │   ├── redisClient.js
│   │   │   ├── env.js
│   │   │   └── socket.js
│   │   ├── routes/
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── roundRoutes.js
│   │   │   ├── questionRoutes.js
│   │   │   ├── responseRoutes.js
│   │   │   ├── leaderboardRoutes.js
│   │   │   ├── settingsRoutes.js
│   │   │   └── logRoutes.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── userController.js
│   │   │   ├── roundController.js
│   │   │   ├── questionController.js
│   │   │   ├── responseController.js
│   │   │   ├── leaderboardController.js
│   │   │   ├── settingsController.js
│   │   │   └── logController.js
│   │   ├── services/
│   │   │   ├── authService.js
│   │   │   ├── userService.js
│   │   │   ├── roundService.js
│   │   │   ├── questionService.js
│   │   │   ├── responseService.js
│   │   │   ├── leaderboardService.js
│   │   │   ├── csvImportService.js
│   │   │   └── logService.js
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js
│   │   │   ├── roleMiddleware.js
│   │   │   ├── rateLimiter.js
│   │   │   ├── errorHandler.js
│   │   │   └── validateRequest.js
│   │   ├── sockets/
│   │   │   ├── socketServer.js
│   │   │   ├── socketAuth.js
│   │   │   └── handlers/
│   │   │       ├── roundHandlers.js
│   │   │       ├── responseHandlers.js
│   │   │       ├── leaderboardHandlers.js
│   │   │       └── presenceHandlers.js
│   │   ├── redis/
│   │   │   ├── keys.js
│   │   │   ├── userStore.js
│   │   │   ├── roundStore.js
│   │   │   ├── questionStore.js
│   │   │   ├── responseStore.js
│   │   │   ├── leaderboardStore.js
│   │   │   ├── settingsStore.js
│   │   │   └── logStore.js
│   │   ├── validators/
│   │   │   ├── authValidators.js
│   │   │   ├── userValidators.js
│   │   │   └── questionValidators.js
│   │   └── utils/
│   │       ├── logger.js
│   │       ├── hashPassword.js
│   │       ├── jwtUtils.js
│   │       └── csvParser.js
│   ├── uploads/
│   │   └── .gitkeep
│   ├── package.json
│   ├── .env.example
│   └── Dockerfile
│
├── k8s/
│   ├── namespace/
│   ├── configmaps/
│   ├── secrets/
│   ├── redis/
│   │   ├── statefulset.yaml
│   │   ├── service.yaml
│   │   └── pvc.yaml
│   ├── backend/
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   └── hpa.yaml
│   ├── frontend/
│   │   ├── deployment.yaml
│   │   └── service.yaml
│   └── ingress/
│       └── ingress.yaml
│
├── docker/
│   ├── docker-compose.yml
│   └── docker-compose.dev.yml
│
├── scripts/
│   ├── seed-admin.js
│   ├── build-images.sh
│   └── deploy.sh
│
├── docs/
│   ├── architecture.md   (this document)
│   ├── api-reference.md
│   ├── redis-schema.md
│   └── runbook.md
│
└── README.md
```

---

## 3. Backend Architecture

**Layering principle:** Route → Controller → Service → Redis Store. Each layer has exactly one responsibility, so any layer can be modified without breaking the others.

- **`routes/`** — Pure wiring. Maps an HTTP verb + path to a controller function, and attaches middleware (auth, role, validation) at the route-definition level. Contains no logic.
- **`controllers/`** — Translate HTTP in and out. Read `req.body`/`req.params`, call the matching service, and shape the HTTP response (status codes, JSON body). Contains no Redis calls and no business rules.
- **`services/`** — All business logic lives here: score calculation, round-state transitions, CSV row validation, leaderboard ranking. Services call the Redis store layer, never `redis` directly. This is what makes logic testable and reusable from both REST controllers and Socket.IO handlers.
- **`middleware/`** — Cross-cutting concerns: `authMiddleware` (verifies JWT), `roleMiddleware` (checks admin/participant), `rateLimiter` (brute-force protection on login/register), `validateRequest` (runs schema validators and short-circuits on bad input), `errorHandler` (single place that formats all thrown errors consistently).
- **`redis/` (Redis layer)** — One file per entity (`userStore`, `roundStore`, etc.), each exporting small functions like `getUser(username)`, `setRound(roundId, data)`. This is the *only* place raw Redis commands are issued. If Redis were ever swapped for another store, only this folder changes.
- **`sockets/`** — `socketServer.js` initializes Socket.IO on top of the same HTTP server and attaches the Redis adapter for multi-pod broadcast. `socketAuth.js` verifies the JWT sent during the socket handshake. `handlers/` contains one file per event domain, calling the same `services/` functions the REST controllers use, so REST and WebSocket paths never diverge in business logic.
- **`utils/`** — Stateless helpers: password hashing wrapper (bcrypt), JWT sign/verify wrapper, structured logger, CSV parsing helper.
- **`validators/`** — Schema definitions (e.g. using a library like `zod` or `express-validator`) describing exactly what each endpoint accepts. Used by `validateRequest` middleware.
- **Authentication** — Handled by `authService` (register/login/hash-check) + `jwtUtils` (issue/verify tokens) + `authMiddleware`/`roleMiddleware` (protect routes). The same JWT is reused to authenticate the Socket.IO handshake, so one login covers both transports.

---

## 4. Frontend Architecture

- **`pages/`** — One component per route, grouped by audience (`auth/`, `participant/`, `admin/`). Pages compose layouts + components and read from contexts/hooks; they hold minimal local state.
- **`layouts/`** — Shared chrome per audience: `AuthLayout` (centered card, no nav), `ParticipantLayout` (top bar + round status), `AdminLayout` (sidebar nav + header). Keeps navigation and framing consistent without repeating it per page.
- **`components/`** — Reusable, presentation-focused pieces (buttons, cards, tables, modals, question renderers, leaderboard rows), split into `common/`, `admin/`, `participant/` so ownership is obvious.
- **`contexts/`** — Global state that many components need: `AuthContext` (current user + token), `SocketContext` (the single shared socket connection), `EventStateContext` (current round, event status: running/paused/ended). Avoids prop-drilling across deeply nested pages.
- **`hooks/`** — Encapsulate reusable stateful logic: `useAuth` (login/logout/register calls + persisted session), `useSocket` (subscribe/unsubscribe to a named event safely), `useLeaderboard` (subscribes to leaderboard updates and exposes sorted data).
- **`sockets/socketManager.js`** — Single Socket.IO client instance, created once, exposing `connect()`, `emit()`, `on()`, `off()`. Every component gets the connection through `SocketContext`/`useSocket` instead of creating its own socket, preventing duplicate connections.
- **`api/`** — Thin Axios wrappers per resource (`authApi`, `roundApi`, etc.), all going through a shared `axiosClient` that attaches the JWT header and centralizes error handling (e.g. auto-logout on 401).
- **`utils/`** — Constants (round names, socket event name strings shared with backend conventions) and client-side validators (mirrors backend validation for instant feedback).
- **State management** — No external state library is required. `Context + hooks` covers global concerns (auth, socket, event state); local UI state stays in component state; server data is fetched via the `api/` layer and cached minimally in context where it needs to be shared (e.g. leaderboard). This keeps the app dependency-light while remaining fully real-time via Socket.IO push updates.

---

## 5. Redis Design

Redis is the single datastore. Below is every key pattern, its type, and its purpose.

| Key Pattern | Type | Description |
|---|---|---|
| `user:{username}` | Hash | Full user record: `username, passwordHash, role, name, createdAt, status` |
| `usernames` | Set | Set of all registered usernames — used for fast existence checks during registration |
| `admins` | Set | Set of usernames with the admin role, for quick role listing |
| `session:{token}` | String (TTL) | Optional server-side session/blacklist entry for JWT revocation, expires with token TTL |
| `round:{roundId}` | Hash | Round metadata: `name, status (pending/active/paused/ended), startedAt, endedAt, order` |
| `rounds:order` | List | Ordered list of `roundId`s defining round sequence |
| `currentRound` | String | The `roundId` currently active (or empty if none) |
| `eventState` | Hash | Global event status: `status (idle/running/paused/ended), updatedAt, updatedBy` |
| `question:{roundId}:{questionId}` | Hash | Question data: `text, options (JSON), correctAnswer, points, order` |
| `questions:{roundId}` | List | Ordered list of `questionId`s for a round |
| `response:{roundId}:{username}` | Hash | A participant's submission for a round: `answer, submittedAt, isCorrect, pointsAwarded` |
| `responses:{roundId}` | Set | Set of usernames who have responded in a round — used to check "already submitted" and to compute live counts |
| `leaderboard` | Sorted Set (ZSET) | Score-per-user across the whole event; `ZADD leaderboard {score} {username}` — enables instant ranked retrieval via `ZREVRANGE` |
| `leaderboard:{roundId}` | Sorted Set | Per-round leaderboard, same mechanism, scoped to one round |
| `settings` | Hash | Configurable event settings: `autoAdvance (bool), roundDurationSeconds, allowLateSubmission` |
| `logs` | List | Append-only list of JSON-stringified admin action log entries (round start/pause/reset, user edits, CSV imports) — capped with `LTRIM` to a reasonable max length |
| `presence:online` | Set | Set of usernames currently connected via Socket.IO, updated on connect/disconnect |
| `csvImport:{importId}` | Hash | Status/result of an in-progress or completed CSV bulk-user upload: `total, success, failed, errors (JSON)` |

**Design rationale:**
- Hashes are used for structured records so individual fields can be updated (`HSET`) without rewriting the whole object.
- Sorted Sets are used for both leaderboards specifically because Redis can return ranked results in O(log N) without any application-side sorting.
- Sets are used for membership checks (has this user already answered? is this user online?) which are O(1).
- Lists are used only where strict order matters (round sequence, question order, append-only logs).

---

## 6. REST API Design

Base path: `/api`. Auth via `Authorization: Bearer <JWT>` unless marked Public.

| Method | URL | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/register` | Register a new participant (`RVCE26B#####` username) | Public |
| POST | `/auth/login` | Login, returns JWT | Public |
| POST | `/auth/logout` | Invalidate session/token | Participant/Admin |
| GET | `/auth/me` | Get current authenticated user profile | Participant/Admin |
| GET | `/users` | List all users (paginated, filterable) | Admin |
| GET | `/users/:username` | Get single user detail | Admin |
| PUT | `/users/:username` | Edit a user (name, role, password reset) | Admin |
| DELETE | `/users/:username` | Remove a user | Admin |
| POST | `/users/upload-csv` | Bulk-create users from CSV (Multer + csv-parser) | Admin |
| GET | `/rounds` | List all rounds with status | Participant/Admin |
| GET | `/rounds/current` | Get the currently active round | Participant/Admin |
| POST | `/rounds` | Create a new round | Admin |
| PUT | `/rounds/:roundId` | Edit round metadata | Admin |
| POST | `/rounds/:roundId/start` | Start a round (manual or auto) | Admin |
| POST | `/rounds/:roundId/pause` | Pause current round | Admin |
| POST | `/rounds/:roundId/resume` | Resume a paused round | Admin |
| POST | `/rounds/:roundId/restart` | Restart a round from the beginning | Admin |
| POST | `/rounds/:roundId/end` | End a specific round | Admin |
| POST | `/event/reset` | Reset the entire event to initial state | Admin |
| POST | `/event/end` | End the whole event | Admin |
| GET | `/questions/:roundId` | Get all questions for a round | Admin |
| POST | `/questions/:roundId` | Add a question to a round | Admin |
| PUT | `/questions/:roundId/:questionId` | Edit a question | Admin |
| DELETE | `/questions/:roundId/:questionId` | Delete a question | Admin |
| GET | `/questions/:roundId/active` | Get the question a participant should currently see | Participant |
| POST | `/responses/:roundId` | Submit an answer for the active round | Participant |
| GET | `/responses/:roundId` | Get all responses for a round (live monitoring) | Admin |
| GET | `/responses/:roundId/mine` | Get the current user's own submission status | Participant |
| GET | `/leaderboard` | Get overall leaderboard | Participant/Admin |
| GET | `/leaderboard/:roundId` | Get per-round leaderboard | Participant/Admin |
| GET | `/settings` | Get event settings | Admin |
| PUT | `/settings` | Update event settings | Admin |
| GET | `/logs` | Get paginated admin action logs | Admin |

Each endpoint's expected request/response bodies follow the Redis schema in Section 5 (e.g. `POST /responses/:roundId` expects `{ answer }` and returns `{ isCorrect, pointsAwarded, currentScore }`); full field-level request/response contracts are documented separately in `docs/api-reference.md` to keep this blueprint readable.

---

## 7. Socket.IO Design

All events are namespaced under the default namespace; the client authenticates once at handshake using the JWT.

| Event | Emitted By | Received By | Payload | Purpose |
|---|---|---|---|---|
| `connection` | Client (implicit) | Server | JWT in handshake auth | Establish authenticated socket session |
| `presence:online` | Server | Admin dashboard | `{ username, onlineCount }` | Notify admin a user connected |
| `presence:offline` | Server | Admin dashboard | `{ username, onlineCount }` | Notify admin a user disconnected |
| `round:changed` | Server (on admin start/restart) | All participants | `{ roundId, roundData, questionId }` | Force every phone to switch to the new round instantly |
| `round:paused` | Server | All participants | `{ roundId }` | Freeze the participant UI (show waiting/paused screen) |
| `round:resumed` | Server | All participants | `{ roundId }` | Unfreeze participant UI |
| `round:ended` | Server | All participants | `{ roundId }` | Move participants to waiting/leaderboard screen |
| `event:reset` | Server | All clients | `{}` | Force full client state reset (e.g. back to login/waiting) |
| `event:ended` | Server | All clients | `{}` | Show final results screen |
| `response:submitted` | Client | Server | `{ roundId, answer }` | Alternative real-time submission path (mirrors REST POST) |
| `response:received` | Server | Admin live-responses view | `{ roundId, username, submittedAt }` | Live tally of who has answered |
| `leaderboard:update` | Server | All clients | `{ leaderboard: [...] }` | Push new rankings the moment a score changes |
| `admin:notification` | Server (admin action) | Admin dashboard(s) | `{ message, level, timestamp }` | Broadcast admin-only alerts (e.g. CSV import finished) |
| `log:new` | Server | Admin logs view | `{ logEntry }` | Stream new log entries live without polling |
| `error` | Server | Originating client | `{ message, code }` | Report a socket-level error (e.g. invalid/expired token) |

**Design rationale:** Server-authoritative events (`round:*`, `event:*`, `leaderboard:update`) are always pushed from server to client — the client never assumes state, it only reacts to what the server broadcasts. This guarantees every participant's phone reflects the exact same state without needing a manual refresh.

---

## 8. Database Flow

**User logs in**
1. Client sends `{ username, password }` to `POST /auth/login`.
2. `authController` → `authService.login()` → `userStore.getUser(username)` fetches the Redis hash.
3. Password compared with bcrypt against `passwordHash`.
4. On success, `jwtUtils` signs a token containing `{ username, role }`; response returns the token + role.
5. Client stores the token, opens the Socket.IO connection using the same token, and is added to `presence:online`.

**User registers**
1. Client sends `{ username, password, name }` to `POST /auth/register`.
2. `validateRequest` checks the `RVCE26B#####` username pattern.
3. `authService.register()` checks `usernames` set for a duplicate.
4. Password hashed via bcrypt; `userStore.createUser()` writes the Hash and adds the username to the `usernames` set.
5. A JWT is issued immediately so the user is logged in right after registering.

**Admin starts a round**
1. Admin dashboard calls `POST /rounds/:roundId/start`.
2. `roundController` → `roundService.startRound()` updates `round:{roundId}` status to `active`, sets `currentRound`, appends a log entry.
3. Service emits `round:changed` via the Socket.IO server (through the Redis adapter, so it reaches clients on every backend pod).
4. Every connected participant's `SocketContext` receives `round:changed` and the app router swaps to `RoundPage` for the new round — no refresh needed.

**Participant submits an answer**
1. Client calls `POST /responses/:roundId` with `{ answer }` (or emits `response:submitted`).
2. `responseService` checks `responses:{roundId}` set to ensure no duplicate submission and that the round is `active`.
3. Answer is compared against `question.correctAnswer`; points computed per `settings`.
4. `responseStore.saveResponse()` writes `response:{roundId}:{username}` and adds the user to `responses:{roundId}`.
5. `leaderboardService.updateScore()` runs `ZINCRBY` on both `leaderboard` and `leaderboard:{roundId}`.
6. Server emits `response:received` (to admin) and `leaderboard:update` (to everyone).

**Leaderboard updates**
1. Triggered only as a side effect of a scored response (previous flow) or an admin manual score correction.
2. `leaderboardService` reads the top N via `ZREVRANGE leaderboard 0 N WITHSCORES`.
3. Result is broadcast on `leaderboard:update`; the frontend `useLeaderboard` hook replaces its local list — no polling required.

**Admin pauses the event**
1. `POST /rounds/:roundId/pause` (or a global event-level pause) sets round/event status to `paused` and logs the action.
2. Server emits `round:paused` / a global pause signal; participant clients lock their submit buttons and show a "Paused by Admin" screen while keeping their in-progress answer in local state.

**Admin resumes**
1. `POST /rounds/:roundId/resume` flips status back to `active`, logs the action.
2. Server emits `round:resumed`; participant clients unlock the same screen they were on (state was never destroyed, only frozen).

---

## 9. Security Design

- **JWT** — Short-lived access tokens (e.g. 4–6 hour expiry, matching event duration) signed with a secret from Kubernetes Secrets. Token carries `username` + `role` only — no sensitive data.
- **Password hashing** — bcrypt with a sufficient cost factor (e.g. 10–12 rounds); raw passwords are never logged or stored.
- **Role middleware** — `roleMiddleware('admin')` guards every admin route at the router level; participant routes explicitly check the token's role too, so a participant token can never reach admin logic even if a URL is guessed.
- **Rate limiting** — Applied on `/auth/login` and `/auth/register` (e.g. sliding-window limiter keyed by IP) to blunt brute-force and registration spam.
- **Validation** — Every mutating endpoint runs through `validateRequest` with an explicit schema (username pattern, password length, question payload shape) before it reaches the controller.
- **CORS** — Backend restricts allowed origins to the known frontend origin(s) via a ConfigMap-provided value, rather than `*`.
- **Helmet** — Standard secure-header middleware enabled globally (disables `X-Powered-By`, sets sane defaults for frame/content-type protections).
- **Redis security** — Redis is not exposed outside the cluster (ClusterIP only, no NodePort/LoadBalancer); access is further protected with a `requirepass` value injected from a Kubernetes Secret.
- **Input sanitization** — All free-text fields (names, question text) are sanitized/escaped before storage and before rendering on the frontend to prevent stored XSS.
- **CSV validation** — `csvImportService` validates every row (username pattern, required columns, duplicate detection) before any Redis write, and returns a per-row error report rather than partially importing bad data.

---

## 10. Kubernetes Design

- **Pods** — Three logical pod groups: `frontend`, `backend`, `redis`. Frontend and backend are stateless and run as `Deployments`; Redis is stateful and runs as a `StatefulSet`.
- **Deployments** — `frontend-deployment` and `backend-deployment` each define replica count, container image, resource requests/limits, and readiness/liveness probes.
- **Services** — `frontend-service`, `backend-service`, `redis-service`, all `ClusterIP` (internal-only); only the Ingress is externally reachable.
- **Ingress** — A single NGINX Ingress resource routes by path: `/` → frontend-service, `/api` and `/socket.io` → backend-service, under one shared hostname, with TLS configured via an attached certificate/secret.
- **Secrets** — `JWT_SECRET`, `REDIS_PASSWORD`, and any seed admin credentials — mounted as environment variables into the backend pod only.
- **ConfigMaps** — Non-sensitive configuration: `REDIS_HOST`, `REDIS_PORT`, `CORS_ORIGIN`, `NODE_ENV`, frontend `VITE_API_BASE_URL` build-time value.
- **Environment variables** — Injected from ConfigMaps/Secrets rather than hardcoded, so the same image is promoted across environments (dev/staging/prod) unchanged.
- **Persistent storage** — A `PersistentVolumeClaim` attached to the Redis `StatefulSet` ensures event data (users, scores, logs) survives pod restarts and rescheduling.
- **Networking** — Only Ingress is internet-facing; all inter-service traffic (backend↔Redis, frontend↔backend) stays on the cluster-internal network via Service DNS names.
- **Scaling strategy** — `backend-deployment` is the primary horizontal scaling target (stateless, Redis adapter makes multi-pod Socket.IO safe); a `HorizontalPodAutoscaler` can scale it on CPU/connection count. `frontend-deployment` scales independently since it's just static asset serving. Redis stays single-instance for this event's scale, with the option to move to Redis Sentinel/Cluster later if needed.
- **Health checks** — Liveness probes restart a pod that's stopped responding; readiness probes ensure a pod only receives traffic (from the Service) once it has a working Redis connection, preventing traffic from hitting a pod mid-startup.

---

## 11. Development Roadmap — 12 Modules

1. **Backend Foundation (Express + Redis + Socket.IO)**
   - *Objective:* Stand up `app.js`/`server.js`, Redis client connection, base Socket.IO server, health-check route.
   - *Files:* `config/`, `server.js`, `app.js`
   - *Dependencies:* None (first module)
   - *Complexity:* Medium

2. **Redis Data Layer**
   - *Objective:* Implement every store file (`userStore`, `roundStore`, etc.) per Section 5's schema.
   - *Files:* `redis/*`
   - *Dependencies:* Module 1
   - *Complexity:* Medium

3. **Authentication Module**
   - *Objective:* Register/login/JWT/bcrypt/role middleware end-to-end.
   - *Files:* `authController`, `authService`, `authRoutes`, `authMiddleware`, `roleMiddleware`, `jwtUtils`, `hashPassword`
   - *Dependencies:* Modules 1–2
   - *Complexity:* Medium

4. **User Management Module (Admin)**
   - *Objective:* CRUD on users + CSV bulk upload (Multer + csv-parser).
   - *Files:* `userController`, `userService`, `userRoutes`, `csvImportService`, `csvParser`
   - *Dependencies:* Modules 1–3
   - *Complexity:* Medium-High

5. **Round & Question Management Module (Admin)**
   - *Objective:* Create/edit rounds and questions; manual round control (start/pause/resume/restart/end).
   - *Files:* `roundController`, `roundService`, `roundRoutes`, `questionController`, `questionService`, `questionRoutes`
   - *Dependencies:* Modules 1–3
   - *Complexity:* High

6. **Response Submission Module**
   - *Objective:* Participant answer submission, correctness/scoring logic, duplicate-submission prevention.
   - *Files:* `responseController`, `responseService`, `responseRoutes`
   - *Dependencies:* Modules 2, 5
   - *Complexity:* Medium-High

7. **Leaderboard Module**
   - *Objective:* Sorted-set based scoring, overall + per-round leaderboard endpoints.
   - *Files:* `leaderboardController`, `leaderboardService`, `leaderboardRoutes`
   - *Dependencies:* Module 6
   - *Complexity:* Medium

8. **Socket.IO Real-Time Layer**
   - *Objective:* Implement every event from Section 7, wire Redis adapter for multi-pod broadcast, socket-level JWT auth.
   - *Files:* `sockets/*`
   - *Dependencies:* Modules 3, 5, 6, 7
   - *Complexity:* High

9. **Settings & Logs Module**
   - *Objective:* Event settings CRUD, append-only admin action logging, event reset/end flows.
   - *Files:* `settingsController/Service/Routes`, `logController/Service/Routes`, `logStore`
   - *Dependencies:* Modules 1–2
   - *Complexity:* Low-Medium

10. **Frontend Foundation (Auth + Routing + Layouts)**
    - *Objective:* Vite/React/Tailwind setup, routing, layouts, `AuthContext`, `axiosClient`, login/register pages.
    - *Files:* `main.jsx`, `App.jsx`, `routes/`, `layouts/`, `contexts/AuthContext.jsx`, `api/authApi.js`
    - *Dependencies:* Module 3
    - *Complexity:* Medium

11. **Participant Experience Module**
    - *Objective:* Waiting screen, live round page, response submission UI, live leaderboard view, socket-driven round switching.
    - *Files:* `pages/participant/*`, `sockets/socketManager.js`, `contexts/SocketContext.jsx`, `contexts/EventStateContext.jsx`, `hooks/useSocket.js`, `hooks/useLeaderboard.js`
    - *Dependencies:* Modules 6–8, 10
    - *Complexity:* High

12. **Admin Dashboard Module**
    - *Objective:* Full admin UI — user management, round/question management, live responses monitor, leaderboard view, settings, logs.
    - *Files:* `pages/admin/*`, `components/admin/*`
    - *Dependencies:* Modules 4, 5, 7, 8, 9, 10
    - *Complexity:* High

---

*This document is the master blueprint. All future modules should reuse these exact folder names, Redis key patterns, REST endpoints, and Socket.IO event names unless a genuine technical constraint forces a change.*
