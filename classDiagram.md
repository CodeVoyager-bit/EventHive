# Class Diagram

The **object-oriented structure** of the EventHive v2 backend: role inheritance, the layered Controller, Service and Repository design, and the design patterns used (Strategy, Factory, Singleton, Repository, and an abstraction over the payment gateway).

![Class Diagram](./classDiagram.png)

<details>
<summary>Mermaid Source</summary>

```mermaid
classDiagram
    direction LR

    class BaseUser {
        <<abstract>>
        +String id
        +String name
        +String role
        +getPermissions()* String[]
    }
    BaseUser <|-- Attendee
    BaseUser <|-- Organizer
    BaseUser <|-- Admin

    class BaseEvent {
        <<abstract>>
        +String title
        +Date date
        +getDetails()* String
    }
    BaseEvent <|-- VenueEvent
    BaseEvent <|-- OnlineEvent

    class BaseController {
        #sendSuccess(res, data, status)
        #sendPaginated(res, items, total, page, limit)
    }
    BaseController <|-- EventController
    BaseController <|-- BookingController
    BaseController <|-- TicketController
    BaseController <|-- MeController
    BaseController <|-- HostController
    BaseController <|-- AdminController

    class BookingService {
        -IPaymentGateway paymentGateway
        +quote(eventId, order) Quote
        +createBooking(userId, input) Booking
        +approve(bookingId, host) Booking
        +decline(bookingId, host) Booking
        +cancelBooking(bookingId, userId) Booking
        +promoteWaitlist(eventId)
        +cancelEvent(eventId, host) Event
    }
    class TicketService {
        +issue(booking, buyerName) Ticket[]
        +transfer(ticketId, userId, email) Ticket
        +checkIn(eventId, doorCode, doorUser)
        +admitById(ticketId, doorUser)
    }
    class DoorService {
        +getDoorEvent(eventId, user) Event
        +add(eventId, host, email) TeamMember[]
        +remove(eventId, host, userId) TeamMember[]
        +desk(eventId, user) DoorDesk
    }
    class QuestionService {
        +ask(eventId, userId, body) HostQuestion
        +answer(eventId, questionId, host, body) HostQuestion
        +list(eventId, viewer) HostQuestion[]
    }
    class PayoutService {
        +forHost(hostId) Payouts
    }
    class AudienceService {
        +forHost(hostId) Audience
    }
    class ReportService {
        +report(userId, input)
        +queue() ReportGroup[]
        +resolve(reportId, admin, action)
    }
    class UserService {
        +forYou(userId) Pick[]
        +passport(userId) Passport
        +calendarFeed(token, web) string
    }
    class EventService {
        +createEvent(input, hostId) Event
        +updateEvent(id, host, input) Event
        +getPublicEvent(id, viewer)
        +getAnalytics(id, host) Analytics
        +getSocial(id) Social
    }
    class NotificationService {
        +notify(userIds, note)
        +list(userId, limit)
    }

    class IPaymentGateway {
        <<interface>>
        +processPayment(amount, userId) PaymentResult
        +refundPayment(transactionId) boolean
    }
    IPaymentGateway <|.. MockStripeGateway
    IPaymentGateway <|.. MockPayPalGateway

    class RefundPolicy {
        <<interface>>
        +name
        +refundableUntil(eventDate) Date
    }
    RefundPolicy <|.. WindowPolicy : flexible, moderate
    RefundPolicy <|.. StrictPolicy
    class RefundPolicyFactory {
        +refundPolicyFor(name) RefundPolicy
    }

    class Database {
        <<singleton>>
        -Database instance$
        +getInstance()$ Database
        +connect(uri)
    }

    class EventRepository {
        +reserveSeats(eventId, tierId, qty, promo) boolean
        +releaseSeats(eventId, tierId, qty)
    }
    class BookingRepository {
        +transition(id, from, set) Booking
    }
    class TicketRepository {
        +markCheckedIn(id) Ticket
        +transfer(id, fromOwner, set) Ticket
    }

    BookingController --> BookingService
    TicketController --> TicketService
    EventController --> EventService
    BookingService --> IPaymentGateway
    BookingService --> RefundPolicyFactory
    BookingService --> TicketService
    BookingService --> NotificationService
    BookingService --> EventRepository
    BookingService --> BookingRepository
    TicketService --> TicketRepository
    TicketService --> DoorService
    DoorService --> EventRepository
    QuestionService --> NotificationService
    PayoutService --> BookingRepository
    EventController --> QuestionService
    EventController --> DoorService
    EventController --> PayoutService
    MeController --> UserService
    MeController --> ReportService
    AdminController --> ReportService
    ReportService --> BookingService : take down = cancelEvent
    EventController --> AudienceService
    AudienceService --> BookingRepository
    EventService --> EventRepository
    RefundPolicyFactory ..> RefundPolicy : creates
```
</details>
