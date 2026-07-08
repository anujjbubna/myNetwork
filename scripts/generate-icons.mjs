import sharp from "sharp";
import { mkdirSync } from "node:fs";

// Warm terracotta rounded-square icon with a simple "network of people" mark.
const svg = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect x="${pad}" y="${pad}" width="${512 - 2 * pad}" height="${512 - 2 * pad}" rx="${pad ? 0 : 112}" fill="#c2571f"/>
  <g stroke="#faf7f2" stroke-width="18" fill="none">
    <line x1="256" y1="216" x2="150" y2="330"/>
    <line x1="256" y1="216" x2="362" y2="330"/>
    <line x1="150" y1="330" x2="362" y2="330"/>
  </g>
  <g fill="#faf7f2">
    <circle cx="256" cy="176" r="58"/>
    <circle cx="150" cy="336" r="44"/>
    <circle cx="362" cy="336" r="44"/>
  </g>
</svg>`;

mkdirSync("public/icons", { recursive: true });

await sharp(Buffer.from(svg(0))).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(Buffer.from(svg(0))).resize(512, 512).png().toFile("public/icons/icon-512.png");
// Maskable: full-bleed background (pad=1 keeps rect square-edged, safe zone handled by viewBox)
await sharp(Buffer.from(svg(1))).resize(512, 512).png().toFile("public/icons/icon-512-maskable.png");

console.log("Icons generated in public/icons/");
