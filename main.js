const fs = require('fs');

const smallSpots = ['S1', 'S2'];
const mediumSpots = ['M1', 'M2', 'M3'];
const largeSpots = ['L1'];
const chargingSpots = ['C1', 'C2'];

let parked = {};
let usedSpots = [];
let usedChargingSpots = [];
let passes = {}; // Track vehicles with monthly passes

function calculateFee(type, hours, hasPass, isCharging) {
  // Cap hours at 8
  const cappedHours = Math.min(hours, 8);
  
  let fee = 0;
  if (type === 'bike') fee = cappedHours * 10;
  else if (type === 'car') fee = cappedHours * 20;
  else if (type === 'truck') fee = cappedHours * 50;
  else if (type === 'ev') {
    fee = cappedHours * 20; // car rate
    if (isCharging) fee += cappedHours * 10; // charging fee
  }
  
  // Apply 50% discount for pass holders after the cap
  if (hasPass) {
    fee = Math.floor(fee / 2);
  }
  
  return fee;
}

function park(plate, type) {
  if (parked[plate]) {
    console.log('ALREADY PARKED ' + plate);
    return;
  }
  let spot = null;
  if (type === 'bike') {
    for (const s of smallSpots) if (!spot && !usedSpots.includes(s)) spot = s;
    for (const s of mediumSpots) if (!spot && !usedSpots.includes(s)) spot = s;
    for (const s of largeSpots) if (!spot && !usedSpots.includes(s)) spot = s;
  } else if (type === 'car') {
    for (const s of mediumSpots) if (!spot && !usedSpots.includes(s)) spot = s;
    for (const s of largeSpots) if (!spot && !usedSpots.includes(s)) spot = s;
  } else if (type === 'truck') {
    for (const s of largeSpots) if (!spot && !usedSpots.includes(s)) spot = s;
  } else if (type === 'ev') {
    // EVs first try charging spots (C1 before C2)
    for (const s of chargingSpots) if (!spot && !usedChargingSpots.includes(s)) spot = s;
    // If no charging spot, park like a car
    if (!spot) {
      for (const s of mediumSpots) if (!spot && !usedSpots.includes(s)) spot = s;
      for (const s of largeSpots) if (!spot && !usedSpots.includes(s)) spot = s;
    }
  } else {
    console.log('INVALID');
    return;
  }
  if (!spot) {
    console.log('FULL ' + plate);
    return;
  }
  
  const isCharging = chargingSpots.includes(spot);
  if (isCharging) {
    usedChargingSpots.push(spot);
  } else {
    usedSpots.push(spot);
  }
  
  parked[plate] = { type: type, spot: spot, charging: isCharging };
  console.log('PARKED ' + plate + ' ' + spot);
}

function leave(plate, hoursText) {
  const hours = Number(hoursText);
  if (!Number.isInteger(hours) || hours < 1) {
    console.log('INVALID');
    return;
  }
  if (!parked[plate]) {
    console.log('NOT FOUND ' + plate);
    return;
  }
  const type = parked[plate].type;
  const spot = parked[plate].spot;
  const charging = parked[plate].charging;
  const hasPass = passes[plate] !== undefined;
  
  const fee = calculateFee(type, hours, hasPass, charging);
  
  if (charging) {
    usedChargingSpots = usedChargingSpots.filter((s) => s !== spot);
  } else {
    usedSpots = usedSpots.filter((s) => s !== spot);
  }
  
  delete parked[plate];
  console.log('LEFT ' + plate + ' ' + spot + ' FEE ' + fee);
}

function quote(plate, hoursText) {
  const hours = Number(hoursText);
  if (!Number.isInteger(hours) || hours < 1) {
    console.log('INVALID');
    return;
  }
  if (!parked[plate]) {
    console.log('NOT FOUND ' + plate);
    return;
  }
  const type = parked[plate].type;
  const charging = parked[plate].charging;
  const hasPass = passes[plate] !== undefined;
  
  const fee = calculateFee(type, hours, hasPass, charging);
  
  console.log('QUOTE ' + plate + ' FEE ' + fee);
}

function registerPass(plate) {
  passes[plate] = true;
  console.log('PASS ' + plate);
}

const lines = fs.readFileSync(0, 'utf8').split('\n');
for (const line of lines) {
  const parts = line.trim().split(/\s+/);
  if (parts[0] === '') continue;
  if (parts[0] === 'park' && parts.length === 3) park(parts[1], parts[2]);
  else if (parts[0] === 'leave' && parts.length === 3) leave(parts[1], parts[2]);
  else if (parts[0] === 'quote' && parts.length === 3) quote(parts[1], parts[2]);
  else if (parts[0] === 'pass' && parts.length === 2) registerPass(parts[1]);
  else console.log('INVALID');
}
