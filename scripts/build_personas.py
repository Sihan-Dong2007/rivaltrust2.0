"""
build_personas.py
─────────────────────────────────────────────────────────────────
Selects representative ANES 2024 respondents for each of the 4
political rival personas and writes real data into the JSON files.

Usage:
  python3 scripts/build_personas.py

Variables used from ANES 2024 Time Series (anes_timeseries_2024_csv_20260519.csv):
  V240001   col 1   — respondent case ID
  V241008x  col 47  — Party ID (4-cat derived)
                       1=Dem family, 2=Lean-Dem, 3=Lean-Rep, 4=Rep family
  V241200   col 221 — Ideology (5-pt)
                       1=Extremely liberal … 5=Extremely conservative
  V241360   col 379 — Immigration level preference (3-cat)
                       1=Decrease, 2=Same, 3=Increase
  V241401   col 420 — Age group (3-cat)
                       1=Young (18–34), 2=Middle (35–54), 3=Older (55+)
  V241406x  col 425 — Education (7-pt)
                       1=<HS, 2=HS diploma, 3=Some college, 4=2-yr degree,
                       5=BA, 6=Master's, 7=Professional/doctoral
  V241409x  col 428 — Income (1–7 valid, 8=refused/missing)
                       1=<$20k, 2=$20–29k, 3=$30–39k, 4=$40–59k,
                       5=$60–74k, 6=$75–89k, 7=$90–124k
  V241420   col 432 — Region (5-cat)
                       1=Northeast, 2=Midwest, 3=South, 4=Mountain West, 5=Pacific
  V241407   col 426 — Religion broad category (4-cat)
                       1=Protestant, 2=Catholic, 3=Other religion, 4=None
  V241408   col 427 — Church attendance (3-cat, subset only)
                       1=Regular, 2=Occasional, 3=Rarely/Never
"""

import csv
import json
import os
from pathlib import Path

# ── paths ─────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent
DATA_CSV     = SCRIPT_DIR / "data" / "anes_timeseries_2024_csv_20260519.csv"
PERSONAS_DIR = SCRIPT_DIR.parent / "src" / "data" / "personas"

# ── column indices (0-based) ───────────────────────────────────
COL = {
    "case_id":   1,    # V240001
    "pid4":      47,   # V241008x  party ID 4-cat
    "ideology":  221,  # V241200   ideology 5-pt
    "immig":     379,  # V241360   immigration 3-cat
    "age_group": 420,  # V241401   age group 3-cat
    "educ":      425,  # V241406x  education 7-pt
    "income":    428,  # V241409x  income 7-pt + refused
    "region":    432,  # V241420   region 5-cat
    "religion":  426,  # V241407   religion 4-cat
    "church":    427,  # V241408   attendance 3-cat
}

# ── label maps ────────────────────────────────────────────────
LABELS = {
    "pid4": {
        "1": "Democrat (strong / not strong)",
        "2": "Independent leaning Democrat",
        "3": "Independent leaning Republican",
        "4": "Republican (strong / not strong)",
    },
    "ideology": {
        "1": "Extremely liberal",
        "2": "Liberal",
        "3": "Moderate",
        "4": "Conservative",
        "5": "Extremely conservative",
    },
    "immig": {
        "1": "Decrease immigration levels",
        "2": "Keep immigration levels the same",
        "3": "Increase immigration levels",
    },
    "age_group": {
        "1": "18–34",
        "2": "35–54",
        "3": "55 and older",
    },
    "educ": {
        "1": "Less than high school",
        "2": "High school diploma / GED",
        "3": "Some college, no degree",
        "4": "2-year associate degree",
        "5": "Bachelor's degree",
        "6": "Master's degree",
        "7": "Professional / doctoral degree",
    },
    "income": {
        "1": "Under $20,000",
        "2": "$20,000–$29,999",
        "3": "$30,000–$39,999",
        "4": "$40,000–$59,999",
        "5": "$60,000–$74,999",
        "6": "$75,000–$89,999",
        "7": "$90,000–$124,999",
        "8": "Refused / not reported",
    },
    "region": {
        "1": "Northeast",
        "2": "Midwest",
        "3": "South",
        "4": "Mountain West",
        "5": "Pacific Coast",
    },
    "religion": {
        "1": "Protestant",
        "2": "Catholic",
        "3": "Other religion",
        "4": "No religion / secular",
    },
    "church": {
        "1": "Regular (weekly or more)",
        "2": "Occasional",
        "3": "Rarely or never",
    },
}

# ── persona filter specs ───────────────────────────────────────
# Each spec defines hard filters; best match is then picked by
# minimising distance to the "ideal" vector within the filtered pool.

