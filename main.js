const fs = require('fs');

const smallSpots = ['S1', 'S2'];
const mediumSpots = ['M1', 'M2', 'M3'];
const largeSpots = ['L1'];
const chargingSpots = ['C1', 'C2'];

let parked = {};
let usedSpots = [];
let passes = {}; // plates with monthly passes

function pass(plate) {
  passes[plate] = true;
  console.log('PASS ' + plate);
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
    // EVs prefer charging spots first
    for (const s of chargingSpots) if (!spot && !usedSpots.includes(s)) spot = s;
    // If no charging spot, fall back to car spots (medium or large)
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
  usedSpots.push(spot);
  parked[plate] = { type: type, spot: spot };
  console.log('PARKED ' + plate + ' ' + spot);
}

function calculateFee(plate, hoursText) {
  const hours = Number(hoursText);
  if (!Number.isInteger(hours) || hours < 1) {
    return null; // invalid
  }
  if (!parked[plate]) {
    return false; // not found
  }
  const type = parked[plate].type;
  const spot = parked[plate].spot;
  
  // Cap hours at 8
  const cappedHours = Math.min(hours, 8);
  
  let fee = 0;
  if (type === 'bike') fee = cappedHours * 10;
  else if (type === 'car') fee = cappedHours * 20;
  else if (type === 'truck') fee = cappedHours * 50;
  else if (type === 'ev') {
    // EV base rate is 20/hour, plus 10/hour if in a charging spot
    if (chargingSpots.includes(spot)) {
      fee = cappedHours * 30; // 20 + 10
    } else {
      fee = cappedHours * 20;
    }
  }
  
  // Apply pass discount (50% off)
  if (passes[plate]) {
    fee = Math.floor(fee / 2);
  }
  
  return fee;
}

function leave(plate, hoursText) {
  const fee = calculateFee(plate, hoursText);
  if (fee === null) {
    console.log('INVALID');
    return;
  }
  if (fee === false) {
    console.log('NOT FOUND ' + plate);
    return;
  }
  const spot = parked[plate].spot;
  usedSpots = usedSpots.filter((s) => s !== spot);
  delete parked[plate];
  console.log('LEFT ' + plate + ' ' + spot + ' FEE ' + fee);
}

function quote(plate, hoursText) {
  const fee = calculateFee(plate, hoursText);
  if (fee === null) {
    console.log('INVALID');
    return;
  }
  if (fee === false) {
    console.log('NOT FOUND ' + plate);
    return;
  }
  console.log('QUOTE ' + plate + ' FEE ' + fee);
}

const lines = fs.readFileSync(0, 'utf8').split('\n');
for (const line of lines) {
  const parts = line.trim().split(/\s+/);
  if (parts[0] === '') continue;
  if (parts[0] === 'pass' && parts.length === 2) pass(parts[1]);
  else if (parts[0] === 'park' && parts.length === 3) park(parts[1], parts[2]);
  else if (parts[0] === 'leave' && parts.length === 3) leave(parts[1], parts[2]);
  else if (parts[0] === 'quote' && parts.length === 3) quote(parts[1], parts[2]);
  else console.log('INVALID');
}
