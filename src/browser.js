/**
 * browser.js
 * Sets up Puppeteer with stealth plugin to avoid bot detection.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const config = require('./config');

// Apply all stealth evasions
puppeteer.use(StealthPlugin());

/**
 * Launch a stealth browser instance.
 * @returns {Promise<Browser>}
 */
async function launchBrowser() {
  const browser = await puppeteer.launch({
    headless: config.HEADLESS,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--window-size=1280,900',
      // Avoid detection flags
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
  });

  return browser;
}

/**
 * Create a new stealth page with realistic settings.
 * @param {Browser} browser
 * @returns {Promise<Page>}
 */
async function createPage(browser) {
  const page = await browser.newPage();

  // Set realistic user agent
  await page.setUserAgent(config.USER_AGENT);

  // Set extra HTTP headers to look like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  });

  // Set timeouts
  page.setDefaultTimeout(config.BROWSER_TIMEOUT);
  page.setDefaultNavigationTimeout(config.NAVIGATION_TIMEOUT);

  // Override webdriver property (stealth)
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  return page;
}

/**
 * Random delay to mimic human behavior.
 * @param {number} min - Min ms
 * @param {number} max - Max ms
 */
async function randomDelay(min = 300, max = 800) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((r) => setTimeout(r, ms));
}

/**
 * Type text with human-like speed.
 * @param {Page} page
 * @param {string} selector
 * @param {string} text
 */
async function humanType(page, selector, text) {
  await page.focus(selector);
  await page.click(selector, { clickCount: 3 }); // Select all first
  for (const char of text) {
    await page.type(selector, char, {
      delay: Math.floor(Math.random() * (config.TYPE_DELAY_MAX - config.TYPE_DELAY_MIN) + config.TYPE_DELAY_MIN),
    });
  }
}

module.exports = { launchBrowser, createPage, randomDelay, humanType };
