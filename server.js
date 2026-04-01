require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const { assignBadge, promoteBadge, lookupBadge, removeBadge, listBadges } = require("./badgeManager");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Assign a new badge
app.post("/api/assign", async (req, res) => {
  const { name, rank, department, badgeNumber } = req.body;
  if (!name || !rank || !department)
    return res.status(400).json({ error: "name, rank, and department are required." });
  try {
    const result = await assignBadge(name.trim(), rank.trim(), department.trim(), badgeNumber ?? null);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Promote to a new rank
app.post("/api/promote", async (req, res) => {
  const { name, newRank, department } = req.body;
  if (!name || !newRank || !department)
    return res.status(400).json({ error: "name, newRank, and department are required." });
  try {
    const result = await promoteBadge(name.trim(), newRank.trim(), department.trim());
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Lookup by name
app.get("/api/lookup/:name", async (req, res) => {
  const { department } = req.query;
  if (!department) return res.status(400).json({ error: "department query param is required." });
  const result = await lookupBadge(decodeURIComponent(req.params.name), department);
  if (!result) return res.status(404).json({ error: "Officer not found." });
  res.json({ success: true, data: result });
});

// Remove an officer
app.delete("/api/remove/:name", async (req, res) => {
  const { department } = req.query;
  if (!department) return res.status(400).json({ error: "department query param is required." });
  try {
    await removeBadge(decodeURIComponent(req.params.name), department);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all (filtered by department, optionally by rank)
app.get("/api/list", async (req, res) => {
  const { department, rank } = req.query;
  if (!department) return res.status(400).json({ error: "department query param is required." });
  try {
    const result = await listBadges(department, rank || null);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Connect to MongoDB then start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("Connected to MongoDB");

    // Drop legacy single-field indexes left over from the original schema
    // (before department support was added). Safe to run every startup —
    // dropIndex throws if the index doesn't exist, which we ignore.
    const col = mongoose.connection.collection("officers");
    for (const idx of ["name_1", "badgeNumber_1"]) {
      try {
        await col.dropIndex(idx);
        console.log(`Dropped legacy index: ${idx}`);
      } catch (_) { /* already gone */ }
    }

    app.listen(PORT, () => {
      console.log(`LAPD Badge Manager running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
