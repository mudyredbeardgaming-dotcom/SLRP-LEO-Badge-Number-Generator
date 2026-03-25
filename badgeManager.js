const mongoose = require("mongoose");

const RANK_RANGES = {
  officer:    { min: 1000, max: 4999 },
  sergeant:   { min: 5000, max: 5999 },
  lieutenant: { min: 6000, max: 6999 },
  detective:  { min: 7000, max: 9999 },
};

const officerSchema = new mongoose.Schema({
  name:        { type: String, required: true, unique: true, trim: true },
  rank:        { type: String, required: true },
  badgeNumber: { type: Number, required: true, unique: true },
});

const Officer = mongoose.models.Officer || mongoose.model("Officer", officerSchema);

// Generate a unique badge number for the given rank
async function generateBadgeNumber(rank) {
  const { min, max } = RANK_RANGES[rank];
  const taken = await Officer.find(
    { badgeNumber: { $gte: min, $lte: max } },
    { badgeNumber: 1, _id: 0 }
  );
  const usedSet = new Set(taken.map((o) => o.badgeNumber));

  const available = [];
  for (let n = min; n <= max; n++) {
    if (!usedSet.has(n)) available.push(n);
  }

  if (available.length === 0) throw new Error(`No available badge numbers for rank: ${rank}`);
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Assign a new badge number to an officer.
 */
async function assignBadge(name, rank) {
  rank = rank.toLowerCase();
  if (!RANK_RANGES[rank])
    throw new Error(`Invalid rank: "${rank}". Must be officer, sergeant, lieutenant, or detective.`);

  const existing = await Officer.findOne({ name });
  if (existing)
    throw new Error(`"${name}" already has badge #${existing.badgeNumber}. Use promoteBadge() to update.`);

  const badgeNumber = await generateBadgeNumber(rank);
  const officer = await Officer.create({ name, rank, badgeNumber });

  console.log(`[ASSIGNED] ${name} | Rank: ${rank.toUpperCase()} | Badge #${badgeNumber}`);
  return { name: officer.name, rank: officer.rank, badgeNumber: officer.badgeNumber };
}

/**
 * Promote an officer to a new rank and assign a new badge number.
 * The old badge number is freed up.
 */
async function promoteBadge(name, newRank) {
  newRank = newRank.toLowerCase();
  if (!RANK_RANGES[newRank])
    throw new Error(`Invalid rank: "${newRank}". Must be officer, sergeant, lieutenant, or detective.`);

  const officer = await Officer.findOne({ name });
  if (!officer) throw new Error(`No record found for "${name}". Use assignBadge() first.`);
  if (officer.rank === newRank) throw new Error(`${name} is already ranked as ${newRank}.`);

  const previousBadge = officer.badgeNumber;
  const newBadge = await generateBadgeNumber(newRank);

  officer.rank = newRank;
  officer.badgeNumber = newBadge;
  await officer.save();

  console.log(`[PROMOTED] ${name} | ${previousBadge} → #${newBadge} (${newRank.toUpperCase()})`);
  return { name: officer.name, rank: officer.rank, badgeNumber: officer.badgeNumber, previousBadge };
}

/**
 * Look up an officer by name.
 */
async function lookupBadge(name) {
  const officer = await Officer.findOne({ name });
  if (!officer) return null;
  return { name: officer.name, rank: officer.rank, badgeNumber: officer.badgeNumber };
}

/**
 * Remove an officer (resignation, firing, etc.)
 */
async function removeBadge(name) {
  const result = await Officer.deleteOne({ name });
  if (result.deletedCount === 0) throw new Error(`No record found for "${name}".`);
  console.log(`[REMOVED] ${name}`);
}

/**
 * List all officers, optionally filtered by rank.
 */
async function listBadges(rank = null) {
  const query = rank ? { rank: rank.toLowerCase() } : {};
  const records = await Officer.find(query).sort({ badgeNumber: 1 });
  return records.map((r) => ({ name: r.name, rank: r.rank, badgeNumber: r.badgeNumber }));
}

module.exports = { assignBadge, promoteBadge, lookupBadge, removeBadge, listBadges };