PERSONA_SPECS = {
    "POL_PROG_01": {
        "filters": {
            "pid4":      {"in": ["1"]},           # Dem family only
            "ideology":  {"in": ["1", "2"]},      # very liberal or liberal
            "immig":     {"in": ["3"]},            # increase immigration
            "educ":      {"gte": 4},               # at least some college / associate
            "age_group": {"in": ["1", "2"]},      # 18–54
        },
        "ideal": {
            "pid4": 1, "ideology": 1, "educ": 5, "age_group": 1,
        },
    },
    "POL_LIB_01": {
        "filters": {
            "pid4":      {"in": ["1", "2"]},      # Dem family or lean-Dem
            "ideology":  {"in": ["2", "3"]},      # liberal or moderate
            "educ":      {"gte": 4},               # at least 2-year degree
        },
        "ideal": {
            "pid4": 1, "ideology": 2, "educ": 6, "age_group": 2,
        },
    },
    "POL_NAT_01": {
        "filters": {
            "pid4":      {"in": ["4"]},            # Rep family
            "ideology":  {"in": ["4", "5"]},      # conservative or very conservative
            "immig":     {"in": ["1"]},            # decrease immigration
            "educ":      {"lte": 4},               # up to associate degree
        },
        "ideal": {
            "pid4": 4, "ideology": 5, "educ": 3, "age_group": 3,
        },
    },
    "POL_CONS_01": {
        "filters": {
            "pid4":      {"in": ["3", "4"]},      # Lean-Rep or Rep family
            "ideology":  {"in": ["4", "5"]},      # conservative or very conservative
            "age_group": {"in": ["2", "3"]},      # 35+
            "religion":  {"in": ["1", "2"]},      # Protestant or Catholic
        },
        "ideal": {
            "pid4": 4, "ideology": 5, "educ": 5, "age_group": 3,
        },
    },
}


def get(row, key):
    """Return raw string value from a row, empty string if blank."""
    return row[COL[key]].strip()


def is_valid(val):
    """True if value is a positive integer (not a missing/inapplicable code)."""
    try:
        return int(val) > 0
    except (ValueError, TypeError):
        return False


def passes_filters(row, filters):
    for key, cond in filters.items():
        val = get(row, key)
        if not is_valid(val):
            return False
        n = int(val)
        if "in" in cond and str(n) not in cond["in"]:
            return False
        if "gte" in cond and n < cond["gte"]:
            return False
        if "lte" in cond and n > cond["lte"]:
            return False
    return True


def distance(row, ideal):
    """Sum of squared differences between row values and ideal vector."""
    total = 0
    for key, target in ideal.items():
        val = get(row, key)
        if is_valid(val):
            total += (int(val) - target) ** 2
        else:
            total += 10  # penalty for missing on ideal dimensions
    return total


def label(key, val):
    return LABELS.get(key, {}).get(str(val), f"Code {val}")


def build_anes_profile(row, persona_id):
    """Build the anes_profile dict from a selected ANES respondent row."""
    def v(key):
        return get(row, key)

    case_id = row[COL["case_id"]].strip()

    demographics = {
        "age_group":       label("age_group", v("age_group")),
        "age_group_code":  v("age_group"),
        "education":       label("educ", v("educ")),
        "education_code":  v("educ"),
        "income":          label("income", v("income")),
        "income_code":     v("income"),
        "region":          label("region", v("region")),
        "region_code":     v("region"),
        "religion":        label("religion", v("religion")),
        "religion_code":   v("religion"),
    }

    key_attitudes = {
        "pid4": {
            "variable": "V241008x",
            "label":    "Party identification (4-cat derived)",
            "value":    v("pid4"),
            "meaning":  label("pid4", v("pid4")),
        },
        "ideo5": {
            "variable": "V241200",
            "label":    "Ideology self-placement (5-pt)",
            "value":    v("ideology"),
            "meaning":  label("ideology", v("ideology")),
        },
        "immigration": {
            "variable": "V241360",
            "label":    "Immigration level preference (3-cat)",
            "value":    v("immig"),
            "meaning":  label("immig", v("immig")),
        },
    }

    return {
        "source":        "ANES 2024 Time Series",
        "dataset_url":   "https://electionstudies.org/data-center/2024-time-series-study/",
        "note":          "Real ANES 2024 Time Series respondent — selected as most representative of this persona cluster",
        "respondent_id": f"ANES2024-TS-{case_id}",
        "demographics":  demographics,
        "key_attitudes": key_attitudes,
    }


def main():
    print("Loading ANES 2024 Time Series data …")
    with open(DATA_CSV, "r", encoding="utf-8-sig") as f:
        reader = csv.reader(f)
        headers = next(reader)
        rows = list(reader)

    print(f"  {len(rows)} respondents loaded.\n")

    for persona_id, spec in PERSONA_SPECS.items():
        json_path = PERSONAS_DIR / f"{persona_id}.json"
        if not json_path.exists():
            print(f"  SKIP {persona_id} — JSON file not found at {json_path}")
            continue

        # Filter pool
        pool = [r for r in rows if passes_filters(r, spec["filters"])]
        print(f"{persona_id}: {len(pool)} respondents pass filters")

        if not pool:
            print(f"  WARNING: no matches — keeping PLACEHOLDER data\n")
            continue

        # Pick best match (closest to ideal vector)
        best = min(pool, key=lambda r: distance(r, spec["ideal"]))
        dist = distance(best, spec["ideal"])
        print(f"  Selected respondent: ANES2024-TS-{best[COL['case_id']].strip()} (distance={dist})")

        # Print selected values for verification
        for key in ["pid4", "ideology", "immig", "age_group", "educ", "income", "region", "religion"]:
            val = get(best, key)
            print(f"    {key:12s} = {val:3s}  ({label(key, val)})")
        print()

        # Load JSON, update anes_profile, write back
        with open(json_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        data["anes_profile"] = build_anes_profile(best, persona_id)

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        print(f"  ✓ {json_path.name} updated\n")

    print("Done. Real ANES data written to all persona JSON files.")
    print("Refresh your browser to see the updated profiles.")


if __name__ == "__main__":
    main()
