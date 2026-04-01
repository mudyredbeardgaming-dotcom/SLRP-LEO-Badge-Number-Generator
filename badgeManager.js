const mongoose = require("mongoose");

const RANK_RANGES = {
  lapd: {
    lieutenant: { min: 1000, max: 1200 },
    detective:  { min: 2000, max: 2100 },
    sergeant:   { min: 2000, max: 2100 },
    p3:         { min: 3000, max: 3100 },
    officer:    { min: 4000, max: 4100 },
  },
  lasd: {
    lieutenant:     { min: 1500, max: 1600 },
    detective:      { min: 2500, max: 2600 },
    watch_sergeant: { min: 2500, max: 2600 },
    field_sergeant: { min: 3500, max: 3600 },
    sr_deputy:      { min: 4500, max: 4600 },
    deputy:         { min: 5500, max: 5600 },
  },
};

const VALID_DEPTS = ["lapd", "lasd"];

const officerSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  department:  { type: String, required: true, enum: VALID_DEPTS, default: "lapd" },
  rank:        { type: String, required: true },
  badgeNumber: { type: Number, required: true },
});

// Badge numbers are unique per department; names are unique per department
officerSchema.index({ name: 1, department: 1 }, { unique: true });
officerSchema.index({ badgeNumber: 1, department: 1 }, { unique: true });

const Officer = mongoose.models.Officer || mongoose.model("Officer", officerSchema);

async function generateBadgeNumber(department, rank) {
  const { min, max } = RANK_RANGES[department][rank];
  const taken = await Officer.find(
    { department, badgeNumber: { $gte: min, $lte: max } },
    { badgeNumber: 1, _id: 0 }
  );
  const usedSet = new Set(taken.map((o) => o.badgeNumber));

  const available = [];
  for (let n = min; n <= max; n++) {
    if (!usedSet.has(n)) available.push(n);
  }

  if (available.length === 0) throw new Error(`No available badge numbers for ${department.toUpperCase()} rank: ${rank}`);
  return available[Math.floor(Math.random() * available.length)];
}

function validateDeptRank(department, rank) {
  if (!VALID_DEPTS.includes(department))
    throw new Error(`Invalid department: "${department}". Must be lapd or lasd.`);
  if (!RANK_RANGES[department][rank])
    throw new Error(`Invalid rank "${rank}" for ${department.toUpperCase()}.`);
}

async function assignBadge(name, rank, department, manualBadgeNumber = null) {
  department = department.toLowerCase();
  rank = rank.toLowerCase();
  validateDeptRank(department, rank);

  const existing = await Officer.findOne({ name, department });
  if (existing)
    throw new Error(`"${name}" already has a ${department.toUpperCase()} badge (#${existing.badgeNumber}). Use promoteBadge() to update.`);

  let badgeNumber;
  if (manualBadgeNumber !== null) {
    const num = parseInt(manualBadgeNumber, 10);
    if (isNaN(num)) throw new Error("Badge number must be a valid number.");

    const { min, max } = RANK_RANGES[department][rank];
    if (num < min || num > max)
      throw new Error(`Badge #${num} is outside the ${rank} range (${min}–${max}) for ${department.toUpperCase()}.`);

    const taken = await Officer.findOne({ department, badgeNumber: num });
    if (taken) throw new Error(`Badge #${num} is already assigned to ${taken.name}.`);

    badgeNumber = num;
  } else {
    badgeNumber = await generateBadgeNumber(department, rank);
  }

  const officer = await Officer.create({ name, department, rank, badgeNumber });

  console.log(`[ASSIGNED] [${department.toUpperCase()}] ${name} | ${rank.toUpperCase()} | #${badgeNumber}`);
  return { name: officer.name, department: officer.department, rank: officer.rank, badgeNumber: officer.badgeNumber };
}

async function promoteBadge(name, newRank, department) {
  department = department.toLowerCase();
  newRank = newRank.toLowerCase();
  validateDeptRank(department, newRank);

  const officer = await Officer.findOne({ name, department });
  if (!officer) throw new Error(`No ${department.toUpperCase()} record found for "${name}".`);
  if (officer.rank === newRank) throw new Error(`${name} is already ranked as ${newRank} in ${department.toUpperCase()}.`);

  const previousBadge = officer.badgeNumber;
  const newBadge = await generateBadgeNumber(department, newRank);

  officer.rank = newRank;
  officer.badgeNumber = newBadge;
  await officer.save();

  console.log(`[PROMOTED] [${department.toUpperCase()}] ${name} | #${previousBadge} → #${newBadge} (${newRank.toUpperCase()})`);
  return { name: officer.name, department: officer.department, rank: officer.rank, badgeNumber: officer.badgeNumber, previousBadge };
}

async function lookupBadge(name, department) {
  department = department.toLowerCase();
  const officer = await Officer.findOne({ name, department });
  if (!officer) return null;
  return { name: officer.name, department: officer.department, rank: officer.rank, badgeNumber: officer.badgeNumber };
}

async function removeBadge(name, department) {
  department = department.toLowerCase();
  const result = await Officer.deleteOne({ name, department });
  if (result.deletedCount === 0) throw new Error(`No ${department.toUpperCase()} record found for "${name}".`);
  console.log(`[REMOVED] [${department.toUpperCase()}] ${name}`);
}

async function listBadges(department, rank = null) {
  department = department.toLowerCase();
  const query = { department };
  if (rank) query.rank = rank.toLowerCase();
  const records = await Officer.find(query).sort({ badgeNumber: 1 });
  return records.map((r) => ({ name: r.name, department: r.department, rank: r.rank, badgeNumber: r.badgeNumber }));
}

module.exports = { assignBadge, promoteBadge, lookupBadge, removeBadge, listBadges };
