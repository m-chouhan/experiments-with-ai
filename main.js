const fs = require('fs');

const VEHICLES = {
  bike: { rate: 10, fits: ['small', 'medium', 'large'] },
  car: { rate: 20, fits: ['medium', 'large'] },
  truck: { rate: 50, fits: ['large'] },
  ev: { rate: 20, fits: ['medium', 'large'], charging: 10 },
};

const SPOTS = [
  { id: 'C1', charging: true, size: 'medium' }, { id: 'C2', charging: true, size: 'medium' },
  { id: 'S1', size: 'small' }, { id: 'S2', size: 'small' },
  { id: 'M1', size: 'medium' }, { id: 'M2', size: 'medium' }, { id: 'M3', size: 'medium' },
  { id: 'L1', size: 'large' },
];

class ParkingLot {
  constructor(spots) {
    this.spots = spots;
    this.tickets = new Map();
    this.passes = new Set();
  }

  park(plate, type) {
    const taken = new Set([...this.tickets.values()].map((t) => t.spot));

    if (type === 'ev') {
      const chargingSpot = this.spots.find((s) => s.charging && !taken.has(s.id));
      if (chargingSpot) {
        const ticket = { plate, type, spot: chargingSpot.id, charging: true };
        this.tickets.set(plate, ticket);
        return ticket;
      }
    }

    for (const size of VEHICLES[type].fits) {
      const spot = this.spots.find((s) => !s.charging && s.size === size && !taken.has(s.id));
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

  registerPass(plate) {
    this.passes.add(plate);
  }

  hasPass(plate) {
    return this.passes.has(plate);
  }
}

class Pricing {
  constructor(lot) {
    this.lot = lot;
  }

  fee(ticket, hours) {
    const cappedHours = Math.min(hours, 8);
    let total = VEHICLES[ticket.type].rate * cappedHours;
    if (ticket.charging) {
      total += VEHICLES[ticket.type].charging * cappedHours;
    }
    if (this.lot.hasPass(ticket.plate)) {
      total = Math.floor(total / 2);
    }
    return total;
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
      if (arg !== undefined || extra.length) return 'INVALID';
      return this.registerPass(plate);
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

  registerPass(plate) {
    this.lot.registerPass(plate);
    return `PASS ${plate}`;
  }
}

const lot = new ParkingLot(SPOTS);
const cli = new Cli(lot, new Pricing(lot));
for (const line of fs.readFileSync(0, 'utf8').split('\n')) {
  if (line.trim()) console.log(cli.handle(line));
}
