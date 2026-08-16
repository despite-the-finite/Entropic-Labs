#!/usr/bin/env python3
"""Split the hero artwork into a static backdrop plus animatable layers.

The banner ships as one flat JPEG, so nothing in it can move. This takes the 4K
source and produces:

  img/hero.jpg          backdrop with the subtitle, the spectrum bars and the
  img/hero-mobile.jpg   five figures painted out
  img/hero-fig-*.png    each figure as an additive sprite

A sprite is the difference between the original and the cleaned backdrop, so
screen-blending one back at its original position reproduces the source exactly,
and moving it reads as the glowing figure moving.
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = '/root/.claude/uploads/b6d4a982-d7d9-58c7-8a3d-e500cc25b7cf/4365bb2b-entropic_labs_wallpaper_4k.png'
OUT = '/home/user/Entropic-Labs/img'
GEOM = '/tmp/claude-0/-home-user-Entropic-Labs/b6d4a982-d7d9-58c7-8a3d-e500cc25b7cf/scratchpad/geom.json'
W, H = 3840, 2160

src = np.asarray(Image.open(SRC).convert('RGB')).astype(np.float32)
val = src.max(2)
clean = src.copy()
geom = {}


def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return x * x + y * y <= r * r


def inpaint(img, mask, blur):
    """Fill masked pixels from the nearest unmasked pixel, then soften inside
    the mask. The figures are thin strokes on near-flat ground, so this is
    indistinguishable from the real background once the sprite sits back on top."""
    m = mask.astype(bool)
    _, idx = ndimage.distance_transform_edt(m, return_indices=True)
    out = img.copy()
    out[m] = img[idx[0][m], idx[1][m]]
    soft = np.stack([ndimage.gaussian_filter(out[..., c], blur) for c in range(3)], -1)
    w = np.clip(ndimage.gaussian_filter(m.astype(np.float32), blur / 2) * 1.7, 0, 1)[..., None]
    return out * (1 - w) + soft * w


# ------------------------------------------------------------- 1. subtitle
# Row profiling puts the wordmark's baseline at 946 and the subtitle at 958-997.
SUB = (1180, 948, 2660, 1006)
x0, y0, x1, y1 = SUB
top = clean[y0 - 4:y0, x0:x1].mean(0)
bot = clean[y1:y1 + 4, x0:x1].mean(0)
t = np.linspace(0, 1, y1 - y0)[:, None, None]
clean[y0:y1, x0:x1] = top[None] * (1 - t) + bot[None] * t
geom['subtitle'] = {'left': x0 / W * 100, 'top': y0 / H * 100,
                    'width': (x1 - x0) / W * 100, 'height': (y1 - y0) / H * 100}
print(f'subtitle erased {SUB}')

# ------------------------------------------------------------- 2. figures
WIN = {
    'bike':  (215, 1375,  665, 1745),   # mountain biker, yellow
    'cycle': (745, 1405, 1145, 1775),   # cyclist, teal
    'skate': (1585, 1385, 1945, 1715),  # skateboarder, pink
    'board': (2415, 1375, 2845, 1755),  # snowboarder, white
    'truck': (3085, 1515, 3485, 1805),  # off-road vehicle, violet
}
fig_masks = {}
fig_cores = {}
full = np.zeros((H, W), bool)
for name, (fx0, fy0, fx1, fy1) in WIN.items():
    v = val[fy0:fy1, fx0:fx1]
    glow = v - ndimage.gaussian_filter(ndimage.minimum_filter(v, 41), 10)
    core = glow > 45
    # code glyphs are bright too, so keep only the big connected strokes
    lbl, n = ndimage.label(ndimage.binary_dilation(core, disk(3)))
    sizes = ndimage.sum(core, lbl, range(1, n + 1))
    big = np.isin(lbl, [i + 1 for i in range(n) if sizes[i] > 250])
    core = core & big
    mask = (glow > 14) & ndimage.binary_dilation(core, disk(20))
    mask = ndimage.binary_closing(mask, disk(4))
    mask = ndimage.binary_dilation(mask, disk(3))
    fig_masks[name] = mask
    fig_cores[name] = core
    full[fy0:fy1, fx0:fx1] |= mask
    ys, xs = np.where(mask)
    print(f'  {name:6s} {int(mask.sum()):6d} px, extent x {fx0+xs.min()}..{fx0+xs.max()} y {fy0+ys.min()}..{fy0+ys.max()}')
clean = inpaint(clean, full, blur=9)

# ------------------------------------------------------------- 3. bars
# Bars run from their top edge to the bottom of the frame, so mask each column
# from its topmost bar pixel down. Anything below that line is behind a bar.
mn = src.min(2)
sat = np.where(val > 0, (val - mn) * 255.0 / np.maximum(val, 1), 0)
barish = (val > 45) & (sat > 35)
tops = []
for x in range(W):
    col = np.nonzero(barish[1850:, x])[0]
    tops.append(1850 + col.min() if len(col) else 2100)
CUT = int(np.min(tops)) - 10
print(f'bars: cutting flat at y={CUT} (highest bar top {min(tops)})')

# Fill the whole strip below one flat line rather than following each column's
# bar top — a per-column fill leaves a faint skyline where the tops were.
sample = clean[CUT - 46:CUT - 12].mean(0)
sample = np.stack([ndimage.gaussian_filter1d(sample[:, c], 60) for c in range(3)], -1)
rows = H - CUT
fade = np.linspace(1.0, 0.80, rows)[:, None, None]     # ground darkens toward the frame edge
clean[CUT:] = sample[None] * fade
# feather the seam so the flat fill meets the artwork without an edge
seam = np.zeros((H, W), bool)
seam[CUT - 7:CUT + 7] = True
clean = inpaint(clean, seam, blur=7)
geom['bars'] = {'top': CUT / H * 100}

# ------------------------------------------------------------- 4. sprites
clean = np.clip(clean, 0, 255)
PAD = 16
for name, (fx0, fy0, fx1, fy1) in WIN.items():
    ys, xs = np.where(fig_masks[name])
    ax0, ay0 = fx0 + xs.min() - PAD, fy0 + ys.min() - PAD
    ax1, ay1 = fx0 + xs.max() + PAD, fy0 + ys.max() + PAD
    diff = np.clip(src[ay0:ay1, ax0:ax1] - clean[ay0:ay1, ax0:ax1], 0, 255)
    # Keep only what belongs to the figure. Without this the sprite also carries
    # the matrix glyphs that sat near it, and they would slide along with it.
    m = np.zeros((H, W), bool)
    fx0, fy0 = WIN[name][0], WIN[name][1]
    tight = ndimage.binary_dilation(fig_cores[name], disk(13))
    m[fy0:fy0 + tight.shape[0], fx0:fx0 + tight.shape[1]] = tight
    feather = np.clip(ndimage.gaussian_filter(m[ay0:ay1, ax0:ax1].astype(np.float32), 6) * 2.0, 0, 1)
    diff *= feather[..., None]
    Image.fromarray(diff.astype(np.uint8)).save(f'{OUT}/hero-fig-{name}.png')
    geom[name] = {'left': ax0 / W * 100, 'top': ay0 / H * 100,
                  'width': (ax1 - ax0) / W * 100, 'height': (ay1 - ay0) / H * 100}
    print(f'  sprite {name}: {ax1-ax0}x{ay1-ay0}')

# bar palette, sampled across the width of the original
pal = []
for i in range(13):
    x = min(W - 1, int(i / 12 * W))
    px = src[1900:, max(0, x - 40):x + 40].reshape(-1, 3)
    px = px[px.max(1) > 80]
    pal.append([int(c) for c in (px.mean(0) if len(px) else [40, 70, 110])])
geom['palette'] = pal

geom = {k: ({kk: round(vv, 3) for kk, vv in v.items()} if isinstance(v, dict) else v)
        for k, v in geom.items()}
open(GEOM, 'w').write(json.dumps(geom, indent=1))
print(json.dumps({k: v for k, v in geom.items() if k != 'palette'}, indent=1))

img = Image.fromarray(clean.astype(np.uint8))
img.resize((2400, 1350), Image.LANCZOS).save(f'{OUT}/hero.jpg', 'JPEG', quality=86, optimize=True, progressive=True, subsampling=1)
img.resize((1000, 562), Image.LANCZOS).save(f'{OUT}/hero-mobile.jpg', 'JPEG', quality=82, optimize=True, progressive=True, subsampling=1)
print('wrote backdrops')
