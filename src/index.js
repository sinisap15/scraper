const fs = require("fs");
const ScraperService = require("./service/service");
require("dotenv").config();

const baseUrl = process.env.BASE_URL;
const outputDir = process.env.OUTPUT_DIR;
let scraperService;
async function startServices() {
  scraperService = new ScraperService();
}

(async () => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  await startServices();
  await scraperService.downloadCSS(baseUrl);
  await scraperService.downloadFavicons(baseUrl);
  await scraperService.downloadScripts(baseUrl);
  await scraperService.downloadCategories(baseUrl);
  await scraperService.downloadFonts(baseUrl);
  await scraperService.scrapePages(baseUrl);
  console.log("Scraping complete!");
})();
