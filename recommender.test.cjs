const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const data = require('./data.js');
const { isOpen, recommend, explainExcluded } = require('./recommender.js');

const preferences = (changes = {}) => ({ ...data.defaultPreferences, ...changes });
const ids = (results) => results.map((entry) => entry.venue.id);

test('opening intervals include opening, exclude closing and cross midnight', () => {
  const overnight = { open: '12:00', close: '02:00' };
  assert.equal(isOpen(overnight, '12:00'), true);
  assert.equal(isOpen(overnight, '23:59'), true);
  assert.equal(isOpen(overnight, '00:00'), true);
  assert.equal(isOpen(overnight, '24:00'), true);
  assert.equal(isOpen(overnight, '01:59'), true);
  assert.equal(isOpen(overnight, '02:00'), false);
  assert.equal(isOpen(overnight, '11:59'), false);
  assert.equal(isOpen({ open: '08:00', close: '20:00' }, '20:00'), false);
  assert.equal(isOpen({ open: '09:00', close: '00:00' }, '00:00'), false);
  assert.equal(isOpen({ open: '08:00', close: '08:00' }, '08:00'), false);
  assert.equal(isOpen(overnight, '24:01'), false);
  assert.equal(isOpen(null, '12:00'), false);
});

test('food excludes closed kitchens even while the venue itself stays open', () => {
  const before = ids(recommend(preferences({ area: 'Κουκάκι', time: '22:29' })));
  const at = ids(recommend(preferences({ area: 'Κουκάκι', time: '22:30' })));
  assert.ok(before.includes('mikriavli'));
  assert.ok(!at.includes('mikriavli'));
  assert.ok(at.includes('rythmos'));
  const excluded = explainExcluded(preferences({ area: 'Κουκάκι', time: '22:30' })).find((item) => item.venue.id === 'mikriavli');
  assert.ok(excluded.reasons.some((reason) => reason.includes('κουζίνα')));
  assert.ok(!excluded.reasons.some((reason) => reason.includes('Είναι κλειστό')));
});

test('late food matches cross midnight and stop exactly at kitchen closing', () => {
  assert.ok(ids(recommend(preferences({ time: '00:29' }))).includes('misofeggaro'));
  assert.ok(!ids(recommend(preferences({ time: '00:30' }))).includes('misofeggaro'));
  assert.deepEqual(ids(recommend(preferences({ area: 'all', time: '00:45' }))), ['kryfistoa']);
  assert.deepEqual(recommend(preferences({ area: 'all', time: '01:00' })), []);
});

test('area, budget and required tags are hard constraints even for liked venues', () => {
  const settings = preferences({ area: 'Παγκράτι', budget: 22, required: ['food', 'quiet'], wanted: ['bar'], time: '13:00' });
  const matches = recommend(settings, { misofeggaro: 'like', mikriavli: 'like', nima: 'like' });
  assert.deepEqual(new Set(ids(matches)), new Set(['stasi', 'chartino']));
  matches.forEach(({ venue, score }) => {
    assert.equal(venue.area, settings.area);
    assert.ok(venue.price <= settings.budget);
    assert.ok(venue.tags.includes('food') && venue.tags.includes('quiet'));
    assert.ok(score >= 0 && score <= 100);
  });
});

test('soft preferences affect ranking without removing eligible alternatives', () => {
  const base = preferences({ area: 'Παγκράτι', time: '13:00', wanted: [], music: 'any' });
  const initial = recommend(base);
  const bars = recommend({ ...base, wanted: ['bar'] });
  const jazz = recommend({ ...base, wanted: [], music: 'jazz' });
  assert.deepEqual(new Set(ids(initial)), new Set(ids(bars)));
  assert.equal(bars[0].venue.id, 'misofeggaro');
  assert.ok(jazz[0].venue.music.includes('jazz'));
  assert.ok(bars.find((item) => item.venue.id === 'chartino').tradeoffs.some((reason) => reason.includes('Bar')));
});

test('food as a soft preference considers kitchen hours but does not exclude bars', () => {
  const results = recommend(preferences({ time: '23:45', required: ['bar'], wanted: ['food'] }));
  assert.ok(ids(results).includes('nima'));
  assert.equal(results[0].venue.id, 'misofeggaro');
  const late = recommend(preferences({ time: '00:30', required: ['bar'], wanted: ['food'] }));
  const moon = late.find((item) => item.venue.id === 'misofeggaro');
  assert.ok(moon);
  assert.ok(moon.tradeoffs.some((reason) => reason.includes('κουζίνα είναι κλειστή')));
});

test('feedback changes rank and transfers preference to similar venues', () => {
  const settings = preferences({ area: 'all', time: '20:30', required: [], wanted: [], budget: 40 });
  const initial = recommend(settings);
  const personalized = recommend(settings, { misofeggaro: 'like' });
  assert.ok(ids(personalized).indexOf('misofeggaro') < ids(initial).indexOf('misofeggaro'));
  assert.notEqual(initial[0].venue.id, personalized[0].venue.id);
  const score = (results, id) => results.find((item) => item.venue.id === id).score;
  assert.ok(score(personalized, 'panokipos') > score(initial, 'panokipos'));
  const disliked = recommend(settings, { misofeggaro: 'dislike' });
  assert.ok(score(disliked, 'misofeggaro') < score(initial, 'misofeggaro'));
});

