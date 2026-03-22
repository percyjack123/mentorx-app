# ============================================================
# data_loader.py
# ============================================================
# WHAT THIS FILE DOES:
#
# It tries to get student data in this order:
#
#   1. First tries Supabase (real student data)
#   2. If Supabase not set up → generates realistic fake data
#
# This means the code ALWAYS works — even with zero setup.
# When real students join later, it switches automatically.
#
# YOU DO NOT NEED TO CHANGE ANYTHING IN THIS FILE.
# ============================================================

import pandas as pd
import numpy as np

# ── Supabase credentials (optional) ──
# If you have them, paste here. If not, leave as is.
# The code will still work without them.
SUPABASE_URL = "https://zfuchvrvfmheglylhsff.supabase.co"
SUPABASE_KEY = ""   # paste your full key here if you have it

# ── Settings ──
MIN_STUDENTS = 5

FEATURES = [
    "cgpa", "attendance", "mood_score",
    "backlog_count", "placement_encoded"
]

PLACEMENT_MAP = {
    "Not Started": 0, "Preparing": 1, "Applied": 2,
    "Interview Stage": 3, "Placed": 4
}

# Colors for charts
GREEN  = "#2dd4a0"
YELLOW = "#f5c842"
RED    = "#f0556a"
BLUE   = "#5b9cf6"
PURPLE = "#a78bfa"

CHART_STYLE = {
    "figure.facecolor": "#0d1117", "axes.facecolor": "#161b22",
    "axes.edgecolor": "#30363d",   "text.color": "#c9d1d9",
    "axes.labelcolor": "#c9d1d9",  "xtick.color": "#8b949e",
    "ytick.color": "#8b949e",      "grid.color": "#21262d",
    "font.size": 11,
}


# ============================================================
# PART 1 — TRY SUPABASE FIRST
# ============================================================
def _try_supabase():
    """
    Tries to connect to Supabase and read student data.
    Returns DataFrame if successful, None if not.
    """
    if not SUPABASE_KEY or len(SUPABASE_KEY) < 100:
        return None  # key not set, skip silently

    try:
        from supabase import create_client
        client = create_client(SUPABASE_URL, SUPABASE_KEY)
        res    = client.table("students").select("*").execute()
        if res.data and len(res.data) > 0:
            print(f"Real data: loaded {len(res.data)} students from Supabase.")
            return pd.DataFrame(res.data)
        return None
    except Exception:
        return None   # silently fall through to synthetic data


# ============================================================
# PART 2 — GENERATE SYNTHETIC DATA
# ============================================================
def _generate_synthetic_data():
    """
    Creates realistic student data that looks exactly like
    what real students would fill in the form.

    This is used when:
    - Supabase is not set up yet
    - No students have joined yet
    - You just want to demo/test the ML

    The data is realistic — based on real patterns:
    - Strong students have high CGPA AND high attendance
    - Weak students have low CGPA AND low mood
    - Placement correlates with CGPA
    """
    print("Using synthetic data (no real students yet).")
    print("When real students join Supabase, this switches automatically.")
    print()

    np.random.seed(42)
    N = 60   # number of synthetic students

    names = [
        "Jalapathi Sahithi", "Saumya Kumari", "Supriya Rani Gouda",
        "Snigdha Keshri", "Keshav Agrawal", "Aryan Chauhan",
        "Aman Sharma", "Riya Patel", "Neha Verma", "Rahul Gupta",
        "Pooja Singh", "Arjun Nair", "Sneha Reddy", "Vikram Rao",
        "Priya Menon", "Karthik Das", "Divya Iyer", "Rohit Kumar",
        "Anjali Bose", "Suresh Pillai",
    ]
    depts   = ["CSE", "ECE", "ME", "CE", "IT"]
    mentors = [
        "Prof. Ajit Kumar Pasayat",
        "Prof. Sharma",
        "Prof. Patel",
        "Prof. Verma",
    ]
    placements = ["Not Started", "Preparing", "Applied",
                  "Interview Stage", "Placed"]
    resources  = ["Study Material", "Mock Tests", "Placement Prep",
                  "Project Guidance", "Counseling", "None"]

    rows = []
    for i in range(N):
        ability  = np.random.uniform(3.5, 9.8)
        attend   = np.random.uniform(40, 99)
        cgpa     = round(np.clip(ability + np.random.normal(0, 0.4), 0, 10), 2)
        attend_  = round(np.clip(attend  + np.random.normal(0, 5),   0, 100), 1)
        mood     = int(np.clip(np.random.normal(3, 1), 1, 5))
        backlogs = max(0, int(np.random.normal(0, 1.2)) if cgpa < 6 else 0)

        if cgpa >= 8.0:
            placement = np.random.choice(["Applied", "Interview Stage", "Placed"],
                                          p=[0.2, 0.3, 0.5])
        elif cgpa >= 6.5:
            placement = np.random.choice(placements, p=[0.1, 0.3, 0.3, 0.2, 0.1])
        else:
            placement = np.random.choice(["Not Started", "Preparing", "Applied"],
                                          p=[0.5, 0.35, 0.15])

        if cgpa < 5.5:
            resource = np.random.choice(["Study Material", "Counseling", "Mock Tests"],
                                         p=[0.5, 0.3, 0.2])
        elif cgpa < 7.0:
            resource = np.random.choice(resources, p=[0.3, 0.2, 0.2, 0.15, 0.1, 0.05])
        else:
            resource = np.random.choice(["Placement Prep", "Project Guidance", "None"],
                                         p=[0.4, 0.4, 0.2])

        rows.append({
            "name"            : names[i % len(names)],
            "roll_no"         : f"21CS{str(i+1).zfill(3)}",
            "department"      : np.random.choice(depts, p=[0.35,0.2,0.2,0.15,0.1]),
            "semester"        : np.random.choice([3, 4, 5, 6, 7]),
            "mentor"          : mentors[i % len(mentors)],
            "cgpa"            : cgpa,
            "attendance"      : attend_,
            "mood_score"      : mood,
            "backlog_count"   : backlogs,
            "placement_status": placement,
            "resource_needed" : resource,
            "student_type"    : np.random.choice(["Hosteller", "Day Scholar"],
                                                   p=[0.4, 0.6]),
        })

    return pd.DataFrame(rows)


