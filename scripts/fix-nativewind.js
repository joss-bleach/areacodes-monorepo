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

if (fs.existsSync(link)) {
  fs.rmSync(link, { recursive: true, force: true });
}

fs.symlinkSync(target, link, "dir");

console.log("✓ NativeWind: symlinked tailwindcss v3 from apps/mobile");
