# EventHive

A full-stack event management platform where organizers create events and attendees discover & book tickets.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript |
| Backend | Express, TypeScript |
| Database | MongoDB |
| Auth | JWT + bcrypt |
| Architecture | Layered (Controller → Service → Repository) |

## Project Structure

```
├── client/           # Next.js frontend
│   └── src/
│       ├── app/      # Pages (Home, Events, Auth, Dashboard, Bookings)
│       ├── components/  # Navbar, Footer, EventCard
│       ├── lib/      # API client
│       └── types/    # TypeScript interfaces
├── server/           # Express backend
│   └── src/
│       ├── config/   # Database singleton
│       ├── controllers/
│       ├── interfaces/  # IPaymentGateway abstraction
│       ├── middleware/  # Auth + RBAC
│       ├── models/   # Mongoose schemas (User, Event, Booking, Review)
│       ├── repositories/
│       ├── routes/
│       └── services/
├── idea.md           # Project concept document
└── *Diagram.*        # UML diagrams (Class, ER, Sequence, Use Case)
```

## OOP & Design Patterns

- **Inheritance**: `User` ← `Attendee` / `Organizer` / `Admin`; `Event` ← `OnlineEvent` / `VenueEvent`
- **Abstraction**: `IPaymentGateway` interface with `MockPaymentGateway` implementation
- **Factory**: `TicketFactory` creates VIP / General tickets
- **Singleton**: `Database` connection

## Setup (Local Development)

### Prerequisites
- Node.js ≥ 18
- MongoDB running locally (or a MongoDB Atlas URI)

### Backend
```bash
cd server
npm install
cp .env.example .env    # Then edit .env with your values
npm run dev             # Starts on http://localhost:5001
```

### Frontend
```bash
cd client
npm install
npm run dev             # Starts on http://localhost:3000
```

## Deployment

### Backend (Render / Railway)
1. Push code to GitHub
2. Create a new Web Service on [Render](https://render.com)
3. Set root directory to `server`
4. Build command: `npm install && npm run build`
5. Start command: `npm run start`
6. Add environment variables in dashboard:
   - `PORT` = `5001`
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `JWT_SECRET` = a strong random string
   - `JWT_EXPIRES_IN` = `7d`
   - `CORS_ORIGIN` = your Vercel frontend URL

### Frontend (Vercel)
1. Import the GitHub repo on [Vercel](https://vercel.com)
2. Set root directory to `client`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend-url.onrender.com/api`
4. Deploy

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/events` | No | List events |
| GET | `/api/events/:id` | No | Event detail |
| POST | `/api/events` | Organizer | Create event |
| PUT | `/api/events/:id` | Organizer | Update event |
| DELETE | `/api/events/:id` | Organizer | Delete event |
| POST | `/api/bookings` | Attendee | Book ticket |
| GET | `/api/bookings/my` | User | My bookings |
| POST | `/api/reviews` | User | Leave review |
| GET | `/api/health` | No | Health check |
