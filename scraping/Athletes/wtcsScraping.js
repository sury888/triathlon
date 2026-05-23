const axios = require("axios");
const fs = require("fs");
const { parse } = require("json2csv");

const API_KEY = "2649776ef9ece4c391003b521cbfce7a";

const api = axios.create({
  baseURL: "https://triathlon.org/tri-api/v2",
  headers: {
    apikey: API_KEY,
    "User-Agent": "Mozilla/5.0"
  }
});

const sleep = ms => new Promise(res => setTimeout(res, ms));

/* -------------------------------------------------------
   STEP 1 — GET WORLD TRIATHLON RANKINGS (MEN + WOMEN)
------------------------------------------------------- */
async function getRankings(gender) {
  const all = [];
  const pagesToFetch = 4;

  // WTCS ranking IDs:
  const rankingId = gender === "M" ? 13 : 14;

  for (let page = 1; page <= pagesToFetch; page++) {
    const url = `/rankings/${rankingId}?per_page=200&page=${page}`;
    console.log(`📥 Fetching WT rankings for ${gender}, page ${page}...`);

    const { data } = await api.get(url);

    if (!data.data || !data.data.rankings) {
      console.log("❌ Unexpected API response:", data);
      break;
    }

    const pageAthletes = data.data.rankings.map(a => ({
      wtcsid: a.athlete_id,
      name: a.athlete_full_name,
      gender,
      country: a.athlete_country_name,
      wtsRanking: a.rank,
      profilePicture: a.athlete_profile_image
    }));

    all.push(...pageAthletes);

    if (pageAthletes.length < 200) break;
  }

  return all;
}




/* -------------------------------------------------------
   STEP 2 — GET ATHLETE RESULTS (FOR STATS)
------------------------------------------------------- */
async function getAthleteStats(wtcsid) {
  try {
    const { data } = await axios.get(
      `https://api.triathlon.org/v1/athletes/${wtcsid}/results`,
      {
        headers: { apikey: API_KEY }
      }
    );

    if (!data.data) {
      console.log(`⚠️ No results for athlete ${wtcsid}`);
      return {
        starts: 0,
        podiums: 0,
        wins: 0,
        podiumPct: "0",
        winPct: "0"
      };
    }

    const results = data.data;

    const starts = results.length;
    const podiums = results.filter(r => r.position <= 3).length;
    const wins = results.filter(r => r.position === 1).length;

    return {
      starts,
      podiums,
      wins,
      podiumPct: starts ? ((podiums / starts) * 100).toFixed(1) : "0",
      winPct: starts ? ((wins / starts) * 100).toFixed(1) : "0"
    };

  } catch (err) {
    console.log(`⚠️ Failed stats for athlete ${wtcsid}`);
    return {
      starts: 0,
      podiums: 0,
      wins: 0,
      podiumPct: "0",
      winPct: "0"
    };
  }
}


/* -------------------------------------------------------
   MAIN RUNNER
------------------------------------------------------- */
async function run() {
  console.log("📥 Fetching World Triathlon rankings...");

  const men = await getRankings("M");
  const women = await getRankings("F");

  const all = [...men, ...women];

  console.log(`📊 Total athletes: ${all.length}`);

  const results = [];

  for (const a of all) {
    // console.log("DEBUG ATHLETE OBJECT:", a);
    //process.exit();


    console.log(`🔍 Stats for ${a.name} (${a.id})`);

    const stats = await getAthleteStats(a.wtcsid);

    results.push({
      ...a,
      ...stats
    });

    await sleep(250); // polite delay
  }

  fs.writeFileSync("wt_athletes.json", JSON.stringify(results, null, 2));

  const csvOut = parse(results);
  fs.writeFileSync("wt_athletes.csv", csvOut);

  console.log("✅ Done! Saved wt_athletes.json and wt_athletes.csv");
}

run();
