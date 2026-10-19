#!/usr/bin/env python3
"""Draw the Forkcast app icons (no dependencies): green tile, white plate."""
import struct, zlib
from pathlib import Path

GREEN, DEEP, WHITE = (31, 122, 79), (23, 96, 61), (255, 255, 255)

def pixel(x, y, n):
    cx = cy = n / 2
    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / n
    if d < 0.30:
        return GREEN if 0.205 < d < 0.225 else WHITE   # plate with a rim line
    if 0.30 <= d < 0.33 and y > cy:
        return DEEP                                    # soft shadow under the plate
    return GREEN

def png(n, path, ss=3):
    rows = []
    for y in range(n):
        row = bytearray([0])
        for x in range(n):
            acc = [0, 0, 0]
            for sy in range(ss):
                for sx in range(ss):
                    c = pixel((x + (sx + .5) / ss) * 1, (y + (sy + .5) / ss) * 1, n)
                    acc = [a + b for a, b in zip(acc, c)]
            row += bytes(round(a / ss / ss) for a in acc)
        rows.append(bytes(row))
    raw = zlib.compress(b"".join(rows), 9)
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 2, 0, 0, 0)) + chunk(b"IDAT", raw) + chunk(b"IEND", b"")
    Path(path).write_bytes(data)

out = Path(__file__).resolve().parent.parent / "icons"
for n, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    png(n, out / name)
    print("wrote", name)
