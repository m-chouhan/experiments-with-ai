import { scenario } from '../helpers.js';

const fillMediums = ['park C1 car', 'park C2 car', 'park C3 car'];

scenario('a bike takes the first small spot', { when: 'park B1 bike', then: 'PARKED B1 S1' });
scenario('a car takes the first medium spot', { when: 'park C1 car', then: 'PARKED C1 M1' });
scenario('a truck takes the large spot', { when: 'park T1 truck', then: 'PARKED T1 L1' });

scenario('bikes move up to medium when small spots are full', {
  given: ['park B1 bike', 'park B2 bike'],
  when: 'park B3 bike',
  then: 'PARKED B3 M1',
});

scenario('a car moves up to large when mediums are full', {
  given: fillMediums,
  when: 'park C4 car',
  then: 'PARKED C4 L1',
});

scenario('a car never takes a small spot', {
  given: [...fillMediums, 'park C4 car'],
  when: 'park C5 car',
  then: 'FULL C5',
});

scenario('a second truck finds the lot full', {
  given: ['park T1 truck'],
  when: 'park T2 truck',
  then: 'FULL T2',
});

scenario('the same plate cannot park twice', {
  given: ['park C1 car'],
  when: 'park C1 bike',
  then: 'ALREADY PARKED C1',
});

scenario('leaving charges the hourly rate and frees the spot', {
  given: ['park C1 car'],
  when: ['leave C1 3', 'park C2 car'],
  then: ['LEFT C1 M1 FEE 60', 'PARKED C2 M1'],
});

scenario('each vehicle type has its own rate', {
  given: ['park B1 bike', 'park C1 car', 'park T1 truck'],
  when: ['leave B1 2', 'leave C1 2', 'leave T1 2'],
  then: ['LEFT B1 S1 FEE 20', 'LEFT C1 M1 FEE 40', 'LEFT T1 L1 FEE 100'],
});

scenario('a bike in a medium spot still pays the bike rate', {
  given: ['park B1 bike', 'park B2 bike', 'park B3 bike'],
  when: 'leave B3 1',
  then: 'LEFT B3 M1 FEE 10',
});

scenario('quote shows the fee without leaving', {
  given: ['park T1 truck'],
  when: ['quote T1 4', 'quote T1 1', 'leave T1 4'],
  then: ['QUOTE T1 FEE 200', 'QUOTE T1 FEE 50', 'LEFT T1 L1 FEE 200'],
});

scenario('unknown plates are not found', {
  when: ['leave X1 1', 'quote X1 1'],
  then: ['NOT FOUND X1', 'NOT FOUND X1'],
});

scenario('malformed commands are invalid', {
  given: ['park C1 car'],
  when: ['park C2 plane', 'park C2', 'leave C1 0', 'leave C1 1.5', 'quote C1 two', 'fly C1 2', 'park C2 car now'],
  then: Array(7).fill('INVALID'),
});

scenario('blank lines are ignored', { when: ['', 'park C1 car', '   '], then: 'PARKED C1 M1' });
