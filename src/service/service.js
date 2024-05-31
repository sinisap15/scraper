const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const ProgressBar = require("progress");
require("dotenv").config();

const baseUrl = process.env.BASE_URL;
const outputDir = process.env.OUTPUT_DIR;

class ScraperService {
  async scrapePages(url) {
    const pageNumber = url.includes("page")
      ? url.split("-")[1].replace(".html", "")
      : 1;
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    if (!url.includes("page")) {
      const indexFilePath = path.join(outputDir, "index.html");
      fs.writeFileSync(indexFilePath, response.data);
    } else {
      const pagePath = url.replace(baseUrl, "");
      const fileName = path.basename(pagePath);
      const fileDir = path.join(outputDir, path.dirname(pagePath));
      const filePath = path.join(fileDir, fileName);

      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      fs.writeFileSync(filePath, response.data);
    }
    const links = $("article.product_pod a");
    const totalPages = links.length;
    const images = $("img");
    await this.downloadImages(images, outputDir, $);

    const bar = new ProgressBar(
      `Scraping page ${pageNumber} [:bar] :percent :etas`,
      {
        complete: "=",
        incomplete: " ",
        width: 20,
        total: totalPages
      }
    );

    const pagePromises = [];

    for (let i = 0; i < links.length; i++) {
      let link = $(links[i]).attr("href");
      if (url.includes("catalogue")) {
        link = "/catalogue/" + link;
      }
      const pageUrl = new URL(link, baseUrl).href;
      const filePath = path.join(outputDir, pageUrl.replace(baseUrl, ""));
      pagePromises.push(this.downloadPage(pageUrl, filePath));
    }

    await Promise.all(pagePromises);
    bar.update(pageNumber / 50); // TODO: fix the hardcoded 50 pages

    const nextLink = $("li.next a");
    if (nextLink.length > 0) {
      let nextUrl = new URL(nextLink.attr("href"), baseUrl).href;
      if (!nextUrl.includes("catalogue")) {
        nextUrl = nextUrl.replace("/page", "/catalogue/page");
      }
      await this.scrapePages(nextUrl);
    }
  }

  async downloadPage(url, filePath) {
    const response = await axios.get(url);
    const dirPath = path.dirname(filePath);
    const $ = cheerio.load(response.data);
    const images = $("img");
    await this.downloadImages(images, outputDir, $);

    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, response.data);
  }

  async downloadImages(imageLinks, dirPath, $) {
    for (let i = 0; i < imageLinks.length; i++) {
      const imageUrl = new URL($(imageLinks[i]).attr("src"), baseUrl).href;
      const imageName = imageUrl.replace(baseUrl, "");
      const imagePath = path.join(dirPath, imageName);
      const dirpath = path.dirname(imagePath);

      if (!fs.existsSync(dirpath)) {
        fs.mkdirSync(dirpath, { recursive: true });
      }

      const response = await axios.get(imageUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(imagePath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });
    }
  }

  async downloadCSS(url) {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const cssLinks = $('link[rel="stylesheet"]');

    for (let i = 0; i < cssLinks.length; i++) {
      const cssUrl = new URL($(cssLinks[i]).attr("href"), url).href;
      const cssName = path.basename(cssUrl);
      const cssDir = path.join(
        outputDir,
        cssUrl.replace(baseUrl, "").replace(cssName, "")
      );
      if (!fs.existsSync(cssDir)) {
        fs.mkdirSync(cssDir, { recursive: true });
      }
      const cssPath = path.join(cssDir, cssName);

      const response = await axios.get(cssUrl);
      fs.writeFileSync(cssPath, response.data);
      console.log(`CSS file saved: ${cssPath}`);
    }
  }

  async downloadFavicons(url) {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const faviconLinks = $('link[rel="icon"], link[rel="shortcut icon"]');

    for (let i = 0; i < faviconLinks.length; i++) {
      const faviconUrl = new URL($(faviconLinks[i]).attr("href"), url).href;
      const faviconName = path.basename(faviconUrl);
      const faviconDir = path.join(
        outputDir,
        faviconUrl.replace(baseUrl, "").replace(faviconName, "")
      );
      if (!fs.existsSync(faviconDir)) {
        fs.mkdirSync(faviconDir, { recursive: true });
      }
      const faviconPath = path.join(faviconDir, faviconName);

      const response = await axios.get(faviconUrl, { responseType: "stream" });
      const writer = fs.createWriteStream(faviconPath);

      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      console.log(`Favicon saved: ${faviconPath}`);
    }
  }

  async downloadScripts(url) {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const scriptLinks = $("script[src]");

    for (let i = 0; i < scriptLinks.length; i++) {
      const scriptUrl = new URL($(scriptLinks[i]).attr("src"), url).href;
      const scriptName = path.basename(scriptUrl);
      const scriptDir = path.join(
        outputDir,
        scriptUrl.replace(baseUrl, "").replace(scriptName, "")
      );
      if (!fs.existsSync(scriptDir)) {
        fs.mkdirSync(scriptDir, { recursive: true });
      }
      const scriptPath = path.join(scriptDir, scriptName);

      const scriptResponse = await axios.get(scriptUrl);
      fs.writeFileSync(scriptPath, scriptResponse.data);
      console.log(`Script saved: ${scriptPath}`);
    }
  }

  async downloadCategories(url) {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);
    const categories = $("ul.nav-list a");
    const totalCategories = categories.length;

    const bar = new ProgressBar(`Scraping categories [:bar] :percent :etas`, {
      complete: "=",
      incomplete: " ",
      width: 20,
      total: totalCategories
    });

    const categoryPromises = [];

    for (let i = 0; i < categories.length; i++) {
      let category = $(categories[i]).attr("href");
      if (url.includes("catalogue")) {
        category = "/catalogue/" + category;
      }
      const pageUrl = new URL(category, baseUrl).href;
      const filePath = path.join(outputDir, pageUrl.replace(baseUrl, ""));
      categoryPromises.push(this.downloadPage(pageUrl, filePath));
      bar.tick();
    }

    await Promise.all(categoryPromises);
    console.log("Categories saved!");
  }

  async downloadFonts(url) {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // Find the CSS file link
    const cssLink = $("link[rel='stylesheet']").attr("href");
    const cssUrl = new URL(cssLink, url).href;

    // Get the CSS content
    const cssResponse = await axios.get(cssUrl);
    const cssContent = cssResponse.data;

    // Extract font URLs from the CSS content
    const fontUrls = cssContent.match(/url\((.*?)\)/g);

    // Download font files from the "fonts" folder
    const fontsFolderUrl = new URL("fonts/", cssUrl).href;

    for (let i = 0; i < fontUrls.length; i++) {
      const fontUrl = fontUrls[i]
        .replace(/url\(['"]?/, "")
        .replace(/['"]?\)/, "");
      const fontPath = new URL(fontUrl, fontsFolderUrl).href.replace(
        "css/",
        ""
      );

      const fontName = path.basename(fontPath);
      const fontDir = path.join(
        outputDir,
        fontPath.replace(baseUrl, "").replace(fontName, "")
      );

      if (!fs.existsSync(fontDir)) {
        fs.mkdirSync(fontDir, { recursive: true });
      }

      const fontResponse = await axios.get(fontPath, {
        responseType: "arraybuffer"
      });
      const fontFilePath = path.join(fontDir, fontName);
      fs.writeFileSync(fontFilePath, fontResponse.data);
      console.log(`Font saved: ${fontFilePath}`);
    }
  }
}

module.exports = ScraperService;
