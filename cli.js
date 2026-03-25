#!/usr/bin/env node
/**
 * LAPD Badge Number Generator - CLI
 *
 * Usage:
 *   node cli.js assign   <name> <rank>
 *   node cli.js promote  <name> <newRank>
 *   node cli.js lookup   <name>
 *   node cli.js remove   <name>
 *   node cli.js list     [rank]
 *
 * Ranks: officer | sergeant | lieutenant | detective
 *
 * Examples:
 *   node cli.js assign "John Smith" officer
 *   node cli.js promote "John Smith" sergeant
 *   node cli.js list
 *   node cli.js list detective
 */

const { assignBadge, promoteBadge, lookupBadge, removeBadge, listBadges } = require("./badgeManager");

const [, , command, ...args] = process.argv;

try {
  switch (command) {
    case "assign": {
      if (args.length < 2) throw new Error("Usage: assign <name> <rank>");
      const [name, rank] = args;
      assignBadge(name, rank);
      break;
    }
    case "promote": {
      if (args.length < 2) throw new Error("Usage: promote <name> <newRank>");
      const [name, newRank] = args;
      promoteBadge(name, newRank);
      break;
    }
    case "lookup": {
      if (args.length < 1) throw new Error("Usage: lookup <name>");
      lookupBadge(args[0]);
      break;
    }
    case "remove": {
      if (args.length < 1) throw new Error("Usage: remove <name>");
      removeBadge(args[0]);
      break;
    }
    case "list": {
      listBadges(args[0] || null);
      break;
    }
    default:
      console.log(`
LAPD Badge Number Generator
────────────────────────────
Commands:
  assign  <name> <rank>      Assign a new badge number
  promote <name> <newRank>   Promote officer to new rank
  lookup  <name>             Look up officer by name
  remove  <name>             Remove officer and free badge
  list    [rank]             List all officers (optional rank filter)

Ranks: officer | sergeant | lieutenant | detective

Badge Ranges:
  Officers:    1000 – 4999
  Sergeants:   5000 – 5999
  Lieutenants: 6000 – 6999
  Detectives:  7000 – 9999
`);
  }
} catch (err) {
  console.error(`[ERROR] ${err.message}`);
  process.exit(1);
}
