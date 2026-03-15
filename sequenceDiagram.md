# Sequence Diagram

This diagram visualizes the **Ticket Booking Flow**, demonstrating how the Controller, Service, and Database layers interact to handle bookings and concurrency.

![Sequence Diagram](./sequenceDiagram.png)

<details>
<summary>Mermaid Source</summary>

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant "Booking Controller" as Controller
    participant "Event Service" as Service
    participant "Data Access Layer" as DB

    User->>Frontend: Select Event & Ticket Type
    Frontend->>Controller: POST /api/bookings (eventId, ticketType)
    activate Controller
    
    Controller->>Service: createBooking(userId, eventId, ticketType)
    activate Service
    
    Service->>DB: findEventById(eventId)
    activate DB
    DB-->>Service: Event Details (capacity, sold)
    deactivate DB

    alt Ticket Available
        Service->>DB: decrementAvailableTickets(eventId)
        activate DB
        DB-->>Service: Success
        deactivate DB

        Service->>DB: saveBooking(userId, eventId)
        activate DB
        DB-->>Service: Booking Object
        deactivate DB

        Service-->>Controller: Booking Success
        Controller-->>Frontend: 201 Created (Booking Details)
        Frontend-->>User: Show Booking Confirmation & QR Code
    else Ticket Sold Out
        Service-->>Controller: Error: Tickets Sold Out
        Controller-->>Frontend: 400 Bad Request
        Frontend-->>User: Show Sold Out Message
    end
    deactivate Service
    deactivate Controller
```
</details>
