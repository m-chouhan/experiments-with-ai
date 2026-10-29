const fs = require('fs');

const VEHICLES = {
  bike: { rate: 10, fits: ['small', 'medium', 'large'] },
  car: { rate: 20, fits: ['medium', 'large'] },
  truck: { rate: 50, fits: ['large'] },
  ev: { rate: 20, fits: ['medium', 'large'] },
};

const SPOTS = [
  { id: 'S1', size: 'small' }, { id: 'S2', size: 'small' },
  { id: 'M1', size: 'medium' }, { id: 'M2', size: 'medium' }, { id: 'M3', size: 'medium' },
  { id: 'L1', size: 'large' },
  { id: 'C1', size: 'charging' }, { id: 'C2', size: 'charging' },
];

const COMMANDS = {
  park: { args: ['plate', 'type'], run: (cli, plate, type) => cli.park(plate, type) },
  leave: { args: ['plate', 'hours'], run: (cli, plate, hours) => cli.charge('leave', plate, hours) },
  quote: { args: ['plate', 'hours'], run: (cli, plate, hours) => cli.charge('quote', plate, hours) },
  pass: { args: ['plate'], run: (cli, plate) => cli.pass(plate) },
};

class ParkingLot {
  constructor(spots) {
    this.spots = spots;
    this.tickets = new Map();
    this.passes = new Set();
  }

  park(plate, type) {
    const taken = new Set([...this.tickets.values()].map((t) => t.spot));

    if (type === 'ev') {
      const chargingSpots = this.spots.filter(s => s.size === 'charging');
      for (const spot of chargingSpots) {
        if (!taken.has(spot.id)) {
          const ticket = { plate, type, spot: spot.id };
          this.tickets.set(plate, ticket);
          return ticket;
        }
      }
    }

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
  constructor(lot) {
    this.lot = lot;
  }

  fee(ticket, hours) {
    const cappedHours = Math.min(hours, 8);
    let total = VEHICLES[ticket.type].rate * cappedHours;
    if (ticket.type === 'ev' && (ticket.spot === 'C1' || ticket.spot === 'C2')) {
      total += 10 * cappedHours;
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
    const [name, ...args] = line.trim().split(/\s+/);
    const command = COMMANDS[name];
    if (!command || args.length !== command.args.length) return 'INVALID';
    return command.run(this, ...args);
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

  pass(plate) {
    this.lot.registerPass(plate);
    return `PASS ${plate}`;
  }
}

const lot = new ParkingLot(SPOTS);
const cli = new Cli(lot, new Pricing(lot));
for (const line of fs.readFileSync(0, 'utf8').split('\n')) {
  if (line.trim()) console.log(cli.handle(line));
}
