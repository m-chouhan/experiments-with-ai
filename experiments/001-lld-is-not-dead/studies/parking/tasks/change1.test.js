import { scenario } from '../helpers.js';

const fillCharging = ['park E1 ev', 'park E2 ev'];
const fillCarSpots = ['park K1 car', 'park K2 car', 'park K3 car', 'park T1 truck'];

scenario('an EV takes the first charging spot', { when: 'park E1 ev', then: 'PARKED E1 C1' });
scenario('a second EV takes the next charging spot', { given: ['park E1 ev'], when: 'park E2 ev', then: 'PARKED E2 C2' });

scenario('an EV parks like a car when charging spots are full', {
  given: fillCharging,
  when: 'park E3 ev',
  then: 'PARKED E3 M1',
});

scenario('an EV finds the lot full when charging and car spots are taken', {
  given: [...fillCharging, ...fillCarSpots],
  when: 'park E3 ev',
  then: 'FULL E3',
});

scenario('cars never use charging spots', {
  given: ['park K1 car', 'park K2 car', 'park K3 car', 'park K4 car'],
  when: 'park K5 car',
  then: 'FULL K5',
});

scenario('bikes and trucks never use charging spots', {
  given: ['park B1 bike', 'park B2 bike', 'park B3 bike', 'park B4 bike', 'park B5 bike', 'park B6 bike'],
  when: ['park B7 bike', 'park T1 truck'],
  then: ['FULL B7', 'FULL T1'],
});

scenario('an EV in a charging spot pays the car rate plus charging', {
  given: ['park E1 ev'],
  when: 'leave E1 3',
  then: 'LEFT E1 C1 FEE 90',
});

scenario('an EV in a regular spot pays only the car rate', {
  given: [...fillCharging, 'park E3 ev'],
  when: 'leave E3 2',
  then: 'LEFT E3 M1 FEE 40',
});

scenario('quote includes the charging fee', {
  given: ['park E1 ev'],
  when: ['quote E1 1', 'quote E1 4'],
  then: ['QUOTE E1 FEE 30', 'QUOTE E1 FEE 120'],
});

scenario('a freed charging spot is reused', {
  given: [...fillCharging, 'leave E1 1'],
  when: 'park E3 ev',
  then: 'PARKED E3 C1',
});

scenario('existing vehicles keep their spots and rates', {
  given: ['park E1 ev'],
  when: ['park B1 bike', 'park K1 car', 'park T1 truck', 'leave K1 2'],
  then: ['PARKED B1 S1', 'PARKED K1 M1', 'PARKED T1 L1', 'LEFT K1 M1 FEE 40'],
});
