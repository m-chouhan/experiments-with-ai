import { scenario } from '../helpers.js';

scenario('registering a pass is confirmed', { when: 'pass K1', then: 'PASS K1' });
scenario('registering a pass twice is harmless', { given: ['pass K1'], when: 'pass K1', then: 'PASS K1' });

scenario('a pass holder pays half', {
  given: ['pass K1', 'park K1 car'],
  when: 'leave K1 3',
  then: 'LEFT K1 M1 FEE 30',
});

scenario('a pass registered after parking still applies', {
  given: ['park K1 car', 'pass K1'],
  when: 'leave K1 3',
  then: 'LEFT K1 M1 FEE 30',
});

scenario('a pass stays valid for later visits', {
  given: ['pass K1', 'park K1 car', 'leave K1 1', 'park K1 car'],
  when: 'leave K1 2',
  then: 'LEFT K1 M1 FEE 20',
});

scenario('stays are capped at 8 hours', {
  given: ['park K1 car', 'park T1 truck'],
  when: ['quote K1 8', 'quote K1 10', 'leave T1 24'],
  then: ['QUOTE K1 FEE 160', 'QUOTE K1 FEE 160', 'LEFT T1 L1 FEE 400'],
});

scenario('the pass discount applies after the cap', {
  given: ['pass T1', 'park T1 truck'],
  when: 'leave T1 12',
  then: 'LEFT T1 L1 FEE 200',
});

scenario('quote applies the pass discount', {
  given: ['pass B1', 'park B1 bike'],
  when: 'quote B1 4',
  then: 'QUOTE B1 FEE 20',
});

scenario('EV charging is capped and discounted too', {
  given: ['pass E1', 'park E1 ev', 'park E2 ev'],
  when: ['quote E1 10', 'leave E2 10'],
  then: ['QUOTE E1 FEE 120', 'LEFT E2 C2 FEE 240'],
});

scenario('vehicles without a pass pay full price', {
  given: ['pass K1', 'park K2 car'],
  when: 'leave K2 3',
  then: 'LEFT K2 M1 FEE 60',
});

scenario('pass needs exactly one plate', { when: ['pass', 'pass K1 K2'], then: ['INVALID', 'INVALID'] });
