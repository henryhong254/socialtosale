const puppeteer = require('puppeteer');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
(async () => {
  const browser = await puppeteer.launch();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(__dirname, 'index.html')).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    // Frame the current hero for sharing, without navigation or overlays.
    await page.addStyleTag({ content: `
      body > *:not(#hero) { display: none !important; }
      #hero { height: 630px !important; min-height: 630px !important; padding: 28px 24px !important; }
      #hero *, #hero *::before, #hero *::after { animation-play-state: paused !important; }
    ` });
    const hero = await page.$('#hero');
    await hero.screenshot({ path: path.join(__dirname, 'Assets', 'hero-social-to-sale-20261008.png') });
    console.log('Saved current hero thumbnail (1200 x 630).');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
