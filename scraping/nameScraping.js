const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

// Fix names like "HaydenWilde" → "Hayden Wilde"
function fixName(name) {
  if (name.includes(" ")) return name; // already correct

  // Insert space before capital letters (except first)
  const fixed = name.replace(/([a-z])([A-Z])/g, "$1 $2");

  return fixed.trim();
}

async function scrapeNames(gender) {
  let page = 1;
  let allNames = [];

  while (page<2) {
    const url = `https://stats.protriathletes.org/rankings/${gender}?page=${page}`;
    console.log(`📥 Fetching ${gender} page ${page}: ${url}`);

    try {
      const { data } = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const $ = cheerio.load(data);

      const namesOnPage = [];
      // More reliable selector: links to athlete profiles
      $('a[href^="/athlete/"]').each((i, el) => {
        let name = $(el).text().trim();
        if (!name) return;

        name = fixName(name);

        if (name) {
          namesOnPage.push({ name, gender: gender === "men" ? "M" : "F" });
        }
      });

      console.log(`   → Found ${namesOnPage.length} names on page ${page}`);

      if (namesOnPage.length === 0) {
        console.log(`   → No more names → stopping pagination for ${gender}`);
        break;
      }

      allNames = allNames.concat(namesOnPage);
      page++;
    } catch (err) {
      console.error(`❌ Failed to fetch page ${page} for ${gender}: ${err.message}`);
      break;
    }
  }

  // Remove possible duplicates (unlikely but safe)
  const uniqueMap = new Map();
  allNames.forEach(item => {
    uniqueMap.set(item.name.toLowerCase(), item);
  });

  return Array.from(uniqueMap.values());
}

async function run() {
  console.log("📥 Scraping ALL athlete names from PTO rankings...");

  const men = await scrapeNames("men");
  const women = await scrapeNames("women");

  const all = [...men, ...women];

  console.log(`\n✅ Total unique athletes found: ${all.length}`);
  console.log(`   Men: ${men.length}`);
  console.log(`   Women: ${women.length}`);

  // Create CSV content manually (simple and no extra deps needed)
  let csvContent = "name,gender\n";
  all.forEach(({ name, gender }) => {
    // Escape quotes if name contains comma or quote
    const escapedName = name.includes(",") || name.includes('"')
      ? `"${name.replace(/"/g, '""')}"`
      : name;
    csvContent += `${escapedName},${gender}\n`;
  });

  // Save CSV
  fs.writeFileSync("pto_all_names.csv", csvContent.trim());

  console.log("💾 Saved pto_all_names.csv with name,gender columns");
}

run().catch(err => {
  console.error("Script failed:", err);
});