# Competitor study

Researched 14 November 2026 across 26 platforms in four groups. Claims come from each company's product pages, help centres and trade press; sources are linked inline. Where a page blocked automated reading, the claim rests on a search snippet of the official page.

## Who we looked at

| Group | Companies | What they are best at |
|---|---|---|
| Global ticketing | Eventbrite, Ticketmaster, SeatGeek, StubHub, AXS | Checkout at scale, anti-fraud tickets, resale rules |
| India | BookMyShow, District (ex-Paytm Insider), Townscript (shut down), KonfHub, AllEvents.in | City-first discovery, GST, UPI, WhatsApp, refund add-ons |
| Social and community | Luma, Meetup, Partiful, Posh, DICE, Resident Advisor, Fever, Shotgun | Waitlists, approvals, guest lists, hosts people follow |
| Event management | Cvent, Bizzabo, Whova, Airmeet, Hubilo (now Brandlive), Swapcard, Tito | Organizer tooling, analytics, check-in, referrals |

## Signature features worth knowing

**Tickets that cannot be screenshotted.** Ticketmaster SafeTix uses an account-bound barcode that refreshes about every 15 seconds ([source](https://business.ticketmaster.com/safetix/), [teardown](https://www.digitalmusicnews.com/2024/07/11/ticketmaster-tickets-reverse-engineered/)). AXS Mobile ID refreshes every 60 seconds and SeatGeek rotates NFL QR codes every 15 seconds ([source](https://support.seatgeek.com/hc/en-us/articles/360022676134-How-are-my-NFL-tickets-delivered)). BookMyShow m-tickets use a changing QR and reject screenshots. DICE and Resident Advisor only reveal the code close to the event.

**Waitlists that refill themselves.** Meetup promotes waitlisted members in join order and skips anyone whose plus-ones do not fit ([source](https://help.meetup.com/hc/en-us/articles/41229648295181-How-to-Join-an-Event-Waitlist-on-Meetup)). DICE hands returned tickets to the next fan at face value. Tito sends a single-use offer link that expires ([source](https://help.tito.io/en/articles/2003015-waiting-lists)). Eventbrite lists an automatic waitlist on its 2026 roadmap ([source](https://www.eventbrite.com/product-updates/roadmap-2026)).

**Approval-required and secret events.** Luma can require approval, only charges when the host approves, and can hide the exact location until a guest is approved ([source](https://help.luma.com/p/hiding-your-event-location)). Cvent and Posh offer the same pending, approved, declined flow.

**Honest pricing and refunds.** US rules made all-in pricing mandatory in May 2025 ([source](https://www.pbs.org/newshour/nation/a-biden-era-junk-fee-rule-is-now-in-effect-ticketmaster-says-it-will-display-fees-more-clearly)). District sells a Refund Guarantee add-on at checkout ([source](https://district.in/policies/events/booking-terms)). Townscript let organizers choose who pays the platform fee and issued GST invoices ([source](https://support.townscript.com/support/solutions/articles/1000234738)). Tito publishes a "small print" page with each event's refund schedule.

**Ticket tiers and promo codes.** Eventbrite and Resident Advisor schedule price tiers (early bird, then general). Tito auto-applies discount codes from a link and supports volume discounts ([source](https://pro.tito.io/docs/docs.md)). Whova does group tickets with bundle discounts.

**Transfers and groups.** BookMyShow lets each member of a group receive their own ticket; AXS transfers are free and unlimited; SeatGeek Parties lets the buyer assign, revoke and reassign seats ([source](https://www.digitalmusicnews.com/2024/08/22/seatgeek-ticket-sharing-management-features/)).

**Social proof from real data.** Luma shows the guest count and a few faces, never emails, and the host can hide it ([source](https://help.luma.com/p/event-guest-list)). BookMyShow shows "interested" counts. Eventbrite adds labels such as "few tickets left" and "sales end soon" ([source](https://www.eventbrite.com/l/get-discovered)).

**Following hosts.** Eventbrite makes buyers follow the organizer and emails followers when a new event is published ([source](https://www.eventbrite.com/l/newsletter-signup/)). Luma is built around calendars people subscribe to ([source](https://help.luma.com/p/luma-calendar-overview)). Shotgun, Resident Advisor and AllEvents let fans follow organizers, artists and venues.

**Referral loops.** Whova gives every registrant a personal link and shows the organizer a leaderboard of visits, tickets and revenue per referrer ([source](https://whova.com/blog/registration-referral-contest/)). KonfHub counts only completed registrations ([source](https://help.konfhub.com/dashboard/gamification)). Posh Kickback pays commission on tickets sold through a buyer's link.

**Discovery.** BookMyShow and District are city-first. District shows Instagram-style category stories ([source](https://www.plotline.so/inspiration/district-uses-stories-to-showcase-local-experiences)). Eventbrite's It-Lists are curated city guides ([source](https://www.ticketnews.com/2025/03/eventbrite-launches-app-update-with-discover-tab/)). Ticketmaster's Watchlist sends reminders from announcement day to show day ([source](https://blog.ticketmaster.com/new-app-features/)).

**Host updates and reminders.** Posh has a ticket-holder-only activity feed with pinned host posts. Luma sends reminders a day and an hour before, by WhatsApp in India ([source](https://help.luma.com/p/sms-whatsapp-messages)). Eventbrite automatically tells attendees when the date or venue changes.

**After the event.** Luma emails a one-tap emoji rating when the event ends ([source](https://help.luma.com/p/collect-feedback-from-your-event-guests)). Meetup group reviews let organizers reply. Ticketmaster invites fan reviews within 72 hours.

**Organizer tooling.** Whova runs a pre-publish setup check. Tito records the source of each sale and lets staff check in by link. Luma has a check-in only staff role and an express scan mode ([source](https://help.luma.com/p/check-in)). Cvent and Airmeet produce post-event recaps; Swapcard and Hubilo score attendee engagement.

## What this means for EventHive

1. Every big player now treats the ticket itself as an anti-fraud object. A rotating QR is cheap to build with Node's `crypto` and is the most visible upgrade we can make.
2. Waitlists, approvals and transfers solve the same problem: getting the right person into a scarce seat. They share one booking state machine, so they belong together in the domain model.
3. Indian platforms win on clarity: city first, GST shown, fees explained, refund rules stated up front.
4. The host relationship (follow, updates, reviews, replies) is what brings people back. Email is out of scope for this project, so it is delivered through an in-app notification centre.
5. Organizers judge a platform by its dashboard: sales by day, tier breakdown, check-in rate and where buyers came from.

The feature plan and system design built from this study are in [v2-plan.md](v2-plan.md).
