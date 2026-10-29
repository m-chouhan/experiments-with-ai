const fs = require('fs');

const VEHICLES = {
  bike: { rate: 10, fits: ['small', 'medium', 'large'] },
  car: { rate: 20, fits: ['medium', 'large'] },
  truck: { rate: 50, fits: ['large'] },
  ev: { rate: 20, fits: ['medium', 'large'], isEv: true },
};

const SPOTS = [
  { id: 'S1', size: 'small' }, { id: 'S2', size: 'small' },
  { id: 'M1', size: 'medium' }, { id: 'M2', size: 'medium' }, { id: 'M3', size: 'medium' },
  { id: 'L1', size: 'large' },
  { id: 'C1', size: 'charging' }, { id: 'C2', size: 'charging' },
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
    const isEv = VEHICLES[type]?.isEv;

    // EVs: try charging spots first
    if (isEv) {
      for (const spotId of ['C1', 'C2']) {
        const spot = this.spots.find((s) => s.id === spotId && !taken.has(s.id));
        if (spot) {
          const ticket = { type, spot: spot.id, isCharging: true };
          this.tickets.set(plate, ticket);
          return ticket;
        }
      }
    }

    // Try regular spots (all vehicles, or EVs if charging spots full)
    for (const size of VEHICLES[type].fits) {
      // Skip charging spots for non-EVs and for EVs looking for fallback
      const spot = this.spots.find(
        (s) => s.size === size && !taken.has(s.id) && s.size !== 'charging'
      );
      if (spot) {
        const ticket = { type, spot: spot.id, isCharging: false };
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
  constructor(passes) {
    this.passes = passes;
  }

  fee(ticket, hours) {
    const baseRate = VEHICLES[ticket.type].rate;
    
    // Cap hours at 8
    const cappedHours = Math.min(hours, 8);
    
    let baseFee = baseRate * cappedHours;

    // EVs in charging spots pay extra 10/hour for charging (also capped)
    if (VEHICLES[ticket.type].isEv && ticket.isCharging) {
      baseFee += 10 * cappedHours;
    }

    // Apply 50% discount for pass holders (after cap)
    if (this.passes.has(ticket.plate)) {
      return Math.floor(baseFee / 2);
    }

    return baseFee;
  }
}

class Cli {
  constructor(lot, pricing, passes) {
    this.lot = lot;
    this.pricing = pricing;
    this.passes = passes;
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
    this.passes.add(plate);
    return `PASS ${plate}`;
  }

  bill(plate, hoursText) {
    const hours = Number(hoursText);
    if (!Number.isInteger(hours) || hours < 1) return { error: 'INVALID' };
    const ticket = this.lot.find(plate);
    if (!ticket) return { error: `NOT FOUND ${plate}` };
    // Store plate in ticket for fee calculation
    ticket.plate = plate;
    return { ticket, fee: this.pricing.fee(ticket, hours) };
  }
}

const passes = new Set();
const cli = new Cli(new ParkingLot(SPOTS), new Pricing(passes), passes);
for (const raw of fs.readFileSync(0, 'utf8').split('\n')) {
  const line = raw.trim();
  if (line) console.log(cli.handle(line));
}
