#!/usr/bin/env node
/**
 * Static checks: desktop menu must not pause marquee on hover or hijack wheel.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const css = fs.readFileSync(path.join(root, "public/css/main.css"), "utf8");
const js = fs.readFileSync(path.join(root, "public/js/app.js"), "utf8");

const errors = [];

if (/animation-play-state:\s*paused/.test(css)) {
  errors.push("CSS still pauses animation (animation-play-state: paused)");
}

if (/initTrackWheelScroll/.test(js)) {
  errors.push("JS still contains initTrackWheelScroll wheel hijacker");
}

if (!/\.track-viewport\s*\{[^}]*pointer-events:\s*none/s.test(css)) {
  errors.push("track-viewport missing pointer-events: none");
}

if (!/\.track--marquee[\s\S]*?pointer-events:\s*none/.test(css)) {
  errors.push("track--marquee missing pointer-events: none");
}

if (!/\.slide[\s\S]*?pointer-events:\s*auto/.test(css)) {
  errors.push(".slide missing pointer-events: auto");
}

if (!/:hover \.slide-order-overlay/.test(css) && !/:hover\.slide-order-overlay/.test(css)) {
  if (!/slide:not\(\.slide--offer\):hover \.slide-order-overlay/.test(css)) {
    errors.push("Desktop hover hotline overlay rule missing");
  }
}

if (errors.length) {
  console.error("verify-menu-desktop FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}

console.log("verify-menu-desktop OK");
