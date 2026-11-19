# EventHive

Event discovery and ticketing for India. Hosts publish events with ticket tiers, promo codes and approval rules; guests find events by city, book in seconds, and get in with a live ticket whose QR code changes every 30 seconds.

The feature set comes from a study of 26 platforms (Eventbrite, Ticketmaster, BookMyShow, District, Luma, DICE and more): see [docs/research.md](docs/research.md) and the plan in [docs/v2-plan.md](docs/v2-plan.md).

**Live demo:** https://event-hive-zeta.vercel.app

## Features

**For guests**
- **Discover:** pick a city, filter by category, date, price and format, quick filters (Tonight, This weekend, Free, Under ₹500, Online), sort by date, price or popularity, a month calendar view, curated lists, and ⌘K search. Shared event links unfurl as branded preview cards.
- **Book:** ticket tiers (early bird with a sales end, general, VIP), several named tickets per booking, promo codes (also auto-applied from a `?code=` link), group discounts applied automatically (e.g. 10% off 4+ tickets), an all-in price with the platform fee and 18% GST shown before paying, and an optional Refund Protection add-on. Events not on sale yet show a countdown and a Notify me button.
- **Scarce seats:** approval-required events (seat held, charged only when approved), secret locations revealed to confirmed guests, and an automatic waitlist that books the next person in line when seats free up.
- **Live tickets:** each ticket's QR and door code are generated on the phone from a per-ticket secret and change every 30 seconds, so screenshots stop working. Send a ticket to a friend and it re-keys. Save tickets to the phone (installable PWA) and My Tickets, live codes included, opens with no signal.
- **After booking:** cancel with a refund that follows the event's policy, printable GST invoice, add to calendar, invite friends with a personal link, review the event afterwards, and collect a stamp for it in your event passport (badges like City hopper and Night owl). A private calendar feed keeps every event you hold tickets for in Google or Apple Calendar, including time changes and cancellations.
- **Picked for you:** a home-page rail chosen from the hosts you follow, the kinds of event you book and save, and your city, each card saying why.
- **Ask the host:** public questions and answers on every event page; a question stays private between you and the host until it's answered.
- **Report:** flag an event or a public question for the EventHive team.
- **Social:** who's going and interested counts, follow hosts, host profiles with ratings, host updates for ticket holders, and a notification centre (approvals, waitlist, transfers, changes, reminders, and alerts when a saved event is almost sold out or its early-bird price is ending).

**For hosts**
- Event studio with tiers, promo codes, custom questions, refund policy, fee absorption, approval and guest-list visibility, a live preview, and a pre-publish checklist (drafts supported).
- Dashboard with sales by day, page views and conversion, tier breakdown, check-in rate, top referrers, promo usage, pending requests and the waitlist.
- "Run it again": copy any event to a new draft a week later, with fresh tiers and promo codes.
- Guest list with approve and decline, manual admit, search and CSV export; a check-in desk that scans the live QR or takes the door code.
- Door team: add helpers by email; they get a door desk on their own phone (scan, type a code, or admit by name) without seeing emails, money or settings.
- Payouts: what each event pays out and when, net of any fees the host covered.
- Audience: everyone who has booked with you, regulars first, with who follows you, filters, search and CSV export.
- Schedule when tickets go on sale, and offer a group discount, from the event studio.
- Answer guests' questions in public from the event page.
- Post updates to ticket holders, reply to reviews, and cancel an event (everyone is refunded in full and told).

**For admins:** platform totals, host verification (verified badge), and a report queue: dismiss a report, or take the event down (everyone refunded and told) or remove the question.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router, server components, CSS Modules), React 19, TypeScript, Phosphor icons, qrcode.react |
| Backend | Express 5, TypeScript, zod validation |
| Database | MongoDB with Mongoose: atomic seat and promo reservation, partial unique indexes, optimistic concurrency on edits |
| Auth | JWT in an httpOnly cookie on the Next.js origin, forwarded to the API by a same-origin proxy |
| Tests / CI | `node:test` (23 API and domain tests) against MongoDB, GitHub Actions |
| Architecture | Layered (Controller → Service → Repository) with a single error middleware |

## Design system: Hive Print

