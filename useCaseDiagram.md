# Use Case Diagram

The following diagram illustrates the interactions between the **Attendee**, **Organizer**, and **System** actors within the EventHive application.

![Use Case Diagram](./useCaseDiagram.png)

<details>
<summary>Mermaid Source</summary>

```mermaid
graph TD
    %% Actors
    A[👤 Attendee]
    O[👤 Organizer]
    AD[👤 Admin]

    %% System Boundary
    subgraph EventHive_System [EventHive System]
        direction TB
        UC1([Register / Login])
        
        UC2([Browse & Search Events])
        UC3([View Event Details])
        UC4([Book Ticket])
        UC5([View My Bookings])
        UC6([Cancel Booking])
        UC7([Leave Review])
        UC8([View Reviews])

        UC9([Create Event])
        UC10([Update Event])
        UC11([Delete Event])
        UC12([View My Events])
        UC13([View Event Bookings])

        UC14([Ban User])
        UC15([Approve Event])
    end

    %% Relationships
    A --> UC1
    A --> UC2
    A --> UC3
    A --> UC4
    A --> UC5
    A --> UC6
    A --> UC7
    A --> UC8

    O --> UC1
    O --> UC9
    O --> UC10
    O --> UC11
    O --> UC12
    O --> UC13
    
    AD --> UC1
    AD --> UC14
    AD --> UC15

    %% Includes
    UC4 -.->|include| UC1
    UC6 -.->|include| UC1
    UC7 -.->|include| UC1
    UC9 -.->|include| UC1
    UC10 -.->|include| UC1
    UC11 -.->|include| UC1
    UC12 -.->|include| UC1
    UC13 -.->|include| UC1

    %% Styling
    classDef actor fill:#fff,stroke:#333,stroke-width:2px;
    classDef usecase fill:#f9f9f9,stroke:#333,stroke-width:2px,rx:20,ry:20;
    
    class A,O,AD actor;
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9,UC10,UC11,UC12,UC13,UC14,UC15 usecase;
```
</details>
