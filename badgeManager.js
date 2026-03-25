const fs = require("fs");
const path = require("path");

const DB_FILE = path.join(__dirname, "badges.json");

const RANK_RANGES = {
  officer:    { min: 1000, max: 4999 },
  sergeant:   { min: 5000, max: 5999 },
  lieutenant: { min: 6000, max: 6999 },
  detective:  { min: 7000, max: 9999 },
};

// Load or initialize the badge database
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = { officers: {}, usedNumbers: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Generate a unique badge number for the given rank
function generateBadgeNumber(rank, db) {
  const range = RANK_RANGES[rank];
  if (!range) throw new Error(`Unknown rank: ${rank}`);

  const used = new Set(db.usedNumbers);
  const available = [];

  for (let n = range.min; n <= range.max; n++) {
    if (!used.has(n)) available.push(n);
  }

  if (available.length === 0) {
    throw new Error(`No available badge numbers for rank: ${rank}`);
  }

  // Pick a random available number from the range
  const index = Math.floor(Math.random() * available.length);
  return available[index];
}

/**
 * Assign a new badge number to an officer.
 * @param {string} name - Officer's name
 * @param {string} rank - "officer" | "sergeant" | "detective"
 * @returns {object} - { name, rank, badgeNumber }
 */
function assignBadge(name, rank) {
  rank = rank.toLowerCase();
  if (!RANK_RANGES[rank]) throw new Error(`Invalid rank: "${rank}". Must be officer, sergeant, lieutenant, or detective.`);

  const db = loadDB();

  if (db.officers[name]) {
    throw new Error(`"${name}" already has a badge (${db.officers[name].badgeNumber}). Use promoteBadge() to update.`);
  }

  const badgeNumber = generateBadgeNumber(rank, db);

  db.officers[name] = { name, rank, badgeNumber };
  db.usedNumbers.push(badgeNumber);
  saveDB(db);

  console.log(`[ASSIGNED] ${name} | Rank: ${rank.toUpperCase()} | Badge #${badgeNumber}`);
  return db.officers[name];
}

/**
 * Promote an officer to a new rank and assign a new badge number.
 * The old badge number is freed up.
 * @param {string} name - Officer's name
 * @param {string} newRank - "sergeant" | "detective"
 * @returns {object} - { name, rank, badgeNumber, previousBadge }
 */
function promoteBadge(name, newRank) {
  newRank = newRank.toLowerCase();
  if (!RANK_RANGES[newRank]) throw new Error(`Invalid rank: "${newRank}". Must be officer, sergeant, lieutenant, or detective.`);

  const db = loadDB();

  if (!db.officers[name]) {
    throw new Error(`No record found for "${name}". Use assignBadge() first.`);
  }

  const current = db.officers[name];
  if (current.rank === newRank) {
    throw new Error(`${name} is already ranked as ${newRank}.`);
  }

  // Free old badge number
  db.usedNumbers = db.usedNumbers.filter((n) => n !== current.badgeNumber);
  const previousBadge = current.badgeNumber;

  // Assign new badge in the new rank's range
  const newBadge = generateBadgeNumber(newRank, db);

  db.officers[name] = { name, rank: newRank, badgeNumber: newBadge };
  db.usedNumbers.push(newBadge);
  saveDB(db);

  const result = { ...db.officers[name], previousBadge };
  console.log(
    `[PROMOTED] ${name} | ${current.rank.toUpperCase()} → ${newRank.toUpperCase()} | Badge #${previousBadge} → #${newBadge}`
  );
  return result;
}

/**
 * Look up an officer by name.
 * @param {string} name
 * @returns {object|null}
 */
function lookupBadge(name) {
  const db = loadDB();
  const record = db.officers[name] || null;
  if (record) {
    console.log(`[LOOKUP] ${name} | Rank: ${record.rank.toUpperCase()} | Badge #${record.badgeNumber}`);
  } else {
    console.log(`[LOOKUP] No record found for "${name}".`);
  }
  return record;
}

/**
 * Remove an officer and free their badge number (resignation, firing, etc.)
 * @param {string} name
 */
function removeBadge(name) {
  const db = loadDB();
  if (!db.officers[name]) throw new Error(`No record found for "${name}".`);

  const badge = db.officers[name].badgeNumber;
  delete db.officers[name];
  db.usedNumbers = db.usedNumbers.filter((n) => n !== badge);
  saveDB(db);

  console.log(`[REMOVED] ${name} | Badge #${badge} has been freed.`);
}

/**
 * List all officers, optionally filtered by rank.
 * @param {string|null} rank - Optional filter: "officer" | "sergeant" | "detective"
 */
function listBadges(rank = null) {
  const db = loadDB();
  let records = Object.values(db.officers);

  if (rank) {
    rank = rank.toLowerCase();
    records = records.filter((r) => r.rank === rank);
  }

  if (records.length === 0) {
    console.log(rank ? `No ${rank}s found.` : "No officers found.");
    return [];
  }

  records.sort((a, b) => a.badgeNumber - b.badgeNumber);
  console.log(`\n${"─".repeat(40)}`);
  console.log(rank ? `${rank.toUpperCase()}S` : "ALL PERSONNEL");
  console.log(`${"─".repeat(40)}`);
  records.forEach((r) => {
    console.log(`  #${r.badgeNumber}  ${r.rank.padEnd(10)}  ${r.name}`);
  });
  console.log(`${"─".repeat(40)}\n`);
  return records;
}

module.exports = { assignBadge, promoteBadge, lookupBadge, removeBadge, listBadges };
