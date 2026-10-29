const fs = require('fs');

const VEHICLES = {
  bike: { rate: 10, fits: ['small', 'medium', 'large'] },
  car: { rate: 20, fits: ['medium', 'large'] },
  truck: { rate: 50, fits: ['large'] },
  ev: { rate: 20, fits: ['medium', 'large'], charging: true },
};

const SPOTS = [
  { id: 'S1', size: 'small' }, { id: 'S2', size: 'small' },
  { id: 'M1', size: 'medium' }, { id: 'M2', size: 'medium' }, { id: 'M3', size: 'medium' },
  { id: 'L1', size: 'large' },
  { id: 'C1', size: 'medium', charging: true }, { id: 'C2', size: 'medium', charging: true },
];

const COMMANDS = {
  park: { args: ['plate', 'type'], run: (cli, plate, type) => cli.park(plate, type) },
  leave: { args: ['plate', 'hours'], run: (cli, plate, hours) => cli.leave(plate, hours) },
  quote: { args: ['plate', 'hours'], run: (cli, plate, hours) => cli.quote(plate, hours) },
  pass: { args: ['plate'], run: (cli, plate) => cli.pass(plate) },
};

class ParkingLot {
  constructor(spots) {
    this.spots = spots;
    this.tickets = new Map();
  }

  park(plate, type) {
    const taken = new Set([...this.tickets.values()].map((t) => t.spot));
    const vehicle = VEHICLES[type];
    
    // EVs prefer charging spots first
    if (vehicle.charging) {
      const chargingSpots = this.spots.filter((s) => s.charging && !taken.has(s.id));
      if (chargingSpots.length > 0) {
        const spot = chargingSpots[0]; // C1 is first, then C2
        const ticket = { type, spot: spot.id, charging: true };
        this.tickets.set(plate, ticket);
        return ticket;
      }
    }
    
    // If no charging spot available (or not an EV), park in regular spots
    for (const size of vehicle.fits) {
      const spot = this.spots.find((s) => !s.charging && s.size === size && !taken.has(s.id));
      if (spot) {
        const ticket = { type, spot: spot.id, charging: false };
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
    this.tickets.delete(plate);
  }
}

class Pricing {
  constructor() {
    this.passes = new Set();
  }

  registerPass(plate) {
    this.passes.add(plate);
  }

  hasPass(plate) {
    return this.passes.has(plate);
  }

  fee(plate, ticket, hours) {
    // Cap hours at 8
    const cappedHours = Math.min(hours, 8);
    
    let baseFee = VEHICLES[ticket.type].rate * cappedHours;
    let chargingFee = 0;
    
    // Add charging fee if EV is in a charging spot
    if (ticket.charging) {
      chargingFee = 10 * cappedHours;
    }
    
    let totalFee = baseFee + chargingFee;
    
    // Apply 50% discount if vehicle has a pass
    if (this.hasPass(plate)) {
      totalFee = totalFee / 2;
    }
    
    return totalFee;
  }
}

class Cli {
  constructor(lot, pricing) {
    this.lot = lot;
    this.pricing = pricing;
  }

  handle(line) {
    const [name, ...args] = line.split(/\s+/);
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

  leave(plate, hoursText) {
    const bill = this.bill(plate, hoursText);
    if (bill.error) return bill.error;
    this.lot.leave(plate);
    return `LEFT ${plate} ${bill.ticket.spot} FEE ${bill.fee}`;
  }

  quote(plate, hoursText) {
    const bill = this.bill(plate, hoursText);
    return bill.error || `QUOTE ${plate} FEE ${bill.fee}`;
  }

  pass(plate) {
    this.pricing.registerPass(plate);
    return `PASS ${plate}`;
  }

  bill(plate, hoursText) {
    const hours = Number(hoursText);
    if (!Number.isInteger(hours) || hours < 1) return { error: 'INVALID' };
    const ticket = this.lot.find(plate);
    if (!ticket) return { error: `NOT FOUND ${plate}` };
    return { ticket, fee: this.pricing.fee(plate, ticket, hours) };
  }
}

const cli = new Cli(new ParkingLot(SPOTS), new Pricing());
for (const raw of fs.readFileSync(0, 'utf8').split('\n')) {
  const line = raw.trim();
  if (line) console.log(cli.handle(line));
}
