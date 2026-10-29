const fs = require('fs');

const VEHICLES = {
  bike: { rate: 10, fits: ['small', 'medium', 'large'] },
  car: { rate: 20, fits: ['medium', 'large'] },
  truck: { rate: 50, fits: ['large'] },
  ev: { rate: 20, fits: ['charging', 'medium', 'large'], chargingFee: 10 },
};

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
    this.passes = new Set();
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

  registerPass(plate) {
    this.passes.add(plate);
  }

  hasPass(plate) {
    return this.passes.has(plate);
  }
}

class Pricing {
  fee(ticket, hours, hasPass) {
    const cappedHours = Math.min(hours, 8);
    let fee = VEHICLES[ticket.type].rate * cappedHours;
    if (ticket.spot.startsWith('C') && VEHICLES[ticket.type].chargingFee) {
      fee += VEHICLES[ticket.type].chargingFee * cappedHours;
    }
    if (hasPass) {
      fee = Math.floor(fee / 2);
    }
    return fee;
  }
}

class Cli {
  constructor(lot, pricing) {
    this.lot = lot;
    this.pricing = pricing;
  }

  handle(line) {
    const [command, plate, arg, ...extra] = line.trim().split(/\s+/);
    if (extra.length) return 'INVALID';
    if (command === 'park') {
      if (arg === undefined) return 'INVALID';
      return this.park(plate, arg);
    }
    if (command === 'leave' || command === 'quote') {
      if (arg === undefined) return 'INVALID';
      return this.charge(command, plate, arg);
    }
    if (command === 'pass') {
      if (arg !== undefined) return 'INVALID';
      return this.registerPass(plate);
    }
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
    const hasPass = this.lot.hasPass(plate);
    const fee = this.pricing.fee(ticket, hours, hasPass);
    if (command === 'quote') return `QUOTE ${plate} FEE ${fee}`;
    this.lot.leave(plate);
    return `LEFT ${plate} ${ticket.spot} FEE ${fee}`;
  }

  registerPass(plate) {
    this.lot.registerPass(plate);
    return `PASS ${plate}`;
  }
}

const cli = new Cli(new ParkingLot(SPOTS), new Pricing());
for (const line of fs.readFileSync(0, 'utf8').split('\n')) {
  if (line.trim()) console.log(cli.handle(line));
}
