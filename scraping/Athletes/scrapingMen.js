const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const csv = require('csv-parser');
const { parse } = require('json2csv');

// Delay helper
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

// Your slugify function remains the same (no changes needed)
// ... paste your full slugify here ...

// Extract discipline rank (unchanged)
function getDisciplineRank($, discipline) {
  return $(`a[href*="discipline=${discipline}"] .ranking-number`)
    .first()
    .text()
    .trim() || null;
}

function convertCSVtoJSON(csvPath, jsonPath) {
  return new Promise((resolve, reject) => {
    const results = [];

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => results.push(row))
      .on("end", () => {
        fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
        console.log(`💾 Converted ${csvPath} → ${jsonPath}`);
        resolve(results);
      })
      .on("error", reject);
  });
}

// Scrape a single athlete page – now takes gender as argument
async function scrapeAthlete(url, nameR, gender) {
  try {
    const DEFAULT_PROFILE_PIC =
      "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_640.png";

    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const $ = cheerio.load(data);

    const displayedName = $('h1').first().text().trim() || nameR;

    const swimRanking = getDisciplineRank($, 'swim');
    const bikeRanking = getDisciplineRank($, 'bike');
    const runRanking  = getDisciplineRank($, 'run');

    const ptoRanking =
      $('a.rank--world .ranking-number').text().trim() ||
      $('div.attribute.rank.rank--world .ranking-number').text().trim() ||
      null;

    const country = $('div.attribute.country .name').text().trim() || null;

    let profilePic =
      $('img[data-src]').attr('data-src') ||
      $('img[data-src]').attr('src') ||
      $('picture img').attr('src') ||
      null;

    // Apply fallback
    if (!profilePic || profilePic.trim() === "") {
      profilePic = DEFAULT_PROFILE_PIC;
    }

    return {
      name: nameR,
      gender,
      ptoRanking,
      swimRanking,
      bikeRanking,
      runRanking,
      country,
      profilePicture: profilePic
    };

  } catch (err) {
    console.error(`❌ Error scraping ${url} (${nameR}):`, err.message);
    return null;
  }
}


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
    "aitziber urkiola zendoia": "Urkiola Aitziber",
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
    "benjamen randall": "Ben Randall",
    "sophie evans": "Sophie Coldwell"
  };

  const key = name.trim().toLowerCase();
  const finalName = overrides[key] || name;

  return finalName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "ae")
    .replace(/Ö/g, "oe")
    .replace(/Ü/g, "ue")
    .replace(/ø/g, "oe")
    .replace(/Ø/g, "oe")
    .replace(/å/g, "aa")
    .replace(/Å/g, "aa")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "ae")
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}
// Load names + gender from CSV
function loadAthletesFromCSV(path) {
  return new Promise((resolve, reject) => {
    const athletes = [];
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', row => {
        if (row.name) {
          athletes.push({
            name: row.name.trim(),
            gender: (row.gender || '').trim().toUpperCase()   // ensure M or F
          });
        }
      })
      .on('end', () => resolve(athletes))
      .on('error', reject);
  });
}

// Main runner
async function run() {
  console.log("📥 Loading athletes from CSV...");
  const athletesList = await loadAthletesFromCSV('pto_all_names.csv');

  console.log(`Loaded ${athletesList.length} athletes.`);

  const results = [];

  for (const { name, gender } of athletesList) {
    if (!['M', 'F'].includes(gender)) {
      console.warn(`⚠️ Skipping ${name} – invalid/missing gender: "${gender}"`);
      continue;
    }

    const slug = slugify(name);
    const url = `https://stats.protriathletes.org/athlete/${slug}`;

    console.log(`🔍 Scraping: ${name} (${gender}) → ${url}`);

    const data = await scrapeAthlete(url, name, gender);
    if (data) results.push(data);

    await sleep(800); // slightly longer delay to be polite
  }

  if (results.length > 0) {
    const csvOut = parse(results);
    fs.writeFileSync('athletes_output.csv', csvOut);
    await convertCSVtoJSON("athletes_output.csv", "athletes_output.json");
    console.log(`✅ Done! Processed ${results.length} athletes. Saved athletes_output.csv and .json`);
  } else {
    console.log("⚠️ No valid data scraped.");
  }
}

run().catch(err => console.error("Script failed:", err));