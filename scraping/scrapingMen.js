const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv');

// Delay helper
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Convert "Morgan Pearson" → "morgan-pearson"
function slugify(name) {
  const overrides = {
    "hannah berry": "Hannah Wells",
    "lena meissner": "Lena Meißner",
    "caroline pohle": "Carolin Pohle",
    "katie phipkin": "Katie Phipkim",
    "jamie besse": "Jamie Albert",
    "simone dailey": "Simone Mitchell",
    "franzi hofmann": "Franzi Reng",
    "brittany vocke": "Britt Vocke",
    "cassie heaslip": "Cassandra Heaslip", 
    "sophia stückrad deboy": "Sophia Stueckrad", 
    "katie spoelman-vanacker": "Katie Spoelman Vana",
    "katharina krüger": "Katharina Krueger", 
    "kimberley halton-farrow": "Kimberley Morrison", 
    "aitziber urkiola zendoia" : "Urkiola Aitziber", 
    "kristian høgenhaug": "Kristian-Hogenhaug",
    "wilhelm hirsch": "Willhelm Hirsch",
    "guillem montiel": "Montiel Moreno Guillem",
    "magnus ditlev": "Magnus Elbaek Ditlev",
    "henry räppo": "Henry Raeppo",
    "mathias petersen": "Mathias lyngsoe Petersen",
    "juan ignacio villarruel curra": "Juan Ignacio Villarruel",
    "niklas ludwig": "Ludwig Niklas",
    "yegor martynenko": "Yegor Martyneko",
    "roger manya valenzuela": "Roger Manya",
    "christopher hammer": "Chris Hammer",
    "lukas schnoedewind": "Lukas Schnodewind",
    "ander irigoyen egia": "Ander Irigoien Egia",
    "thomas davies": "Tom Davies",
    "mikel gomez martinez de manso": "Mikel Gomez Manso",
  };

  // Normalize for matching
  const key = name.trim().toLowerCase();

  // Apply override if exists
  const finalName = overrides[key] || name;

  // PTO-style slug rules
  return finalName
    .normalize("NFD")                     // split accents
    .replace(/[\u0300-\u036f]/g, "")      // remove accents
    .replace(/ß/g, "ss")                  // German sharp S
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "ae")
    .replace(/Ö/g, "oe")
    .replace(/Ü/g, "ue")
    .replace(/ø/g, "oe")                  // Scandinavian
    .replace(/Ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/Å/g, "aa")
    .replace(/æ/g, "ae")                  // Scandinavian
    .replace(/Æ/g, "ae")
    .replace(/[^a-zA-Z0-9\s-]/g, "")      // remove punctuation but keep hyphens
    .trim()
    .replace(/\s+/g, "-") 
    .replace(/ss/g, "ß")                     // spaces → hyphens
    .toLowerCase();
}


// Extract discipline rank
function getDisciplineRank($, discipline) {
  return $(`a[href*="discipline=${discipline}"] .ranking-number`)
    .first()
    .text()
    .trim() || null;
}

// Scrape a single athlete page
async function scrapeAthlete(url) {
  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);

    const name = $('h1').first().text().trim();

    const swimRank = getDisciplineRank($, 'swim');
    const bikeRank = getDisciplineRank($, 'bike');
    const runRank  = getDisciplineRank($, 'run');

    const worldRank =
      $('a.rank--world .ranking-number').text().trim() ||
      $('div.attribute.rank.rank--world .ranking-number').text().trim() ||
      null;

    const country = $('div.attribute.country .name').text().trim() || null;

    const profilePic =
      $('img[data-src]').attr('data-src') ||
      $('img[data-src]').attr('src') ||
      $('picture img').attr('src') ||
      null;

    return {
      name,
      worldRank,
      swimRank,
      bikeRank,
      runRank,
      country,
      profilePic,
      url
    };

  } catch (err) {
    console.error(`❌ Error scraping ${url}:`, err.message);
    return null;
  }
}

// Load names from CSV
function loadNamesFromCSV(path) {
  return new Promise((resolve, reject) => {
    const names = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', row => {
        if (row.name) names.push(row.name);
      })
      .on('end', () => resolve(names))
      .on('error', reject);
  });
}

// Main runner
async function run() {
  console.log("📥 Loading names from CSV...");
  const names = await loadNamesFromCSV('tri fanta - mens names.csv');

  console.log(`Loaded ${names.length} names.`);

  const results = [];

  for (const name of names) {
    const slug = slugify(name);
    const url = `https://stats.protriathletes.org/athlete/${slug}`;

    console.log(`🔍 Scraping: ${name} → ${url}`);

    const data = await scrapeAthlete(url);
    if (data) results.push(data);

    await sleep(500); // polite delay
  }

  const csvOut = parse(results);
  fs.writeFileSync('athletes_output.csv', csvOut);

  console.log("✅ Done! Saved athletes_output.csv");
}

run();
