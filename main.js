const fs = require('fs');

const VEHICLES = {
  bike: { rate: 10, fits: ['small', 'medium', 'large'] },
  car: { rate: 20, fits: ['medium', 'large'] },
  truck: { rate: 50, fits: ['large'] },
  ev: { rate: 20, fits: ['charging', 'medium', 'large'] },
};

const SPOTS = [
  { id: 'C1', type: 'charging' }, { id: 'C2', type: 'charging' },
  { id: 'S1', size: 'small' }, { id: 'S2', size: 'small' },
  { id: 'M1', size: 'medium' }, { id: 'M2', size: 'medium' }, { id: 'M3', size: 'medium' },
  { id: 'L1', size: 'large' },
];

const COMMANDS = {
  park: { args: ['plate', 'type'], run: (cli, plate, type) => cli.park(plate, type) },
  leave: { args: ['plate', 'hours'], run: (cli, plate, hours) => cli.charge('leave', plate, hours) },
  quote: { args: ['plate', 'hours'], run: (cli, plate, hours) => cli.charge('quote', plate, hours) },
};

class ParkingLot {
  constructor(spots) {
    this.spots = spots;
    this.tickets = new Map();
  }

  park(plate, type) {
    const taken = new Set([...this.tickets.values()].map((t) => t.spot));

    // EVs try charging spots first
    if (type === 'ev') {
      for (const spotId of ['C1', 'C2']) {
        if (!taken.has(spotId)) {
          const ticket = { plate, type, spot: spotId, charging: true };
          this.tickets.set(plate, ticket);
          return ticket;
        }
      }
    }

    // All vehicles try regular spots
    for (const sizeOrType of VEHICLES[type].fits) {
      const spot = this.spots.find((s) => {
        if (taken.has(s.id)) return false;
        if (type === 'ev' && s.type === 'charging') return false; // EV won't use charging spot here (already tried)
        if (type !== 'ev' && s.type === 'charging') return false; // Non-EVs never use charging spots
        return s.size === sizeOrType;
      });
      if (spot) {
        const ticket = { plate, type, spot: spot.id, charging: false };
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
    let baseFee = VEHICLES[ticket.type].rate * hours;
    if (ticket.type === 'ev' && ticket.charging) {
      baseFee += 10 * hours;
    }
    return baseFee;
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
}

const cli = new Cli(new ParkingLot(SPOTS), new Pricing());
for (const line of fs.readFileSync(0, 'utf8').split('\n')) {
  if (line.trim()) console.log(cli.handle(line));
}
