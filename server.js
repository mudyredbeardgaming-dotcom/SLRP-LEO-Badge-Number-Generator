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
  const { name, rank } = req.body;
  if (!name || !rank) return res.status(400).json({ error: "name and rank are required." });
  try {
    const result = await assignBadge(name.trim(), rank.trim());
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Promote to a new rank
app.post("/api/promote", async (req, res) => {
  const { name, newRank } = req.body;
  if (!name || !newRank) return res.status(400).json({ error: "name and newRank are required." });
  try {
    const result = await promoteBadge(name.trim(), newRank.trim());
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Lookup by name
app.get("/api/lookup/:name", async (req, res) => {
  const result = await lookupBadge(decodeURIComponent(req.params.name));
  if (!result) return res.status(404).json({ error: "Officer not found." });
  res.json({ success: true, data: result });
});

// Remove an officer
app.delete("/api/remove/:name", async (req, res) => {
  try {
    await removeBadge(decodeURIComponent(req.params.name));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all (optionally filtered by rank)
app.get("/api/list", async (req, res) => {
  const { rank } = req.query;
  const result = await listBadges(rank || null);
  res.json({ success: true, data: result });
});

// Connect to MongoDB then start server
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`LAPD Badge Manager running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
