(function (root) {
  'use strict';

  const data = root.GoOutData || (typeof require === 'function' ? require('./data.js') : { venues: [], tagLabels: {}, musicLabels: {}, defaultPreferences: {} });
  const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function minutes(time) {
    if (time === '24:00') return 0;
    if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
    const parts = time.split(':').map(Number);
    return parts[0] * 60 + parts[1];
  }

  // Half-open intervals: the venue is available at opening but not at closing.
  // Overnight intervals cross midnight; equal start/end means closed, not 24h.
  function isOpen(hours, time) {
    if (!hours || typeof hours !== 'object') return false;
    const start = minutes(hours.open);
    const end = minutes(hours.close);
    const at = minutes(time);
    if (start === null || end === null || at === null || start === end) return false;
    return start < end ? at >= start && at < end : at >= start || at < end;
  }

  function normalize(preferences) {
    const input = preferences && typeof preferences === 'object' && !Array.isArray(preferences) ? preferences : {};
    const defaults = data.defaultPreferences;
    const uniqueStrings = (values) => [...new Set(values.filter((value) => typeof value === 'string'))];
    const required = uniqueStrings(Array.isArray(input.required) ? input.required : defaults.required || []);
    const wanted = uniqueStrings(Array.isArray(input.wanted) ? input.wanted : defaults.wanted || [])
      .filter((tag) => hasOwn(data.tagLabels, tag) && !required.includes(tag));
    const budgetInput = input.budget === undefined ? defaults.budget : input.budget;
    const budget = typeof budgetInput === 'number' || (typeof budgetInput === 'string' && budgetInput.trim() !== '') ? Number(budgetInput) : NaN;
    return {
      time: input.time === undefined ? defaults.time : input.time,
      area: input.area === undefined ? defaults.area : input.area,
      budget,
      required,
      wanted,
      music: hasOwn(data.musicLabels, input.music) ? input.music : 'any'
    };
  }

  function exclusions(venue, preferences) {
    const reasons = [];
    if (preferences.area !== 'all' && venue.area !== preferences.area) reasons.push('Βρίσκεται σε άλλη περιοχή.');
    if (!Number.isFinite(preferences.budget) || preferences.budget < 0) reasons.push('Χρειάζεται έγκυρο όριο κόστους.');
    else if (venue.price > preferences.budget) reasons.push('Ξεπερνά το όριο κόστους ανά άτομο.');
    if (minutes(preferences.time) === null) reasons.push('Χρειάζεται έγκυρη ώρα άφιξης.');
    else if (!isOpen(venue.hours, preferences.time)) reasons.push('Είναι κλειστό την ώρα άφιξής σου.');

    preferences.required.forEach((tag) => {
      if (!venue.tags.includes(tag)) {
        reasons.push(tag === 'food' ? 'Δεν σερβίρει φαγητό.' : 'Δεν διαθέτει το απαραίτητο: ' + (data.tagLabels[tag] || tag) + '.');
      } else if (tag === 'food' && !isOpen(venue.kitchen, preferences.time)) {
        reasons.push('Η κουζίνα δεν λειτουργεί την ώρα άφιξής σου.');
      } else if (tag === 'live' && !isOpen(venue.liveHours, preferences.time)) {
        reasons.push(venue.liveHours ? 'Η ζωντανή μουσική είναι ' + venue.liveHours.open + '–' + venue.liveHours.close + ', εκτός της ώρας άφιξής σου.' : 'Δεν έχει επιβεβαιωθεί ωράριο ζωντανής μουσικής.');
      }
    });
    return reasons;
  }

  function availableTag(venue, tag, time) {
    return venue.tags.includes(tag)
      && (tag !== 'food' || isOpen(venue.kitchen, time))
      && (tag !== 'live' || isOpen(venue.liveHours, time));
  }

  function similarity(first, second) {
    const firstFeatures = new Set(first.tags.concat(first.music.map((genre) => 'music:' + genre)));
    const secondFeatures = new Set(second.tags.concat(second.music.map((genre) => 'music:' + genre)));
    const intersection = [...firstFeatures].filter((feature) => secondFeatures.has(feature)).length;
    return intersection / new Set([...firstFeatures, ...secondFeatures]).size;
  }

  function feedbackAdjustment(venue, feedback) {
    if (!feedback || typeof feedback !== 'object' || Array.isArray(feedback)) return 0;
    let adjustment = 0;
    let count = 0;
    data.venues.forEach((rated) => {
      if (!hasOwn(feedback, rated.id) || !['like', 'dislike'].includes(feedback[rated.id])) return;
      const direction = feedback[rated.id] === 'like' ? 1 : -1;
      adjustment += direction * (rated.id === venue.id ? 1 : similarity(venue, rated));
      count += 1;
    });
    return count ? 15 * adjustment / count : 0;
  }

  function rank(venue, preferences, feedback) {
    const reasons = ['Ανοιχτό στις ' + preferences.time + '.', 'Ενδεικτικά ' + venue.price + ' € / άτομο, εντός budget.'];
    const tradeoffs = [];
    if (preferences.required.includes('food')) reasons.push('Η κουζίνα λειτουργεί μέχρι ' + venue.kitchen.close + '.');
    preferences.required.filter((tag) => tag !== 'food').forEach((tag) => reasons.push(tag === 'live' ? 'Ζωντανή μουσική ' + venue.liveHours.open + '–' + venue.liveHours.close + ', την ώρα άφιξής σου.' : 'Διαθέτει: ' + data.tagLabels[tag] + '.'));

    const matchingWanted = preferences.wanted.filter((tag) => availableTag(venue, tag, preferences.time));
    matchingWanted.forEach((tag) => reasons.push(tag === 'live' ? 'Ζωντανή μουσική ' + venue.liveHours.open + '–' + venue.liveHours.close + ', την ώρα άφιξής σου.' : 'Ταιριάζει στην προτίμησή σου: ' + data.tagLabels[tag] + '.'));
    preferences.wanted.filter((tag) => !matchingWanted.includes(tag)).forEach((tag) => {
      if (tag === 'food' && venue.tags.includes('food')) {
        tradeoffs.push('Το μαγαζί είναι ανοιχτό, αλλά η κουζίνα είναι κλειστή.');
      } else if (tag === 'live' && venue.tags.includes('live')) {
        tradeoffs.push(venue.liveHours ? 'Η ζωντανή μουσική είναι ' + venue.liveHours.open + '–' + venue.liveHours.close + ', εκτός της ώρας άφιξής σου.' : 'Δεν έχει επιβεβαιωθεί ωράριο ζωντανής μουσικής.');
      } else {
        tradeoffs.push('Δεν διαθέτει: ' + data.tagLabels[tag] + '.');
      }
    });

    const musicMatch = preferences.music === 'any' || venue.music.includes(preferences.music);
    if (preferences.music !== 'any') {
      if (musicMatch) reasons.push('Μουσική που διάλεξες: ' + data.musicLabels[preferences.music] + '.');
      else tradeoffs.push('Δεν περιλαμβάνει ' + data.musicLabels[preferences.music] + ' στις μουσικές επιλογές του.');
    }

    const adjustment = feedbackAdjustment(venue, feedback);
    if (adjustment > 1) reasons.push('Ταιριάζει με μαγαζιά που σου αρέσουν.');
    if (adjustment < -1) tradeoffs.push('Έχει κοινά στοιχεία με μαγαζιά που δεν σου άρεσαν.');
    // This is a transparent local demonstration score, not a learned model or probability.
    const wantedPoints = preferences.wanted.length ? 20 * matchingWanted.length / preferences.wanted.length : 20;
    const pricePoints = preferences.budget > 0 ? 5 * Math.max(0, 1 - venue.price / preferences.budget) : 0;
    const score = Math.max(0, Math.min(100, Math.round(50 + wantedPoints + (musicMatch ? 10 : 0) + pricePoints + adjustment)));
    return { venue, score, reasons, tradeoffs };
  }

  function recommend(preferences, feedback) {
    const normalized = normalize(preferences);
    return data.venues
      .filter((venue) => exclusions(venue, normalized).length === 0)
      .map((venue) => rank(venue, normalized, feedback))
      .sort((first, second) => second.score - first.score || first.venue.price - second.venue.price || first.venue.id.localeCompare(second.venue.id));
  }

  function explainExcluded(preferences) {
    const normalized = normalize(preferences);
    return data.venues
      .map((venue) => ({ venue, reasons: exclusions(venue, normalized) }))
      .filter((entry) => entry.reasons.length > 0);
  }

  const engine = { isOpen, recommend, explainExcluded };
  root.GoOutEngine = engine;
  if (typeof module !== 'undefined' && module.exports) module.exports = engine;
})(typeof globalThis !== 'undefined' ? globalThis : window);
