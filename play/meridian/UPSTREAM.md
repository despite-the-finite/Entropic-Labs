# Hosted copy — Donnell and McBurns: An EPC Epic

This directory is a copy of the game, served from this site so the **Play it now**
button on `games.html` works in a browser with no setup.

- **Source:** https://github.com/despite-the-finite/Work-Video-Game-Meridian
- **Copied at commit:** `2a0aa33879a34aac43db633cd1b8df707be20e4e`
- **Played at:** https://despite-the-finite.github.io/Entropic-Labs/play/meridian/

The game is entirely static — relative paths, no build step, and Phaser 3 is
vendored in `src/vendor/` (MIT) rather than loaded from a CDN — so it runs as-is
off GitHub Pages. All of its art is generated procedurally at boot, so there are
no image assets to carry across.

## Refreshing this copy

Nothing here is edited; treat it as read-only and re-copy when the game changes
upstream:

```bash
git clone --depth 1 https://github.com/despite-the-finite/Work-Video-Game-Meridian /tmp/meridian
rm -rf play/meridian/index.html play/meridian/src
cp -r /tmp/meridian/index.html /tmp/meridian/src play/meridian/
```

Then update the commit recorded above.
