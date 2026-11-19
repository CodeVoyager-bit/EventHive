# ER Diagram

The **MongoDB schema** for EventHive v2. An event embeds its ticket tiers, promo codes and questions, so a booking can reserve seats and spend a promo use in one atomic update. A booking is the order; each admission it buys is a ticket, which can change owner when transferred.

![ER Diagram](./ErDiagram.png)

<details>
<summary>Mermaid Source</summary>

```mermaid
erDiagram
    users {
        ObjectId _id PK
        string name
        string email UK
        string role "attendee | organizer | admin"
        string city
        string bio
        boolean verified
        ObjectId[] saved FK
        ObjectId[] following FK
        string calendarToken UK "secret feed link"
    }
    events {
        ObjectId _id PK
        ObjectId organizerId FK
        string title
        date date
        string location "city or Online"
        string eventType "venue | online"
        int capacity "total of tiers"
        int bookedCount
        number price "cheapest tier"
        boolean requiresApproval
        boolean secretLocation
        boolean showGuests
        boolean absorbFees
        string refundPolicy "flexible | moderate | strict"
        string status "draft | published | cancelled"
        int views
        ObjectId[] team FK "door helpers"
        date salesStart "on sale from"
        object groupDiscount "minQty, percent"
    }
    tiers {
        ObjectId _id PK
        string name
        number price
        int capacity
        int remaining
        date salesEnd
        int maxPerOrder
    }
    promo_codes {
        string code
        string kind "percent | flat"
        number amount
        int limit
        int remaining
        date expiresAt
    }
    questions {
        ObjectId _id PK
        string label
        boolean required
    }
    bookings {
        ObjectId _id PK
        ObjectId userId FK
        ObjectId eventId FK
        ObjectId tierId
        int quantity
        object pricing "subtotal discount fee gst protection total"
        boolean protection
        string status "pending | confirmed | declined | cancelled"
        ObjectId referrerId FK
        boolean viaWaitlist
        number refundAmount
    }
    tickets {
        ObjectId _id PK
        ObjectId bookingId FK
        ObjectId eventId FK
        ObjectId ownerId FK
        string holderName
        string ref UK "per event"
        string secret "rotating code seed"
        string status "valid | void"
        date checkedInAt
        date transferredAt
    }
    waitlists {
        ObjectId _id PK
        ObjectId eventId FK
        ObjectId userId FK
        int quantity
        string status "waiting | promoted | left"
    }
    notifications {
        ObjectId _id PK
        ObjectId userId FK
        string kind
        string title
        string link
        date readAt
    }
    host_questions {
        ObjectId _id PK
        ObjectId eventId FK
        ObjectId userId FK
        string body
        object answer "host's answer; public once set"
    }
    reports {
        ObjectId _id PK
        string kind "event | question"
        ObjectId targetId FK
        ObjectId eventId FK
        ObjectId reporterId FK
        string reason
        string status "open | dismissed | removed"
    }
    announcements {
        ObjectId _id PK
        ObjectId eventId FK
        ObjectId authorId FK
        string body
    }
    reviews {
        ObjectId _id PK
        ObjectId eventId FK
        ObjectId userId FK
        int rating
        string comment
        object reply "host answer"
    }

    users ||--o{ events : hosts
    events ||--|{ tiers : embeds
    events ||--o{ promo_codes : embeds
    events ||--o{ questions : embeds
    users ||--o{ bookings : places
    events ||--o{ bookings : has
    bookings ||--o{ tickets : issues
    users ||--o{ tickets : holds
    users ||--o{ waitlists : joins
    events ||--o{ waitlists : has
    users ||--o{ notifications : receives
    events ||--o{ announcements : posts
    events ||--o{ host_questions : "asked about"
    users ||--o{ host_questions : asks
    users }o--o{ events : "on door team"
    users ||--o{ reports : files
    events ||--o{ reports : "reported in"
    users ||--o{ reviews : writes
    events ||--o{ reviews : receives
    users }o--o{ users : follows
```
</details>
