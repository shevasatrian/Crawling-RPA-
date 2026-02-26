/**
 * Quest 1: RPA Crawling — Auto Extract PDF from Google Scholar
 *
 * Flow:
 * 1. Launch stealth browser (Puppeteer + Stealth plugin)
 * 2. Navigate to Google Scholar
 * 3. Search for keyword (default: 'machine learning')
 * 4. Extract paper results
 * 5. For each paper:
 *    a. If [PDF] link exists → download directly
 *    b. Else → visit paper page and look for PDF link
 * 6. Save PDFs to ./output/pdfs/
 * 7. Report results + performance time
 *
 * Usage:
 *   node src/index.js
 *   node src/index.js --query="deep learning" --max=3 --headless=true
 */

const path = require('path');
const fs = require('fs');
const { launchBrowser, createPage, randomDelay } = require('./browser');
const { searchScholar, extractResults, hasCaptcha } = require('./scholar');
const { downloadPDF, findPDFOnPage } = require('./downloader');
const config = require('./config');

// Parse CLI args
function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  args.forEach((arg) => {
    const [key, value] = arg.replace('--', '').split('=');
    result[key] = value;
  });
  return result;
}

function printBanner() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Quest 1: RPA Crawling — Google Scholar     ║');
  console.log('║   Tool: Puppeteer + Stealth Plugin           ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
}

function printSummary(results, elapsed) {
  const successful = results.filter((r) => r.downloaded);
  const failed = results.filter((r) => !r.downloaded);

  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║              📊 CRAWL SUMMARY                ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║  Papers Found   : ${String(results.length).padEnd(26)}║`);
  console.log(`║  PDFs Downloaded: ${String(successful.length).padEnd(26)}║`);
  console.log(`║  Failed/Skipped : ${String(failed.length).padEnd(26)}║`);
  console.log(`║  Output Dir     : ${config.OUTPUT_DIR.padEnd(26)}║`);
  console.log('╠══════════════════════════════════════════════╣');

  const timeStr = `${elapsed}s`;
  const target = elapsed <= config.OPTIMAL_TIME_SECONDS ? '🏆 OPTIMAL!' :
                 elapsed <= config.TARGET_TIME_SECONDS  ? '✅ TARGET MET' : '⚠️  OVER TARGET';
  console.log(`║  ⏱  Time Elapsed: ${timeStr.padEnd(26)}║`);
  console.log(`║  Performance    : ${target.padEnd(26)}║`);
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');

  if (successful.length > 0) {
    console.log('📁 Downloaded PDFs:');
    successful.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.title.substring(0, 60)}...`);
      console.log(`      → ${r.savedPath}`);
      console.log(`      Method: ${r.method}`);
    });
    console.log('');
  }
}

async function main() {
  const args = parseArgs();
  const query = args.query || config.SEARCH_QUERY;
  const maxResults = parseInt(args.max || config.MAX_RESULTS, 10);
  if (args.headless !== undefined) {
    config.HEADLESS = args.headless === 'true';
  }

  printBanner();
  console.log(`🔎 Search Query : "${query}"`);
  console.log(`📥 Max PDFs     : ${maxResults}`);
  console.log(`🖥  Headless     : ${config.HEADLESS}`);
  console.log('');

  const totalStart = Date.now();
  const downloadResults = [];
  let browser = null;

  try {
    // ── Step 1: Launch Browser ──────────────────────────────────────
    console.log('[1/4] 🚀 Launching stealth browser...');
    browser = await launchBrowser();
    const page = await createPage(browser);
    console.log('      ✅ Browser ready\n');

    // ── Step 2: Search Google Scholar ──────────────────────────────
    console.log('[2/4] 🔍 Searching Google Scholar...');
    await searchScholar(page, query);

    // ── Step 3: Extract Results ─────────────────────────────────────
    console.log('\n[3/4] 📋 Extracting paper results...');
    const papers = await extractResults(page);

    if (papers.length === 0) {
      throw new Error('No results found. Scholar may have blocked the request.');
    }

    const targets = papers.slice(0, maxResults);
    console.log(`      ✅ Found ${papers.length} papers, processing top ${targets.length}\n`);

    // ── Step 4: Download PDFs (PARALLEL) ───────────────────────────
    console.log('[4/4] 📥 Downloading PDFs in parallel...');
    console.log('─'.repeat(50));

    // Run all downloads concurrently for maximum speed
    const downloadPromises = targets.map(async (paper, i) => {
      const num = `[${i + 1}/${targets.length}]`;
      console.log(`\n${num} 📄 ${paper.title.substring(0, 70)}`);
      console.log(`      Meta: ${paper.meta.substring(0, 60)}`);

      const result = {
        title: paper.title,
        downloaded: false,
        savedPath: null,
        method: null,
      };

      // Strategy A: Direct [PDF] link from Scholar results
      if (paper.directPdfUrl) {
        console.log(`${num} 🔗 Strategy A: Direct PDF link`);
        const saved = await downloadPDF(paper.directPdfUrl, paper.title);
        if (saved) {
          result.downloaded = true;
          result.savedPath = saved;
          result.method = 'Direct [PDF] link';
          console.log(`${num} ✅ Downloaded! → ${saved}`);
          return result;
        }
      }

      // Strategy B: Visit paper page and search for PDF
      if (paper.paperUrl) {
        console.log(`${num} 🔗 Strategy B: Scanning paper page...`);
        const pdfTab = await browser.newPage();
        try {
          const pdfUrl = await findPDFOnPage(pdfTab, paper.paperUrl);
          if (pdfUrl) {
            const saved = await downloadPDF(pdfUrl, paper.title);
            if (saved) {
              result.downloaded = true;
              result.savedPath = saved;
              result.method = 'Found on paper page';
              console.log(`${num} ✅ Downloaded! → ${saved}`);
            }
          } else {
            console.log(`${num} ⚠️  No PDF found on paper page`);
          }
        } finally {
          await pdfTab.close();
        }
      }

      if (!result.downloaded) {
        console.log(`${num} ❌ PDF not available`);
      }

      return result;
    });

    // Wait for all downloads to complete simultaneously
    const results = await Promise.allSettled(downloadPromises);
    results.forEach((r) => {
      if (r.status === 'fulfilled') downloadResults.push(r.value);
    });

  } catch (err) {
    console.error(`\n❌ Fatal Error: ${err.message}`);
    if (err.message.includes('CAPTCHA')) {
      console.error('   💡 Tip: Wait 10–15 minutes and try again, or use a VPN.');
    }
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 Browser closed.');
    }
  }

  const elapsed = ((Date.now() - totalStart) / 1000).toFixed(2);
  printSummary(downloadResults, parseFloat(elapsed));
}

main().catch(console.error);