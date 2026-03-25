const express = require("express");
const path = require("path");
const { assignBadge, promoteBadge, lookupBadge, removeBadge, listBadges } = require("./badgeManager");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Assign a new badge
app.post("/api/assign", (req, res) => {
  const { name, rank } = req.body;
  if (!name || !rank) return res.status(400).json({ error: "name and rank are required." });
  try {
    const result = assignBadge(name.trim(), rank.trim());
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Promote to a new rank
app.post("/api/promote", (req, res) => {
  const { name, newRank } = req.body;
  if (!name || !newRank) return res.status(400).json({ error: "name and newRank are required." });
  try {
    const result = promoteBadge(name.trim(), newRank.trim());
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Lookup by name
app.get("/api/lookup/:name", (req, res) => {
  const result = lookupBadge(decodeURIComponent(req.params.name));
  if (!result) return res.status(404).json({ error: "Officer not found." });
  res.json({ success: true, data: result });
});

// Remove an officer
app.delete("/api/remove/:name", (req, res) => {
  try {
    removeBadge(decodeURIComponent(req.params.name));
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// List all (optionally filtered by rank)
app.get("/api/list", (req, res) => {
  const { rank } = req.query;
  const result = listBadges(rank || null);
  res.json({ success: true, data: result });
});

app.listen(PORT, () => {
  console.log(`LAPD Badge Manager running at http://localhost:${PORT}`);
});
