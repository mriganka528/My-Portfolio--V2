import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";

const artwork = await readFile(new URL("../public/brand/portfolio-icon.png", import.meta.url));
const render = (size) => sharp(artwork).rotate().resize(size, size, { fit: "contain", background: "#04080d" });

await writeFile(new URL("../src/app/icon.png", import.meta.url), await render(512).png().toBuffer());
await writeFile(new URL("../src/app/apple-icon.png", import.meta.url), await render(180).flatten({ background: "#04080d" }).png().toBuffer());

// ICO directory entries point to PNG images at common browser-tab resolutions.
const sizes = [16, 32, 48, 64];
// Turbopack's ICO decoder requires RGBA PNGs, even when the artwork is opaque.
const frames = await Promise.all(sizes.map(size => render(size).toColourspace("srgb").ensureAlpha().png({ palette: false }).toBuffer()));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  directory.writeUInt8(sizes[index], entry);
  directory.writeUInt8(sizes[index], entry + 1);
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(new URL("../src/app/favicon.ico", import.meta.url), Buffer.concat([directory, ...frames]));
console.log("Generated favicon.ico (16/32/48/64px), icon.png (512px), and apple-icon.png (180px).");
