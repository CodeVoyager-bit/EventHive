# Sequence Diagram

Two flows from EventHive v2: **booking a ticket** (live quote, atomic seat and promo reservation, payment, tickets) and **getting in at the door** with the rotating QR code.

![Sequence Diagram](./sequenceDiagram.png)

<details>
<summary>Mermaid Source</summary>

```mermaid
sequenceDiagram
    autonumber
    actor Guest
    participant Web as Next.js (proxy)
    participant BC as BookingController
    participant BS as BookingService
    participant ER as EventRepository
    participant PG as IPaymentGateway
    participant TS as TicketService
    participant DB as MongoDB
    actor Host

    Guest->>Web: Pick tier, quantity, promo, Refund Protection
    Web->>BC: POST /events/:id/quote
    BC->>BS: quote()
    BS-->>Web: subtotal, discount, fee, GST, total
    Guest->>Web: Pay
    Web->>BC: POST /bookings (JWT from httpOnly cookie)
    BC->>BS: createBooking(userId, input)
    BS->>ER: reserveSeats(tier, qty, promo)
    ER->>DB: updateOne where remaining >= qty and promo uses > 0
    alt sold out or promo used up
        DB-->>BS: modifiedCount 0
        BS-->>Guest: 409 with the reason
    else seats held
        BS->>PG: processPayment(total)
        PG-->>BS: transactionId
        BS->>DB: insert booking (confirmed)
        BS->>TS: issue(booking)
        TS->>DB: insert one ticket per seat, each with a secret
        BS-->>Guest: 201 booking
    end

    Note over Guest,Host: At the door
    Guest->>Guest: Phone computes HMAC(secret, 30s step) and shows QR + door code
    Host->>Web: Scan QR (or type the door code)
    Web->>TS: POST /tickets/check-in
    TS->>DB: find ticket by event and ref
    TS->>TS: verify code for this step or the previous one
    TS->>DB: set checkedInAt only if not already set
    TS-->>Host: Admitted (or refused: expired, used, cancelled)
```
</details>