- **Colour:** paper and ink neutrals, hive yellow for the one primary action, and one colour per category (music pink, tech blue, sports green, art orange, food red, business violet, other teal) on date stamps, tiles and tags. Every text pair meets WCAG AA; ratios are noted in `client/src/app/globals.css`. Light by default, with a dark theme.
- **Type:** Bricolage Grotesque (condensed, heavy) for headlines, Instrument Sans for reading and UI, Geist Mono for ticket codes and figures.
- **Shape:** 12px corners on buttons, inputs and cards, 18px on large panels and photos, pills only on chips; hairline edges and soft layered shadows.
- **Signature details:** the ticket stub with a tear line, rubber-stamp date blocks, a poster-wall hero, and the live ticket with its sweeping sheen.
- **Navigation:** on phones, an app-style bottom tab bar chosen by role (guests: Explore, Tickets, Saved, Alerts, Account; hosts: Explore, Dashboard, Create, Alerts, Account). Hosts move between an event's Overview, Guests and check-in, and Edit with one tab bar. Checkout is a single panel: pick a ticket, pay; promo codes and guest names stay tucked away until needed.
- **Motion:** staggered load-in, scroll reveals, a card-to-page photo morph (React `<ViewTransition>`), a circular theme switch (View Transitions API), confetti on booking. Everything settles under `prefers-reduced-motion`.

## How a request flows

```
Browser ──► Next.js server ──► Express API ──► MongoDB
              │  server components fetch data with the user's token
              │  /api/* proxy forwards browser mutations and sets the auth cookie
              └─ proxy.ts guards /dashboard, /bookings, /saved, /notifications, /settings, /admin
```

- The browser never calls Express directly, so there is no CORS layer and the token never touches JavaScript.
- Every write is validated with zod; unknown fields are stripped, so clients cannot set `organizerId`, `bookedCount` or seat counts.
- Promo codes are never sent to the public; secret addresses and online join links are only sent to ticket holders.

## Business rules

- **Seats:** a booking takes seats from one tier, and a promo use, in a single atomic MongoDB update that only matches while both are available, so concurrent buyers can never oversell or overspend a code. Failures give the seats back.
- **One active booking per guest per event** (pending or confirmed), enforced by a partial unique index.
- **Pricing:** platform fee 2.5% + ₹10 per paid ticket, GST 18% on the fee, Refund Protection 6% of the ticket price (free for waitlist bookings). Hosts can absorb the fee. A group discount comes off first and a promo code applies to what's left; fees are charged on what's actually paid.
- **Refunds:** flexible (until 24h before), moderate (until 7 days before) or strict (none; transfer instead). A booking keeps the policy it was sold under, even if the host changes it later, and can't be cancelled once a ticket has been checked in. Refund Protection refunds everything except its own fee until doors open. Fees are kept otherwise. A host cancelling refunds everything.
- **Approvals:** the request holds seats; payment is captured on approval; declining frees the seats and promotes the waitlist.
- **Waitlist:** oldest first, skipping parties that no longer fit (Meetup-style), booked automatically and notified.
- **Check-in:** only the host, their door team, or an admin; the code must match the ticket's current or previous 30-second step; atomic so a double scan admits once; transferred and cancelled tickets are refused.
- **Edits:** a tier's capacity can't drop below its sales and sold tiers can't be removed; changing the date or venue notifies ticket holders; saving fails with 409 if a booking landed mid-edit.
- **Reviews:** anyone who held a ticket, after the event, once.
- **Sales start:** before an event's on-sale time, bookings and quotes are refused; people who saved it get one "Tickets are on sale" notification once sales open.
- **Reports:** one per person per thing; hosts can't report their own events. Taking an event down cancels it with full refunds; an event that already happened is just hidden.
- **Calendar feed:** a secret link per person (resettable, which kills the old one); it lists events from the last 30 days on, with cancelled ones marked CANCELLED.
- **Questions:** visible to everyone once answered; a guest can have at most 3 waiting per event; the asker or host can remove one.
- **Door team:** up to 10 helpers per event, added by the email on their EventHive account; removing someone ends their access at once.
- **Payouts (simulated):** ticket money is held until the event has happened and paid 3 days later. Payout = ticket sales after discounts, minus fees the host chose to cover, plus ticket money kept from cancellations that weren't refunded (e.g. strict policy).