test('lunch, coffee and evening flows have usable results with the same daily demo schedule', () => {
  assert.ok(recommend(preferences({ area: 'all', time: '13:30' })).length >= 7);
  assert.ok(recommend(preferences({ area: 'Κουκάκι', time: '09:00', budget: 15, required: ['coffee'], wanted: [] })).some(({ venue }) => venue.id === 'kokkos'));
  const settings = preferences({ area: 'all', time: '22:30' });
  assert.deepEqual(ids(recommend({ ...settings, day: 'today' })), ids(recommend({ ...settings, day: 'saturday' })));
});

test('live music is required only during its performance window, including after midnight', () => {
  const settings = preferences({ area: 'all', budget: 40, required: ['live'], wanted: [] });
  assert.deepEqual(recommend({ ...settings, time: '14:00' }), []);
  assert.deepEqual(new Set(ids(recommend({ ...settings, time: '22:00' }))), new Set(['nima', 'rythmos', 'defterosgyros']));
  assert.deepEqual(new Set(ids(recommend({ ...settings, time: '00:29' }))), new Set(['nima', 'defterosgyros']));
  assert.deepEqual(ids(recommend({ ...settings, time: '00:30' })), ['defterosgyros']);
  const evening = recommend({ ...settings, time: '21:30' }).find(({ venue }) => venue.id === 'nima');
  assert.ok(evening.reasons.some((reason) => reason.includes('21:00–00:30')));
  const lunch = recommend({ ...settings, time: '14:00', required: ['food'], wanted: ['live'] }).find(({ venue }) => venue.id === 'rythmos');
  assert.ok(lunch);
  assert.ok(lunch.tradeoffs.some((reason) => reason.includes('20:30–23:30')));
});

test('missing live music hours cannot promise a confirmed performance', () => {
  // Isolate this incomplete-data scenario in a browser sandbox, leaving shared fixtures intact.
  const context = vm.createContext({});
  for (const file of ['data.js', 'recommender.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context, { filename: file });
  }
  delete context.GoOutData.venues.find((venue) => venue.id === 'nima').liveHours;
  const settings = preferences({ area: 'Παγκράτι', time: '22:00', required: ['live'], wanted: [] });
  assert.ok(!ids(context.GoOutEngine.recommend(settings)).includes('nima'));
  const excluded = context.GoOutEngine.explainExcluded(settings).find(({ venue }) => venue.id === 'nima');
  assert.ok(excluded.reasons.some((reason) => reason.includes('Δεν έχει επιβεβαιωθεί ωράριο')));
  const optional = context.GoOutEngine.recommend({ ...settings, required: ['bar'], wanted: ['live'] }).find(({ venue }) => venue.id === 'nima');
  assert.ok(optional);
  assert.ok(optional.tradeoffs.some((reason) => reason.includes('Δεν έχει επιβεβαιωθεί ωράριο')));
});

test('invalid and unknown input cannot create false-positive hard-filter matches', () => {
  assert.deepEqual(recommend(preferences({ time: 'wrong' })), []);
  assert.deepEqual(recommend(preferences({ budget: 'wrong' })), []);
  assert.deepEqual(recommend(preferences({ budget: null })), []);
  assert.deepEqual(recommend(preferences({ budget: -1 })), []);
  assert.deepEqual(recommend(preferences({ area: 'unknown' })), []);
  assert.deepEqual(recommend(preferences({ required: ['unknown-feature'] })), []);
  assert.deepEqual(ids(recommend(preferences({ wanted: ['unknown-feature'], music: 'unknown' }))), ids(recommend(preferences({ wanted: [], music: 'any' }))));
  assert.deepEqual(recommend(), recommend(null));
  assert.deepEqual(recommend(preferences(), { invented: 'like', stasi: 'invalid' }), recommend(preferences()));
  assert.deepEqual(recommend(preferences({ budget: '30' })), recommend(preferences({ budget: 30 })));
});

test('recommendations do not mutate caller preferences, feedback or venue data', () => {
  const settings = preferences({ required: ['food'], wanted: ['bar', 'outdoor'] });
  const feedback = { stasi: 'like' };
  const before = JSON.stringify({ settings, feedback, venues: data.venues });
  recommend(settings, feedback);
  explainExcluded(settings);
  assert.equal(JSON.stringify({ settings, feedback, venues: data.venues }), before);
});

test('files also load as ordinary browser scripts without Node, imports or network access', () => {
  const context = vm.createContext({});
  for (const file of ['data.js', 'recommender.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), context, { filename: file });
  }
  assert.equal(context.GoOutData.venues.length, 12);
  assert.ok(context.GoOutEngine.recommend().length > 0);
});