# ============================================================
# PART 3 — CLEAN AND PREPARE DATA
# ============================================================
def _prepare(df):
    """
    Cleans the data and adds columns needed for ML.
    Works the same whether data is real or synthetic.
    """
    # Make sure all columns exist with safe defaults
    defaults = {
        "name": "Unknown", "roll_no": "N/A",
        "department": "Unknown", "semester": 5,
        "mentor": "Not Assigned", "cgpa": np.nan,
        "attendance": np.nan, "mood_score": np.nan,
        "backlog_count": 0, "placement_status": "Not Started",
        "resource_needed": "None", "student_type": "Day Scholar",
    }
    for col, val in defaults.items():
        if col not in df.columns:
            df[col] = val

    # Make sure numbers are numbers
    for col in ["cgpa", "attendance", "mood_score"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["backlog_count"] = pd.to_numeric(
        df["backlog_count"], errors="coerce").fillna(0).astype(int)

    # Fill any missing values with average
    for col in ["cgpa", "attendance", "mood_score"]:
        if df[col].isna().any():
            avg = df[col].mean()
            fb  = {"cgpa": 6.0, "attendance": 75.0, "mood_score": 3}[col]
            df[col] = df[col].fillna(avg if not pd.isna(avg) else fb)

    # Convert placement text → number for ML
    df["placement_encoded"] = (
        df["placement_status"].map(PLACEMENT_MAP).fillna(0).astype(int)
    )

    # Assign risk level to each student
    def risk(row):
        if (row["cgpa"] < 5.5 or row["attendance"] < 55
                or row["mood_score"] <= 1 or row["backlog_count"] >= 3):
            return "Red"
        elif (row["cgpa"] < 6.5 or row["attendance"] < 75
                  or row["mood_score"] <= 2 or row["backlog_count"] >= 1):
            return "Yellow"
        return "Green"

    df["risk_level"]   = df.apply(risk, axis=1)
    df["risk_encoded"] = df["risk_level"].map({"Green": 0, "Yellow": 1, "Red": 2})

    return df


# ============================================================
# MAIN FUNCTION — every other file calls this
# ============================================================
def load_students():
    """
    Call this from any file:
        from data_loader import load_students
        df, status = load_students()

    Returns:
        df     = student DataFrame (always returns data)
        status = "real"      → data from Supabase
                 "synthetic" → generated data (no real students yet)
    """
    # Try real data first
    raw = _try_supabase()

    if raw is not None:
        df = _prepare(raw)
        return df, "real"
    else:
        # Fall back to synthetic data
        df = _generate_synthetic_data()
        df = _prepare(df)
        return df, "synthetic"


# ── Run directly to test ──
if __name__ == "__main__":
    df, status = load_students()
    print(f"Status  : {status}")
    print(f"Students: {len(df)}")
    print()
    print(df[["name", "cgpa", "attendance", "mood_score",
              "risk_level"]].head(10).to_string(index=False))