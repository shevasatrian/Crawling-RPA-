/**
 * downloader.js
 * Downloads PDF files from URLs and saves them locally.
 * Supports both direct PDF links and paper page scraping.
 */

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const config = require('./config');

/**
 * Ensure output directory exists.
 */
function ensureOutputDir() {
  if (!fs.existsSync(config.OUTPUT_DIR)) {
    fs.mkdirSync(config.OUTPUT_DIR, { recursive: true });
  }
}

/**
 * Sanitize a string to be safe as a filename.
 * @param {string} name
 * @returns {string}
 */
function sanitizeFilename(name) {
  return name
    .replace(/[^a-z0-9\s\-_]/gi, '')
    .replace(/\s+/g, '_')
    .substring(0, 80);
}

/**
 * Download a PDF from a direct URL and save it locally.
 * @param {string} url - Direct PDF URL
 * @param {string} filename - Filename without extension
 * @returns {Promise<string|null>} Saved file path or null on failure
 */
async function downloadPDF(url, filename) {
  ensureOutputDir();

  const safeName = sanitizeFilename(filename);
  const outputPath = path.join(config.OUTPUT_DIR, `${safeName}.pdf`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': config.USER_AGENT,
        'Accept': 'application/pdf,*/*',
        'Referer': 'https://scholar.google.com/',
      },
      timeout: 15000,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('pdf') && !contentType.includes('octet-stream')) {
      throw new Error(`Not a PDF (content-type: ${contentType})`);
    }

    const buffer = await response.buffer();

    // Validate PDF magic bytes (%PDF-)
    if (buffer.length < 5 || buffer.toString('ascii', 0, 5) !== '%PDF-') {
      throw new Error('Downloaded file is not a valid PDF');
    }

    fs.writeFileSync(outputPath, buffer);
    return outputPath;
  } catch (err) {
    console.log(`      ⚠️  Download failed: ${err.message}`);
    return null;
  }
}

/**
 * Try to find a PDF link within a paper's page using Puppeteer.
 * @param {Page} page - Puppeteer page
 * @param {string} paperUrl - URL of the paper page
 * @returns {Promise<string|null>} PDF URL or null
 */
async function findPDFOnPage(page, paperUrl) {
  try {
    await page.goto(paperUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });

    // Look for common PDF link patterns on academic sites
    const pdfUrl = await page.evaluate(() => {
      const selectors = [
        'a[href$=".pdf"]',
        'a[href*="/pdf/"]',
        'a[href*="=pdf"]',
        'a[href*="filetype=pdf"]',
        'a.pdf-link',
        'a[data-clk-atid]',
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.href) return el.href;
      }

      // Scan all links for PDF patterns
      const links = Array.from(document.querySelectorAll('a[href]'));
      for (const link of links) {
        if (link.href && link.href.toLowerCase().includes('.pdf')) {
          return link.href;
        }
      }

      return null;
    });

    return pdfUrl;
  } catch {
    return null;
  }
}

module.exports = { downloadPDF, findPDFOnPage, ensureOutputDir };
