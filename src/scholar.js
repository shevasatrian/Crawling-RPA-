/**
 * scholar.js
 * Handles all Google Scholar interactions:
 * - Navigate to Scholar
 * - Search for a keyword
 * - Extract paper results with PDF links
 */

const { randomDelay, humanType } = require('./browser');
const config = require('./config');

const SCHOLAR_URL = 'https://scholar.google.com';

/**
 * Navigate to Google Scholar and perform a search.
 * @param {Page} page - Puppeteer page
 * @param {string} query - Search keyword
 * @returns {Promise<void>}
 */
async function searchScholar(page, query) {
  console.log(`   🌐 Navigating to Google Scholar...`);
  await page.goto(SCHOLAR_URL, { waitUntil: 'domcontentloaded' });
  await randomDelay(300, 500);

  // Wait for search input
  await page.waitForSelector('input[name="q"]', { timeout: 10000 });
  console.log(`   🔍 Typing search query: "${query}"`);

  await humanType(page, 'input[name="q"]', query);
  await randomDelay(100, 200);

  // Submit search
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
    page.keyboard.press('Enter'),
  ]);

  await randomDelay(200, 400);
  console.log(`   ✅ Search results loaded`);
}

/**
 * Extract paper results from the current Scholar search results page.
 * Returns papers with their title, authors, direct PDF link (if any), and paper URL.
 * @param {Page} page - Puppeteer page
 * @returns {Promise<Array>} Array of paper objects
 */
async function extractResults(page) {
  // Check for CAPTCHA
  const isCaptcha = await page.evaluate(() => {
    return (
      document.title.toLowerCase().includes('captcha') ||
      !!document.querySelector('form#captcha-form') ||
      !!document.querySelector('#recaptcha')
    );
  });

  if (isCaptcha) {
    throw new Error('CAPTCHA detected! Google is blocking automated access. Try again later or use a different IP.');
  }

  // Wait for results
  await page.waitForSelector('#gs_res_ccl_mid', { timeout: 10000 });

  const papers = await page.evaluate(() => {
    const results = [];
    const items = document.querySelectorAll('.gs_r.gs_or.gs_scl');

    items.forEach((item) => {
      // Title and paper URL
      const titleEl = item.querySelector('.gs_rt a');
      const title = titleEl ? titleEl.textContent.trim() : 'Unknown Title';
      const paperUrl = titleEl ? titleEl.href : null;

      // Authors / meta
      const metaEl = item.querySelector('.gs_a');
      const meta = metaEl ? metaEl.textContent.trim() : '';

      // Direct PDF link — shown as [PDF] tag on the left side
      const pdfLinkEl = item.querySelector('.gs_or_ggsm a');
      let directPdfUrl = null;
      if (pdfLinkEl) {
        const href = pdfLinkEl.href || '';
        if (href.toLowerCase().includes('.pdf') || pdfLinkEl.textContent.includes('PDF')) {
          directPdfUrl = href;
        }
      }

      // Also check for [PDF] badges in the result block
      const allLinks = item.querySelectorAll('a');
      allLinks.forEach((link) => {
        if (!directPdfUrl && link.textContent.trim() === '[PDF]') {
          directPdfUrl = link.href;
        }
      });

      results.push({ title, paperUrl, directPdfUrl, meta });
    });

    return results;
  });

  return papers;
}

/**
 * Check if a CAPTCHA appeared during crawl.
 * @param {Page} page
 * @returns {Promise<boolean>}
 */
async function hasCaptcha(page) {
  return page.evaluate(() => {
    return (
      document.title.toLowerCase().includes('captcha') ||
      !!document.querySelector('form#captcha-form') ||
      !!document.querySelector('#recaptcha') ||
      document.body.innerText.toLowerCase().includes('unusual traffic')
    );
  });
}

module.exports = { searchScholar, extractResults, hasCaptcha };