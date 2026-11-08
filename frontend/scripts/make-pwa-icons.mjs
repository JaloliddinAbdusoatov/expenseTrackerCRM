#!/usr/bin/env node
/**
 * Writes public/192x192.png and public/512x512.png (solid fill) so manifest icons resolve.
 * Chrome needs real PNGs for installability / beforeinstallprompt.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

function crc32(buf) {
  let c = ~0 >>> 0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** RGB 8-bit, color type 2 */
function solidPng(width, height, r, g, b) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 3;
  const raw = Buffer.alloc(stride * height + height);
  let o = 0;
  const px = Buffer.from([r, g, b]);
  for (let y = 0; y < height; y++) {
    raw[o++] = 0;
    for (let x = 0; x < width; x++) {
      px.copy(raw, o);
      o += 3;
    }
  }

  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// manifest.json background_color / theme
const r = 0x0f;
const g = 0x17;
const b = 0x2a;

writeFileSync(join(publicDir, '192x192.png'), solidPng(192, 192, r, g, b));
writeFileSync(join(publicDir, '512x512.png'), solidPng(512, 512, r, g, b));
console.log('Wrote public/192x192.png and public/512x512.png');