## OOP and design patterns

- **Inheritance:** `BaseUser` ← `Attendee` / `Organizer` / `Admin`; `BaseEvent` ← `OnlineEvent` / `VenueEvent`; controllers extend `BaseController`.
- **Strategy:** discounts (percent, flat) in `domain/pricing.ts`; refund policies (flexible, moderate, strict) in `domain/policies.ts`.
- **Factory:** `refundPolicyFor(name)` builds the policy stored on an event.
- **Abstraction:** `IPaymentGateway` with mock Stripe and PayPal gateways.
- **Singleton:** the `Database` connection, cached across serverless invocations.
- **Repository:** every Mongoose query lives in `repositories/`.

UML: [class](classDiagram.md), [ER](ErDiagram.md), [sequence](sequenceDiagram.md), [use case](useCaseDiagram.md).

## Project structure

```
├── package.json                 # root scripts: setup, dev (both apps), seed, test, check
├── client/src/
│   ├── app/                     # routes: events, bookings (+ invoice), saved, notifications, hosts,
│   │                            #   collections, settings, dashboard (event studio, analytics, guests), admin, auth
│   ├── components/              # Navbar, EventCard, EventForm, LiveTicketQR, charts/SalesChart, …
│   ├── lib/                     # server.ts (SSR fetch), api.ts (mutations), totp.ts (live ticket codes), format.ts, …
│   └── proxy.ts                 # route protection
├── server/src/
│   ├── domain/                  # pricing, refund policies, rotating codes (pure, unit tested)
│   ├── models/                  # User, Event (tiers, promo codes, questions), Booking, Ticket, Waitlist,
│   │                            #   Notification, Announcement, Review
│   ├── repositories/  services/  controllers/  routes/  middleware/
│   ├── seed.ts                  # demo data, dates relative to today
│   └── tests/                   # api.test.ts, domain.test.ts
└── docs/                        # competitor research and the v2 plan
```

## Local development

Prerequisites: Node.js 20+, and MongoDB running locally (`brew services start mongodb-community`) or an Atlas URI.

```bash
npm run setup                        # install both apps
cp server/.env.example server/.env   # set MONGODB_URI and a random JWT_SECRET
cp client/.env.example client/.env.local
npm run seed                         # demo data (re-run when the demo dates have passed)
npm run dev                          # API on :5001, website on :3000
```

Demo logins (password `password123`), also one tap away on the login page:

| Account | What to try |
|---------|-------------|
| `attendee@eventhive.dev` | Live tickets, a ticket received from a friend, a waitlist spot, an on-sale alert (Coastal Cycling Tour), Notify me on Classic Cinema Night, calendar sync in My Tickets |
| `attendee2@eventhive.dev` | A pending approval request; on the door team for tonight's comedy show (My Tickets → Door duty) |
| `organizer@eventhive.dev` | Dashboard, analytics, audience, payouts, approve requests, answer a waiting question, door team, check-in desk, event studio |
| `admin@eventhive.dev` | Admin console, verify hosts, review reported events (two are waiting) |

Try a promo code: `INDIE20` on Indie Night Live, `FOODIE` on Street Food Carnival.

### Checks

```bash
npm run check    # server typecheck + tests (eventhive_test database), client lint + typecheck
cd client && npm run build
```

CI runs the same on every push with a MongoDB 8 service container.

## Deployment (Vercel, two projects)

**Backend:** root directory `server`, deployed as a serverless function (`vercel.json`). Set `MONGODB_URI`, `JWT_SECRET` and `JWT_EXPIRES_IN` (`7d`).

