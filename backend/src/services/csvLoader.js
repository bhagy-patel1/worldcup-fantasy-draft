'use strict';

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CSV_PATH = path.resolve(__dirname, '../squad_with_ratings.csv');

let rawContent;
try {
  rawContent = fs.readFileSync(CSV_PATH, 'utf8');
} catch (err) {
  console.error(`[csvLoader] Failed to read CSV file at "${CSV_PATH}": ${err.message}`);
  process.exit(1);
}

let records;
try {
  records = parse(rawContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
} catch (err) {
  console.error(`[csvLoader] Failed to parse CSV file: ${err.message}`);
  process.exit(1);
}

// Map new CSV columns to normalised internal keys
// Skips rows where Overall or Player ID is N/A
function normaliseRecord(raw) {
  const overall = raw['Overall'];
  const playerId = raw['Player ID'];

  if (overall === 'N/A' || playerId === 'N/A' || !overall || !playerId) {
    return null;
  }

  return {
    id:     Number(playerId),
    name:   String(raw['Player Name']).trim(),
    ovr:    Number(overall),
    nation: String(raw['Nation']).trim(),
    url:    raw['Player Face URL'] && raw['Player Face URL'] !== 'N/A' ? String(raw['Player Face URL']).trim() : '',
    card:   raw['Card URL'] && raw['Card URL'] !== 'N/A' ? String(raw['Card URL']).trim() : '',
  };
}

// Build footballers array (filter out null/invalid rows)
const footballers = Object.freeze(
  records.map(normaliseRecord).filter(Boolean)
);

// Build nationIndex Map: nation -> frozen array of footballers
const nationIndex = new Map();
for (const footballer of footballers) {
  const nation = footballer.nation;
  if (!nationIndex.has(nation)) {
    nationIndex.set(nation, []);
  }
  nationIndex.get(nation).push(footballer);
}
for (const [nation, bucket] of nationIndex) {
  nationIndex.set(nation, Object.freeze(bucket));
}
Object.freeze(nationIndex);

module.exports = { footballers, nationIndex };
