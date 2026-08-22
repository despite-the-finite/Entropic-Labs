/* Entropic Labs — the tour's screenshots.
 * ===========================================================================
 * Re-takes the five shots the foyer tour shows, at a desktop viewport and on a
 * phone, and writes them to img/tour/ as WebP. Run it whenever one of the five
 * pages changes appearance — the whole point of the tour is that the pictures
 * in it are the real pages, and a stale screenshot is worse than none.
 *
 *   node tools-tour-shots.mjs            # against a local server on :8099
 *   node tools-tour-shots.mjs http://…   # against somewhere else
 *
 * Needs a local server serving the repo root (the pages fetch their own data)
 * and Playwright's Chromium:
 *
 *   npx http-server -p 8099 -s .
 *
 * The phone shots follow the site's own redirects, which is why the Studio and
 * the Game Room come back as /m/ and /m/games.html — those are what a phone
 * actually gets, so those are what the tour shows.
 * ===========================================================================
 */
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = (process.argv[2] || 'http://127.0.0.1:8099/').replace(/\/?$/, '/');
const OUT = 'img/tour';

/* Each room gets whatever preparation shows it as a visitor actually meets it:
   past its gate, or scrolled to the part that carries the content rather than
   the masthead. */
const ROOMS = [
  { key: 'foyer', url: 'index.html', settle: 4000 },

  { key: 'observatory', url: 'observatory.html', settle: 4000 },

  { key: 'studio', url: 'studio.html', settle: 4500 },

  {
    key: 'games', url: 'games.html', settle: 2500,
    async prep(page) {
      /* The hero is mostly empty space; the catalogue is the room. */
      await page.evaluate(() => {
        const el = document.querySelector('#catalog') || document.querySelector('h2');
        if (!el) return;
        const card = el.closest('article, li, section, div') || el;
        const top = card.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, Math.max(0, top - 96));   /* clear of the sticky header */
      });
      await page.waitForTimeout(1800);
    }
  },

  {
    key: 'butterfly', url: 'butterfly.html', settle: 2500,
    async prep(page) {
      /* Trails opens on its own intro. The trail map is behind it. */
      const skip = page.locator('#gate-skip');
      if (await skip.count() && await skip.isVisible()) await skip.click();
      await page.waitForTimeout(4500);
    }
  }
];

/* Kept in step with foyer/tour.css: the browser frame is drawn at 1440x900 and
   the handset at the 390x664 Playwright's iPhone reports. */
const VIEWS = [
  { suffix: 'desktop', width: 1440, quality: 0.82,
    context: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 } },
  { suffix: 'mobile', width: 586, quality: 0.86,
    context: { ...devices['iPhone 13 Pro'] } }
];

fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

/* No cwebp on hand and none needed — the same Chromium that took the shot can
   scale it and re-encode it through a canvas. */
const oven = await browser.newPage();
await oven.goto('about:blank');

async function toWebp(png, width, quality) {
  return oven.evaluate(async ({ b64, width, quality }) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = width;
    c.height = Math.round(img.naturalHeight * (width / img.naturalWidth));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/webp', quality).split(',')[1];
  }, { b64: png.toString('base64'), width, quality });
}

for (const view of VIEWS) {
  const ctx = await browser.newContext(view.context);

  /* The foyer opens the tour by itself on a first visit, and a fresh context
     is always a first visit — without this the foyer's own chapter ends up
     being a photograph of the tour photographing the foyer. Marking it seen
     before the page runs is the same thing a returning visitor's browser
     does. See SEEN_KEY in foyer/tour.js. */
  await ctx.addInitScript(() => {
    try { localStorage.setItem('el.tour.seen', '1'); } catch (e) {}
  });

  for (const room of ROOMS) {
    const page = await ctx.newPage();
    try {
      await page.goto(BASE + room.url, { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(room.settle);
      if (room.prep) await room.prep(page);

      const png = await page.screenshot();
      const webp = await toWebp(png, view.width, view.quality);
      const dest = path.join(OUT, `${room.key}-${view.suffix}.webp`);
      fs.writeFileSync(dest, Buffer.from(webp, 'base64'));

      const kb = (fs.statSync(dest).size / 1024).toFixed(0);
      console.log(`${dest}  ${kb} KB  ←  ${page.url()}`);
    } catch (e) {
      console.error(`FAILED ${room.key}-${view.suffix}: ${e.message}`);
      process.exitCode = 1;
    }
    await page.close();
  }
  await ctx.close();
}

await browser.close();