**Frontend:** root directory `client`. Set `API_URL=https://<your-backend>.vercel.app/api` (server-only; the browser talks to the frontend's own `/api/*` proxy).

## API

All routes are under `/api`. Responses are `{ success, data }` or `{ success: false, error }`; list endpoints add `pagination`. Errors use 400 validation, 401 unauthenticated, 403 forbidden, 404 not found, 409 conflict.

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register`, `/auth/login` | No | Register (`attendee` or `organizer`), log in |
| PATCH | `/auth/profile` | User | Name, city, bio (re-issues the session) |
| GET | `/events` | No | Upcoming events: `q`, `city`, `category`, `eventType`, `from`, `to`, `maxPrice`, `sort`, `page`, `limit` |
| GET | `/events/cities` | No | Cities with upcoming event counts |
| GET | `/events/:id` | Optional | Event; hosts also get promo codes, ticket holders get secret addresses and join links |
| GET | `/events/:id/social` | No | Going, interested, waitlist counts and first names |
| GET | `/events/:id/viewer` | User | My booking, waitlist spot, follow and save state for this event |
| POST | `/events/:id/quote` | No | Live price for a tier, quantity, promo and protection |
| POST | `/events/:id/view` | No | Count a page view (for conversion) |
| GET, POST | `/events/:id/announcements` | Holders / Host | Read or post host updates |
| POST, DELETE | `/events/:id/waitlist` | User | Join or leave the waitlist |
| GET | `/events/:id/waitlist` | Host | The line |
| GET | `/events/:id/analytics` | Host | Sales by day, tiers, check-in, referrers, promos |
| GET, POST | `/events/:id/qa` | Public / User | Questions (answered ones, plus your own; all for the host) or ask one |
| POST | `/events/:id/qa/:qid/answer` | Host | Answer a question in public |
| DELETE | `/events/:id/qa/:qid` | Asker / Host | Remove a question |
| GET | `/events/:id/door` | Host / Door team | Door desk: names, tiers, references, check-in times |
| GET, POST, DELETE | `/events/:id/team…` | Host | Door team: list, add by email, remove |
| POST | `/events` | Organizer | Create (draft or published) |
| PUT | `/events/:id` | Host | Update (tiers merge with sales) |
| POST | `/events/:id/cancel` | Host | Cancel and refund everyone |
| POST | `/events/:id/duplicate` | Host | Copy to a new draft one week later |
| DELETE | `/events/:id` | Host | Delete an event nobody booked |
| GET | `/events/my/events`, `/events/my/stats` | Organizer | My events, daily sales and followers |
| GET | `/events/my/payouts` | Organizer | Payout per event, status and date |
| GET | `/events/my/audience` | Organizer | Everyone who booked: events, tickets, spend, follows |
| POST | `/bookings` | User | Book (`eventId`, `tierId`, `quantity`, `names`, `promoCode`, `protection`, `answers`, `ref`, `followHost`) |
| GET | `/bookings/my`, `/bookings/:id` | User | My bookings with tickets; one booking (invoice) |
| PATCH | `/bookings/:id/cancel` | Buyer | Cancel with the policy refund |
| PATCH | `/bookings/:id/approve`, `/decline` | Host | Decide a request |
| GET | `/bookings/event/:eventId` | Host | Guest list with tickets and answers |
| GET | `/tickets/my` | User | Tickets I hold, with the secret for the live QR |
| POST | `/tickets/:id/transfer` | Holder | Send to another user by email |
| POST | `/tickets/check-in`, `/tickets/:id/admit` | Host / Door team | Scan or type a door code; manual admit |
| GET | `/hosts`, `/hosts/:id` | No | Featured hosts; host profile |
| GET, PUT, DELETE | `/me/saved…`, `/me/following…` | User | Saved events and followed hosts |
| GET, POST | `/me/notifications…` | User | Notification centre, unread count, mark read |
| GET | `/me`, `/me/waitlist` | User | Profile; my waitlist spots |
| GET | `/me/for-you`, `/me/passport`, `/me/door` | User | Picks with reasons; event passport; events I'm on the door for |
| POST | `/me/reports` | User | Report an event or a question |
| GET, POST | `/me/calendar`, `/me/calendar/reset` | User | My private calendar feed token; replace it |
| GET | `/calendar/:token.ics` | Secret link | The calendar feed (iCalendar) |
| POST, PATCH | `/reviews`, `/reviews/:id/reply` | Attendee / Host | Review an ended event; host reply |
| GET | `/reviews/event/:eventId`, `/reviews/recent` | No | Reviews with stats; latest reviews |
| GET, PATCH | `/admin/stats`, `/admin/hosts`, `/admin/hosts/:id` | Admin | Totals; verify hosts |
| GET, PATCH | `/admin/reports`, `/admin/reports/:id` | Admin | Report queue; dismiss or take down |
