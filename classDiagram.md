# Class Diagram

The following class diagram outlines the **Object-Oriented Structure** of the system, highlighting Inheritance (UserRoles), Factory Pattern (TicketFactory), and Relationships.

![Class Diagram](./classDiagram.png)

<details>
<summary>Mermaid Source</summary>

```mermaid
classDiagram
    class User {
        +String id
        +String name
        +String email
        +String password
        +login()
        +updateProfile()
    }

    class Organizer {
        +List~Event~ myEvents
        +createEvent()
        +viewSalesStats()
    }

    class Attendee {
        +List~Booking~ bookingHistory
        +bookTicket()
        +leaveReview()
    }

    class Admin {
        +banUser()
        +approveEvent()
    }

    User <|-- Organizer
    User <|-- Attendee
    User <|-- Admin

    class Event {
        +String id
        +String title
        +Date date
        +String description
        +int totalCapacity
        +int availableTickets
        +getDetails()
    }

    class OnlineEvent {
        +String meetingLink
        +String platform
    }

    class VenueEvent {
        +String address
        +String mapLocation
    }

    Event <|-- OnlineEvent
    Event <|-- VenueEvent

    class Ticket {
        +String id
        +double price
        +String type
    }
    
    class TicketFactory {
        +createTicket(type): Ticket
    }

    class Booking {
        +String id
        +Date bookingDate
        +String status
        +generateQRCode()
    }

    Organizer "1" --> "*" Event : manages
    Attendee "1" --> "*" Booking : makes
    Booking "1" --> "1" Event : for
    Booking "1" --> "1" Ticket : includes
    TicketFactory ..> Ticket : creates
```
</details>
