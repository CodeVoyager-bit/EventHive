# Project Idea: EventHive

## 1. Overview
**EventHive** is a comprehensive full-stack web application designed to facilitate the discovery, organization, and management of events. It connects event organizers with attendees, providing a seamless experience for creating events, booking tickets, and managing attendance.

## 2. Scope
The application will serve three primary types of users:
-   **Attendees**: Can browse, search, and book tickets for events.
-   **Organizers**: Can create, update, and manage their events and view sales stats.
-   **Admins**: Manage users, approve events (optional), and oversee platform activity.

The backend will be the core of the system, handling authentication, business logic for bookings, and data consistency, built with **TypeScript and Express**.

## 3. Key Features
### User Management
-   Secure User & Organizer Sign-up/Login (JWT Auth).
-   Profile Management.
-   **RBAC (Role-Based Access Control)**: Middleware to secure easy-to-miss endpoints.

### Event Management (Organizers)
-   **CRUD Operations**: Create, Read, Update, Delete events.
-   **Ticket Management**: specific types (VIP, General), quantity limits.
-   **Dashboard**: View attendees list and revenue.

### Booking & Ticketing (Attendees)
-   **Event Discovery**: Search by category, date, or location.
-   **Booking Flow**: Reserve tickets, handle concurrency (preventing overbooking).
-   **My Tickets**: View booking history and QR code (simulated).

### System Features
-   **Reviews**: Attendees can rate events after they end.

## 4. Technology Stack
-   **Backend**: Node.js, Express, TypeScript (Strict typing for robustness).
-   **Database**: MongoDB (Flexible schema for events).
-   **Frontend**: React (for the 25% component).
-   **Architecture**: Layered Architecture (Controller-Service-Repository).


## 5. Software Engineering Practices & OOP Focus (75% Backend Score)
To maximize the backend score, we will strictly follow **SOLID principles** and **OOP**.

### Key OOP Concepts Implementation:
1.  **Encapsulation**: 
    -   `BaseController` class to handle common responses (success/error).
    -   Services (e.g., `EventService`) hide business logic from Controllers.
2.  **Inheritance**:
    -   `User` (Base) -> `Organizer`, `Atendee`, `Admin`. All share `login()` but have different `permissions`.
    -   `Event` (Base) -> `OnlineEvent` (has `meetingLink`), `VenueEvent` (has `address`, `mapLocation`).
3.  **Abstraction**:
    -   `IPaymentGateway` interface (e.g., `MockStripe`, `MockPayPal`) to process payments without coupling to a specific provider.

### Design Patterns
-   **Factory Pattern**: To create `Ticket` objects (VIP vs Regular) based on user selection.
-   **Singleton Pattern**: For the Database Connection instance.

## 6. Why EventHive?
-   **Complex Relationships**: `User` 1:N `Booking` N:1 `Ticket` N:1 `Event` (Excellent for ER Diagrams).
-   **Business Logic**: Handling ticket availability (locking tickets during checkout) shows real system design depth.
-   **Scalability**: The modular structure allows easy addition of features (e.g., waiting lists).
