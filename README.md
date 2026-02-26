# Quest 1 - RPA Crawling: Auto Extract PDF from Google Scholar

Automatically searches Google Scholar, extracts paper listings, and downloads available PDFs — using Puppeteer with Stealth plugin to avoid bot detection.

## Requirements

- Node.js v16+
- npm
- Windows OS (as per Quest requirement)
- Internet connection

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Run the crawler
npm start
```

## Usage

### Default (searches "machine learning", downloads up to 5 PDFs)
```bash
node src/index.js
```

### Custom query and limit
```bash
node src/index.js --query="deep learning" --max=3
```

### Headless mode (browser runs in background — faster)
```bash
node src/index.js --headless=true
```

### Full custom example
```bash
node src/index.js --query="neural network" --max=5 --headless=false
```

## How It Works

```
[1/4] Launch stealth browser
      ↓ Puppeteer + puppeteer-extra-plugin-stealth
      ↓ Realistic user-agent, hidden webdriver flags

[2/4] Search Google Scholar
      ↓ Human-like typing (random delay per keystroke)
      ↓ Random delays between actions

[3/4] Extract paper results
      ↓ Scrapes titles, authors, paper URLs
      ↓ Detects [PDF] direct links

[4/4] Download PDFs (dual strategy)
      ↓ Strategy A: Direct [PDF] link from Scholar results → download immediately
      ↓ Strategy B: Visit paper page → scan for PDF links → download
```

## Anti-Bot Techniques Used

| Technique | Purpose |
|---|---|
| `puppeteer-extra-plugin-stealth` | Hides 20+ Puppeteer fingerprints |
| Realistic User-Agent | Mimics real Chrome browser |
| Human-like typing delay | Random 50–120ms per character |
| Random action delays | 300–800ms between interactions |
| Override `navigator.webdriver` | Hides automation flag |
| Realistic HTTP headers | Accept-Language, Accept headers |

## Output

PDFs are saved to `./output/pdfs/` with sanitized filenames.

```
╔══════════════════════════════════════════════╗
║              📊 CRAWL SUMMARY                ║
╠══════════════════════════════════════════════╣
║  Papers Found   : 10                         ║
║  PDFs Downloaded: 4                          ║
║  Failed/Skipped : 1                          ║
║  Output Dir     : ./output/pdfs             ║
╠══════════════════════════════════════════════╣
║  ⏱  Time Elapsed: 12.43s                    ║
║  Performance    : ✅ TARGET MET              ║
╚══════════════════════════════════════════════╝
```

## Project Structure

```
quest1-crawling-rpa/
├── src/
│   ├── index.js      # Main orchestrator
│   ├── browser.js    # Stealth browser setup + helpers
│   ├── scholar.js    # Google Scholar interaction
│   ├── downloader.js # PDF download (direct + page scan)
│   └── config.js     # All settings in one place
├── output/
│   └── pdfs/         # Downloaded PDFs saved here
├── package.json
└── README.md
```

## Performance Notes

- **Target**: ≤ 16 seconds
- **Optimal**: ≤ 8 seconds
- Most time is spent on: network requests + Scholar page loading
- Use `--headless=true` to shave ~1–2 seconds off render time
- Scholar may show CAPTCHA if too many requests — wait 10–15 min and retry

## Troubleshooting

**CAPTCHA detected:**
- Wait 10–15 minutes before retrying
- Try a different network/VPN
- Reduce `--max` to 2–3 papers

**PDF not available:**
- Many papers on Scholar are behind paywalls
- Open-access papers (arXiv, ResearchGate, etc.) have the best availability
- Try `--query="arxiv machine learning"` for better PDF availability
