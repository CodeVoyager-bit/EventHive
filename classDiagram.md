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
        +String role
        +Date createdAt
        +getPublicProfile()
    }

    class BaseUser {
        <<abstract>>
        +String id
        +String name
        +String email
        +String role
        +getPermissions()*
    }

    class Organizer {
        +getPermissions()
    }

    class Attendee {
        +getPermissions()
    }

    class Admin {
        +getPermissions()
    }

    BaseUser <|-- Organizer
    BaseUser <|-- Attendee
    BaseUser <|-- Admin

    class Event {
        +String id
        +String title
        +String description
        +Date date
        +String location
        +int capacity
        +int bookedCount
        +double price
        +String category
        +String imageUrl
        +String eventType
        +String status
        +Date createdAt
    }

    class BaseEvent {
        <<abstract>>
        +String title
        +String description
        +Date date
        +int capacity
        +double price
        +getDetails()*
        +isAvailable()
    }

    class OnlineEvent {
        +String meetingLink
        +String platform
        +getDetails()
    }

    class VenueEvent {
        +String address
        +String mapLocation
        +getDetails()
    }

    BaseEvent <|-- OnlineEvent
    BaseEvent <|-- VenueEvent

    class Ticket {
        <<interface>>
        +String type
        +double price
        +String label
    }
    
    class GeneralTicket {
        +String type
        +double price
        +String label
    }

    class VIPTicket {
        +String type
        +double price
        +String label
    }

    Ticket <|-- GeneralTicket
    Ticket <|-- VIPTicket

    class TicketFactory {
        +createTicket(type, basePrice): Ticket
    }

    class Booking {
        +String id
        +String userId
        +String eventId
        +Date bookingDate
        +String status
        +String ticketType
        +String ticketCode
        +double amount
    }

    class Review {
        +String id
        +String eventId
        +String userId
        +int rating
        +String comment
        +Date createdAt
    }

    Organizer "1" --> "*" Event : manages
    Attendee "1" --> "*" Booking : makes
    Attendee "1" --> "*" Review : writes
    Booking "1" --> "1" Event : for
    Review "1" --> "1" Event : belongs to
    Booking "1" --> "1" Ticket : includes
    TicketFactory ..> Ticket : creates
```
</details>
