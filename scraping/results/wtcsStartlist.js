// wtcs2026.js
const axios = require("axios");
const fs = require("fs");

const api = axios.create({
  baseURL: "https://events.triathlon.org/api",
  headers: { "User-Agent": "Mozilla/5.0" }
});

function timeToSeconds(str) {
  if (!str || typeof str !== "string") return null;
  const [h, m, s] = str.split(":").map(Number);
  return h * 3600 + m * 60 + s;
}


const sleep = ms => new Promise(res => setTimeout(res, ms));

const programs2026 = [
  { eventId: 195144, programId: 678661, label: "2026 WTCS Yokohama Men" },
  { eventId: 195144, programId: 678662, label: "2026 WTCS Yokohama Women" }, 
];

/* ---------------------------------------------------------
   FULL START LIST
   /api/startlist/{eventId}/{programId}
--------------------------------------------------------- */
async function getStartList(eventId, programId, gender) {
  try {
    const { data } = await api.get(`/startlist/${eventId}/${programId}`);

    const entries = data?.data?.entries ?? [];

    const athletes = entries.map(e => ({
      name: e.athlete_full_name,
      country: e.athlete_noc,
      gender, // <-- inject gender manually
      startRank: e.start_num
    }));

    return { raw: data, athletes };
  } catch (err) {
    console.log(`⚠️ Failed start list for ${eventId}/${programId}: ${err.message}`);
    return { raw: null, athletes: [] };
  }
}


/* ---------------------------------------------------------
   FULL RESULTS
   /api/results/{eventId}/{programId}
--------------------------------------------------------- */
async function getResults(eventId, programId) {
  try {
    const { data } = await api.get(`/results/${eventId}/${programId}`);

    const entries =
      data?.data?.entries ??
      data?.data?.results ??
      data?.data ??
      [];

    const results = Array.isArray(entries)
      ? entries.map(r => {
          const splits = r.splits ?? [];

          // WTCS split order:
          // [ swim, T1, bike, T2, run ]
          const swim = splits[0] ?? null;
          const t1   = splits[1] ?? null;
          const bike = splits[2] ?? null;
          const t2   = splits[3] ?? null;
          const run  = splits[4] ?? null;

          return {
            athleteId: r.athlete_id,
            name: r.athlete_full_name,
            country: r.athlete_noc,
            gender: r.athlete_gender ?? r.raw?.athlete_gender ?? null,
            startRank: r.start_num ?? null,

            // Convert to seconds
            swimSeconds: timeToSeconds(swim),
            bikeSeconds: timeToSeconds(bike),
            runSeconds: timeToSeconds(run),
            totalSeconds: timeToSeconds(r.total_time),

            // Keep raw for debugging
            //raw: r
          };
        })
      : [];

    return { raw: data, results };
  } catch (err) {
    console.log(`⚠️ Failed results for ${eventId}/${programId}: ${err.message}`);
    return { raw: null, results: [] };
  }
}


/* ---------------------------------------------------------
   MAIN
--------------------------------------------------------- */
async function run() {
  console.log("🏁 Building WTCS 2026 dataset...");

  const startListOut = [];
  const resultsOut = [];

  for (const p of programs2026) {  
      const gender = p.label.includes("Men") ? "M" : "F";

      const { raw: rawStart, athletes } = await getStartList(
        p.eventId,
        p.programId,
        gender
          );
    console.log(`   • Start list athletes: ${athletes.length}`);

    const { raw: rawResults, results } = await getResults(p.eventId, p.programId);
    console.log(`   • Results entries: ${results.length}`);

    startListOut.push({
      eventId: p.eventId,
      programId: p.programId,
      label: p.label,
      startList: athletes,
      rawStartList: rawStart
    });

    resultsOut.push({
      eventId: p.eventId,
      programId: p.programId,
      label: p.label,
      results,
      rawResults
    });

    await sleep(200);
  }

  fs.writeFileSync("wtcs_2026_startlists.json", JSON.stringify(startListOut, null, 2));
  fs.writeFileSync("wtcs_2026_results.json", JSON.stringify(resultsOut, null, 2));

  console.log("\n✅ Saved wtcs_2026_startlists.json");
  console.log("✅ Saved wtcs_2026_results.json");
}

run().catch(err => console.error("Fatal error:", err.message));
