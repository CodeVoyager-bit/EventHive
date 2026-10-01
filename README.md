# EventHive

A full-stack event platform: organizers publish events and sell General and VIP tickets; attendees discover events, book seats, get QR-coded tickets, and review events they attended.

**Live demo:** https://event-hive-zeta.vercel.app

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router, server components, CSS Modules), TypeScript, lucide-react icons, qrcode.react |
| Backend | Express 5, TypeScript, zod validation |
| Database | MongoDB with Mongoose (indexes enforce one ticket and one review per user per event) |
| Auth | JWT, stored in an httpOnly cookie on the Next.js origin and forwarded to the API by a same-origin proxy |
| Tests / CI | `node:test` API suite against a local MongoDB, GitHub Actions |
| Architecture | Layered (Controller → Service → Repository) with a single error middleware |

## How a request flows

```
Browser ──► Next.js server ──► Express API ──► MongoDB
              │  server components fetch data with the user's token
              │  /api/* proxy forwards browser mutations and sets the auth cookie
              └─ proxy.ts guards /dashboard and /bookings
```

- The browser never calls Express directly, so there is no CORS layer and the token never touches JavaScript.
- `POST /api/auth/login` and `/register` return the user; the Next.js proxy keeps the token in an httpOnly cookie (`SameSite=Lax`, 7 days).
- Public pages (home, events, event detail) are server-rendered with real metadata (title, description, Open Graph image).
- Every write is validated with zod on the server; unknown fields are stripped, so clients cannot set `organizerId` or `bookedCount`.

## Project structure

```
├── client/                      # Next.js frontend
│   └── src/
│       ├── app/                 # Routes (server components) + client islands
│       │   ├── api/[...path]/   # Same-origin proxy to the Express API (sets/clears the auth cookie)
│       │   ├── events/          # Listing with filters + pagination, event detail (booking, reviews)
│       │   ├── bookings/        # My tickets with QR codes and cancellation
│       │   ├── dashboard/       # Organizer: stats, create/edit events, attendees
│       │   └── auth/            # Login / register
│       ├── components/          # Navbar, Footer, EventCard, EventForm, ConfirmButton, …
│       ├── lib/                 # server.ts (SSR fetch + session), api.ts (browser mutations), session.ts, categories.ts
│       ├── proxy.ts             # Route protection (Next 16 "proxy", formerly middleware)
│       └── types/
├── server/                      # Express backend
│   └── src/
│       ├── index.ts             # App (exported for Vercel and tests); server.ts listens locally
│       ├── schemas.ts           # zod request schemas
│       ├── config/              # Database singleton
│       ├── controllers/         # Thin: parse input, call a service, send JSON
│       ├── services/            # Business rules (ownership, booking and review rules)
│       ├── repositories/        # Mongoose queries
│       ├── models/              # User, Event, Booking, Review (+ indexes), Ticket factory
│       ├── middleware/          # auth (JWT), rbac, errorHandler
│       ├── interfaces/          # IPaymentGateway + mock gateways
│       ├── seed.ts              # Demo data
│       └── tests/               # API tests (node:test)
├── .github/workflows/ci.yml
├── idea.md                      # Project concept document
└── *Diagram.*                   # UML diagrams (Class, ER, Sequence, Use Case)
```

## Business rules

- **Booking:** only published, upcoming events; one confirmed ticket per user per event (database unique index, race-safe); seats are decremented atomically and returned if anything fails after the decrement; VIP costs double; the mock payment's transaction id is stored and refunded on cancellation; no cancellation once the event has started.
- **Reviews:** only attendees with a confirmed ticket, only after the event has ended, one review per user; the endpoint returns the average and count.
- **Events:** organizers manage only their own events (admins can manage any); the attendee list (names, emails) is visible only to the event's organizer.
- **Registration** can only create `attendee` or `organizer` accounts.

## OOP and design patterns

- **Inheritance**: `User` ← `Attendee` / `Organizer` / `Admin`; `Event` ← `OnlineEvent` / `VenueEvent`
- **Abstraction**: `IPaymentGateway` interface with mock Stripe/PayPal implementations
- **Factory**: `TicketFactory` creates VIP / General tickets
- **Singleton**: `Database` connection (cached across serverless invocations)
- **Encapsulation**: `BaseController` response helpers; services hide rules from controllers

## Local development

### Prerequisites

- Node.js 20 or newer
- MongoDB running locally (`brew services start mongodb-community` on macOS) or a MongoDB Atlas URI

### Backend

```bash
cd server
npm install
cp .env.example .env     # set MONGODB_URI and a random JWT_SECRET
npm run seed             # demo users, 11 events, bookings and reviews
npm run dev              # http://localhost:5001/api
```

Demo logins created by the seed (password `password123`): `organizer@eventhive.dev`, `organizer2@eventhive.dev`, `attendee@eventhive.dev`, `attendee2@eventhive.dev`.

### Frontend

```bash
cd client
npm install
cp .env.example .env.local   # API_URL=http://localhost:5001/api
npm run dev                  # http://localhost:3000
```

### Checks

```bash
cd server && npm run typecheck && npm test      # tests use mongodb://localhost:27017/eventhive_test
cd client && npm run lint && npx tsc --noEmit && npm run build
```

CI runs the same checks on every push (`.github/workflows/ci.yml`) with a MongoDB service container.

## Deployment (Vercel, two projects)

**Backend** — root directory `server`, deployed as a serverless function (`vercel.json`):

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | MongoDB Atlas connection string (allow Vercel's IPs in Atlas Network Access) |
| `JWT_SECRET` | a long random string |
| `JWT_EXPIRES_IN` | `7d` |

**Frontend** — root directory `client`:

| Variable | Value |
|----------|-------|
| `API_URL` | `https://<your-backend>.vercel.app/api` |

`API_URL` is server-only; the browser talks to the frontend's own `/api/*` proxy.

## API

All routes are under `/api`. Responses are `{ success, data }` or `{ success: false, error }`; list endpoints add `pagination`.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register (`attendee` or `organizer`) |
| POST | `/api/auth/login` | No | Login, returns user + token |
| GET | `/api/events` | No | List published upcoming events: `q`, `category`, `eventType`, `from`, `to`, `page`, `limit` |
| GET | `/api/events/:id` | No | Event detail |
| POST | `/api/events` | Organizer/Admin | Create event |
| GET | `/api/events/my/events` | Organizer/Admin | My events with revenue |
| PUT | `/api/events/:id` | Owner/Admin | Update event |
| DELETE | `/api/events/:id` | Owner/Admin | Delete event (cancels its bookings) |
| POST | `/api/bookings` | User | Book a ticket (`eventId`, `ticketType`) |
| GET | `/api/bookings/my` | User | My bookings |
| PATCH | `/api/bookings/:id/cancel` | User | Cancel a booking (refund, seat released) |
| GET | `/api/bookings/event/:eventId` | Owner/Admin | Attendees of an event |
| POST | `/api/reviews` | Attendee of the event | Leave a review after the event ends |
| GET | `/api/reviews/event/:eventId` | No | Reviews with `averageRating` and `reviewCount` |
| GET | `/api/health` | No | Health check |

Errors use proper status codes: 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict (duplicate ticket, sold out, duplicate review).
