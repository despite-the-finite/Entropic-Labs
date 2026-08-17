#!/usr/bin/env python3
"""Give the hero's off-road vehicle a 4Runner roofline.

The sprite reads as a pickup: the cabin roof stops at x=126 and the body runs on
to x=176 with nothing above it. Extending the roof back and dropping a raked
hatch closes the greenhouse, which is what separates an SUV from a pickup — and
the cabin's existing rear pillar then reads as the B-pillar between the front
and rear side windows. Drawn 4x and downsampled so the new strokes carry the
same soft edge as the original, with a blurred copy underneath for the glow.
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

SRC = '/home/user/Entropic-Labs/img/hero-fig-truck.png'
S = 4                      # supersample factor
CORE = (101, 68, 147)      # matched to the brightest pixels of the existing strokes
STROKE = 6                 # measured stroke width in sprite pixels

base = Image.open(SRC).convert('RGB')
W, H = base.size

layer = Image.new('RGB', (W * S, H * S), (0, 0, 0))
d = ImageDraw.Draw(layer)
w = STROKE * S


def line(p0, p1, width=w):
    d.line([(p0[0] * S, p0[1] * S), (p1[0] * S, p1[1] * S)], fill=CORE, width=width, joint='curve')
    r = width // 2
    for (x, y) in (p0, p1):                     # round the ends, as the artwork does
        d.ellipse([x * S - r, y * S - r, x * S + r, y * S + r], fill=CORE)


# The artwork is a pickup: cabin roof stops at x=127, then 45px of open bed.
# Carrying the roof all the way to the tail turns it into a van — with only a
# 20px hood, a full-length roof is the cab-forward silhouette. A 4Runner instead
# has a roof over roughly 60% of its length, a hard-raked hatch, and a tail that
# carries on past it.
ROOF_Y = 35.5
line((124, ROOF_Y), (146, ROOF_Y))              # roof, stopping well short of the tail
line((146, ROOF_Y), (162, 58))                  # hatch, raked hard over the rear overhang
line((134, 39), (134, 56), width=int(w * 0.5))  # divides the rear side window

# roof rack over the cabin only — overland kit, not roof rails
rack = int(w * 0.34)
line((74, 30.6), (140, 30.6), width=rack)
line((84, 31), (84, 34.6), width=rack)
line((130, 31), (130, 34.6), width=rack)

add = layer.resize((W, H), Image.LANCZOS)
glow = add.filter(ImageFilter.GaussianBlur(3.4))

# max for the cores so overlapping ends do not double into bright blobs;
# the glow stays additive because that is how light behaves
a = np.maximum(np.asarray(base).astype(np.int16), np.asarray(add).astype(np.int16))
a = a + (np.asarray(glow).astype(np.float32) * 0.42).astype(np.int16)
out = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
out.quantize(colors=112, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(SRC, optimize=True)

import os
print(f'wrote {SRC}: {W}x{H}, {os.path.getsize(SRC):,} B')
out.resize((W * 3, H * 3), Image.NEAREST).save(
    '/tmp/claude-0/-home-user-Entropic-Labs/b6d4a982-d7d9-58c7-8a3d-e500cc25b7cf/scratchpad/truck-4runner.png')
