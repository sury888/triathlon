import csv
import json

def time_to_seconds(time_str):
    """Convert 'HH:MM:SS' or 'H:MM:SS' to seconds (int). Returns None if invalid/empty."""
    if not time_str or not time_str.strip():
        return None
    try:
        parts = time_str.strip().split(':')
        if len(parts) == 3:
            h, m, s = map(int, parts)
            return h * 3600 + m * 60 + s
        elif len(parts) == 2:
            m, s = map(int, parts)
            return m * 60 + s
        return None
    except ValueError:
        return None

def parse_discipline_time(cell):
    """Parse a cell like '00:52:07 (18)' → time_in_seconds only (ignore the rank in parentheses)."""
    if not cell or not cell.strip():
        return None
    cell = cell.strip()
    if '(' in cell:
        time_part = cell.split('(', 1)[0]
        time_str = time_part.strip()
    else:
        time_str = cell
    return time_to_seconds(time_str)

# Country code → Full name mapping
COUNTRY_MAP = {
    "USA": "United States of America",
    "FRA": "France",
    "NZL": "New Zealand",
    "NOR": "Norway",
    "AUS": "Australia",
    "SWE": "Sweden",
    "CZE": "Czechia",
    "FIN": "Finland",
    "GBR": "Great Britain",
    "NED": "Netherlands",
    "CAN": "Canada",
    "SUI": "Switzerland",
    "JPN": "Japan",
    "DEN": "Denmark",
    "GER": "Germany",
    "BEL": "Belgium",
    "ITA": "Italy",
    "ESP": "Spain",
    "POR": "Portugal",
    "POL": "Poland",
    "AUT": "Austria",
    "IRL": "Ireland",
    "RSA": "South Africa",
    "BRA": "Brazil",
    "MEX": "Mexico",
    "ARG": "Argentina",
    "CHI": "Chile",
    "COL": "Colombia",
    "UKR": "Ukraine",
    "RUS": "Russia",
    "HUN": "Hungary",
    "CRO": "Croatia",
    "SLO": "Slovenia",
    "SVK": "Slovakia",
    "LUX": "Luxembourg",
    "EST": "Estonia",
    "LTU": "Lithuania",
    "LVA": "Latvia",
    "GRC": "Greece",
    "ZAF": "South Africa",
}

def get_full_country(code):
    return COUNTRY_MAP.get(code.strip().upper(), code.strip().upper())

# ========================= CONFIG =========================
CSV_FILE = "tri fanta - NZ Results.csv"
JSON_FILE = "nz_results.json"
RACE_NAME = "Ironman Texas 2026"
# =========================================================

data = []

with open(CSV_FILE, "r", encoding="utf-8") as f:
    reader = csv.reader(f, delimiter="\t")
    header = next(reader)  # Read header row

    # Print header for debugging (helps confirm column order)
    print("CSV Header:", header)

    # Assuming the last column is startRank
    # If it's not the last one, adjust the index below (0-based)
    for row in reader:
        if len(row) < 9:  # Need at least 9 columns now (original 8 + startRank)
            continue

        rank_str = row[0].strip()
        name = row[1].strip()
        nation_code = row[2].strip()
        swim_cell = row[3]
        bike_cell = row[4]
        run_cell = row[5]
        total_str = row[6].strip()
        gender = row[7].strip()

        # New: startRank is the last column
        start_rank_str = row[-1].strip()  # last column
        start_rank = int(start_rank_str) if start_rank_str.isdigit() else None

        nation = get_full_country(nation_code)

        # Finish status
        if rank_str.strip():
            overall_rank = int(rank_str)
            status = "Finished"
            total_time = time_to_seconds(total_str)
        else:
            overall_rank = None
            status = "DNF"
            total_time = "DNF"

        swim_time = parse_discipline_time(swim_cell)
        bike_time = parse_discipline_time(bike_cell)
        run_time = parse_discipline_time(run_cell)

        athlete = {
            "race": RACE_NAME,
            "name": name,
            "gender": gender,
            "rank": overall_rank,
            "country": nation,
            "swimRank": None,
            "bikeRank": None,
            "runRank": None,
            "swimTime": swim_time,
            "bikeTime": bike_time,
            "runTime": run_time,
            "totalTime": total_time,
            "status": status,
            "startRank": start_rank   # ← added here!
        }
        data.append(athlete)

# Re-seed discipline ranks (unchanged)
finishers = [ath for ath in data if ath["status"] == "Finished"]

finishers_sorted = sorted(finishers, key=lambda x: x["swimTime"])
for new_rank, ath in enumerate(finishers_sorted, 1):
    ath["swimRank"] = new_rank

finishers_sorted = sorted(finishers, key=lambda x: x["bikeTime"])
for new_rank, ath in enumerate(finishers_sorted, 1):
    ath["bikeRank"] = new_rank

finishers_sorted = sorted(finishers, key=lambda x: x["runTime"])
for new_rank, ath in enumerate(finishers_sorted, 1):
    ath["runRank"] = new_rank

# Write JSON
with open(JSON_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"✅ Done! Converted {len(data)} athletes → {JSON_FILE}")
print(f"   • Discipline ranks re-seeded among finishers only")
print(f"   • Added 'startRank' field from last CSV column")
print(f"   • Sample (first 2):")
for ath in data[:2]:
    print(f"     {ath['name']} - startRank: {ath.get('startRank')}")