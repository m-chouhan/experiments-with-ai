const fs = require('fs');

const VEHICLES = {
  bike: { rate: 10, fits: ['small', 'medium', 'large'] },
  car: { rate: 20, fits: ['medium', 'large'] },
  truck: { rate: 50, fits: ['large'] },
};

const SPOTS = [
  { id: 'S1', size: 'small' }, { id: 'S2', size: 'small' },
  { id: 'M1', size: 'medium' }, { id: 'M2', size: 'medium' }, { id: 'M3', size: 'medium' },
  { id: 'L1', size: 'large' },
];

class ParkingLot {
  constructor(spots) {
    this.spots = spots;
    this.tickets = new Map();
  }

  park(plate, type) {
    const taken = new Set([...this.tickets.values()].map((t) => t.spot));
    for (const size of VEHICLES[type].fits) {
      const spot = this.spots.find((s) => s.size === size && !taken.has(s.id));
      if (spot) {
        const ticket = { plate, type, spot: spot.id };
        this.tickets.set(plate, ticket);
        return ticket;
      }
    }
    return null;
  }

  find(plate) {
    return this.tickets.get(plate);
  }

  leave(plate) {
    const ticket = this.tickets.get(plate);
    this.tickets.delete(plate);
    return ticket;
  }
}

class Pricing {
  fee(ticket, hours) {
    return VEHICLES[ticket.type].rate * hours;
  }
}

class Cli {
  constructor(lot, pricing) {
    this.lot = lot;
    this.pricing = pricing;
  }

  handle(line) {
    const [command, plate, arg, ...extra] = line.trim().split(/\s+/);
    if (arg === undefined || extra.length) return 'INVALID';
    if (command === 'park') return this.park(plate, arg);
    if (command === 'leave' || command === 'quote') return this.charge(command, plate, arg);
    return 'INVALID';
  }

  park(plate, type) {
    if (this.lot.find(plate)) return `ALREADY PARKED ${plate}`;
    if (!VEHICLES[type]) return 'INVALID';
    const ticket = this.lot.park(plate, type);
    return ticket ? `PARKED ${plate} ${ticket.spot}` : `FULL ${plate}`;
  }

  charge(command, plate, hoursText) {
    const hours = Number(hoursText);
    if (!Number.isInteger(hours) || hours < 1) return 'INVALID';
    const ticket = this.lot.find(plate);
    if (!ticket) return `NOT FOUND ${plate}`;
    const fee = this.pricing.fee(ticket, hours);
    if (command === 'quote') return `QUOTE ${plate} FEE ${fee}`;
    this.lot.leave(plate);
    return `LEFT ${plate} ${ticket.spot} FEE ${fee}`;
  }
}

const cli = new Cli(new ParkingLot(SPOTS), new Pricing());
for (const line of fs.readFileSync(0, 'utf8').split('\n')) {
  if (line.trim()) console.log(cli.handle(line));
}
