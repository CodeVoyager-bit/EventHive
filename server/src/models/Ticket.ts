// Ticket interface and Factory Pattern

export interface ITicket {
  type: "general" | "vip";
  price: number;
  label: string;
}

class GeneralTicket implements ITicket {
  type: "general" = "general";
  label: string = "General Admission";

  constructor(public price: number) {}
}

class VIPTicket implements ITicket {
  type: "vip" = "vip";
  label: string = "VIP Access";

  constructor(basePrice: number) {
    this.price = basePrice * 2; // VIP costs double
  }

  price: number;
}

// Factory Pattern: creates ticket objects based on type
export class TicketFactory {
  static createTicket(type: "general" | "vip", basePrice: number): ITicket {
    switch (type) {
      case "vip":
        return new VIPTicket(basePrice);
      case "general":
      default:
        return new GeneralTicket(basePrice);
    }
  }
}
