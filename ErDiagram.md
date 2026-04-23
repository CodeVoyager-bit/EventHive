# ER Diagram

This Entity-Relationship diagram defines the **MongoDB Schema** structure, detailing the relationships between Users, Events, Bookings, and Reviews.

![ER Diagram](./ErDiagram.png)

<details>
<summary>Mermaid Source</summary>

```mermaid
erDiagram
    users {
        ObjectId _id PK
        string name
        string email
        string password
        string role "attendee | organizer | admin"
        date createdAt
    }

    events {
        ObjectId _id PK
        string title
        string description
        date date
        string location
        int capacity
        int bookedCount
        double price
        string category
        string imageUrl
        ObjectId organizerId FK
        string eventType "online | venue"
        string meetingLink
        string platform
        string address
        string mapLocation
        string status "draft | published | cancelled"
        date createdAt
    }

    bookings {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId eventId FK
        date bookingDate
        string status "confirmed | cancelled"
        string ticketType "general | vip"
        string ticketCode
        double amount
    }

    reviews {
        ObjectId _id PK
        ObjectId eventId FK
        ObjectId userId FK
        int rating
        string comment
        date createdAt
    }

    users ||--o{ events : "organizes"
    users ||--o{ bookings : "makes"
    events ||--o{ bookings : "has"
    users ||--o{ reviews : "writes"
    events ||--o{ reviews : "receives"
```
</details>
