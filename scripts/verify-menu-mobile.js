#!/usr/bin/env node
/**
 * Static checks: phone menu must not use transform marquee or body position:fixed lightbox lock.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "public/css/main.css"), "utf8");
const js = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");

const errors = [];

if (/body\.is-lightbox-open\s*\{[^}]*position:\s*fixed/s.test(css)) {
  errors.push("Lightbox uses body position:fixed (iOS menu vanish bug)");
}

if (!/\.track--static/.test(css)) {
  errors.push("Missing .track--static styles for mobile");
}

if (!/isMobile[\s\S]*track--static/.test(js)) {
  errors.push("initTracks must add track--static when isMobile");
}

if (/syncOpenState/.test(js)) {
  errors.push("syncOpenState clone toggling still present (causes mobile glitches)");
}

if (!/closeMenuOrderOverlays/.test(js)) {
  errors.push("Missing closeMenuOrderOverlays helper");
}

if (errors.length) {
  console.error("verify-menu-mobile FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log("verify-menu-mobile OK");
