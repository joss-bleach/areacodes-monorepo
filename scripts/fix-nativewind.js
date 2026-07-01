#!/usr/bin/env node
// NativeWind is hoisted to root node_modules where it resolves tailwindcss as v4
// (used by the web apps). Symlinking mobile's local tailwindcss v3 into nativewind's
// own node_modules ensures it always resolves v3 for both version checks and imports.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const target = path.join(root, "apps", "mobile", "node_modules", "tailwindcss");
const linkDir = path.join(root, "node_modules", "nativewind", "node_modules");
const link = path.join(linkDir, "tailwindcss");

fs.mkdirSync(linkDir, { recursive: true });

try {
  fs.lstatSync(link);
  fs.rmSync(link, { recursive: true, force: true });
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}

// Use a relative target so the symlink stays valid across machines/CI containers
// (an absolute path baked in by one environment breaks in every other one).
fs.symlinkSync(path.relative(linkDir, target), link, "dir");

console.log("✓ NativeWind: symlinked tailwindcss v3 from apps/mobile");
