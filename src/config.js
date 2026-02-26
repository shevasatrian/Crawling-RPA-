/**
 * config.js
 * Central configuration — edit this file to change search behavior.
 */

module.exports = {
  // ── Search Settings ──────────────────────────────────────────────
  SEARCH_QUERY: 'machine learning',   // Keyword to search on Google Scholar
  MAX_RESULTS: 5,                      // Max papers to attempt PDF download

  // ── Output ───────────────────────────────────────────────────────
  OUTPUT_DIR: './output/pdfs',         // Where downloaded PDFs are saved

  // ── Performance ──────────────────────────────────────────────────
  TARGET_TIME_SECONDS: 16,             // Target completion time
  OPTIMAL_TIME_SECONDS: 8,             // Optimal completion time

  // ── Browser Settings ─────────────────────────────────────────────
  HEADLESS: true,                      // true = background (faster). Use --headless=false for Loom demo
  BROWSER_TIMEOUT: 30000,              // 30s page timeout
  NAVIGATION_TIMEOUT: 20000,           // 20s navigation timeout

  // ── Anti-bot Settings ────────────────────────────────────────────
  // Realistic typing speed (ms per character)
  TYPE_DELAY_MIN: 20,
  TYPE_DELAY_MAX: 50,
  // Delay between actions (ms)
  ACTION_DELAY_MIN: 100,
  ACTION_DELAY_MAX: 300,

  // ── User Agent ───────────────────────────────────────────────────
  USER_AGENT:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};