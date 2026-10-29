const fs = require('fs');

const VEHICLES = {
  bike: { rate: 10, fits: ['small', 'medium', 'large'] },
  car: { rate: 20, fits: ['medium', 'large'] },
  truck: { rate: 50, fits: ['large'] },
  ev: { rate: 20, fits: ['charging', 'medium', 'large'] },
};

const CHARGING_RATE = 10;
const MAX_BILLED_HOURS = 8;
const PASS_DISCOUNT = 0.5;

const SPOTS = [
  { id: 'S1', size: 'small' }, { id: 'S2', size: 'small' },
  { id: 'M1', size: 'medium' }, { id: 'M2', size: 'medium' }, { id: 'M3', size: 'medium' },
  { id: 'L1', size: 'large' },
  { id: 'C1', size: 'charging' }, { id: 'C2', size: 'charging' },
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
        const ticket = { plate, type, spot: spot.id, size: spot.size };
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
  constructor() {
    this.passes = new Set();
  }

  addPass(plate) {
    this.passes.add(plate);
  }

  fee(ticket, hours) {
    const charging = ticket.size === 'charging' ? CHARGING_RATE : 0;
    const capped = (VEHICLES[ticket.type].rate + charging) * Math.min(hours, MAX_BILLED_HOURS);
    return this.passes.has(ticket.plate) ? capped * PASS_DISCOUNT : capped;
  }
}

class Cli {
  constructor(lot, pricing) {
    this.lot = lot;
    this.pricing = pricing;
  }

  handle(line) {
    const [command, plate, arg, ...extra] = line.trim().split(/\s+/);
    if (command === 'pass') {
      if (plate === undefined || arg !== undefined) return 'INVALID';
      this.pricing.addPass(plate);
      return `PASS ${plate}`;
    }
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
