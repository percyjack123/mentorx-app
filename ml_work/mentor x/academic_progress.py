# ============================================================
# academic_progress.py
# HOW TO RUN: python academic_progress.py
# ============================================================

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from data_loader import load_students, GREEN, YELLOW, RED, BLUE, CHART_STYLE

plt.style.use("dark_background")
plt.rcParams.update(CHART_STYLE)

print("=" * 55)
print("  ACADEMIC PROGRESS — MentorX")
print("=" * 55)

df, status = load_students()
print(f"Data: {status} | Students: {len(df)}\n")

# Print summary
print(f"Average CGPA  : {df['cgpa'].mean():.2f}")
print(f"Highest CGPA  : {df['cgpa'].max():.2f}")
print(f"Lowest  CGPA  : {df['cgpa'].min():.2f}")
print(f"With backlogs : {(df['backlog_count'] > 0).sum()}")
print()
for level in ["Green","Yellow","Red"]:
    count = (df["risk_level"]==level).sum()
    icon  = {"Green":"🟢","Yellow":"🟡","Red":"🔴"}[level]
    print(f"  {icon} {level:8s}: {count} ({count/len(df)*100:.1f}%)")

print("\nGenerating charts...")
fig, axes = plt.subplots(2, 3, figsize=(18, 11))
fig.suptitle(f"Academic Progress — {len(df)} students ({status} data)",
             fontsize=15, color="#c9d1d9", fontweight="bold", y=1.01)

# Chart 1: Risk distribution
rc   = df["risk_level"].value_counts()
bars = axes[0,0].bar(
    ["Green","Yellow","Red"],
    [rc.get("Green",0),rc.get("Yellow",0),rc.get("Red",0)],
    color=[GREEN,YELLOW,RED], edgecolor="none", width=0.5)
for bar in bars:
    h = bar.get_height()
    axes[0,0].text(bar.get_x()+bar.get_width()/2, h+0.2, str(int(h)),
                   ha="center", fontsize=13, color="#c9d1d9", fontweight="bold")
axes[0,0].set_title("Risk Level Distribution", color="#c9d1d9")
axes[0,0].set_ylabel("Students")

# Chart 2: CGPA histogram
axes[0,1].hist(df["cgpa"], bins=min(20,len(df)),
               color=BLUE, edgecolor="#0d1117", alpha=0.85)
axes[0,1].axvline(5.5, color=RED,    linestyle="--", lw=2, label="5.5 Red")
axes[0,1].axvline(6.5, color=YELLOW, linestyle="--", lw=2, label="6.5 Yellow")
axes[0,1].axvline(df["cgpa"].mean(), color="#2dd4a0", lw=1.5,
                  label=f"Avg={df['cgpa'].mean():.2f}")
axes[0,1].set_title("CGPA Distribution", color="#c9d1d9")
axes[0,1].set_xlabel("CGPA")
axes[0,1].set_ylabel("Students")
axes[0,1].legend(facecolor="#161b22", labelcolor="#c9d1d9", fontsize=9)

# Chart 3: CGPA by department
if df["department"].nunique() > 1:
    dc = df.groupby("department")["cgpa"].mean().sort_values(ascending=False)
    bc = [GREEN if v>=7 else YELLOW if v>=6 else RED for v in dc.values]
    b3 = axes[0,2].bar(dc.index, dc.values, color=bc, edgecolor="none", width=0.6)
    for bar, val in zip(b3, dc.values):
        axes[0,2].text(bar.get_x()+bar.get_width()/2, val+0.05,
                       f"{val:.2f}", ha="center", color="#c9d1d9", fontsize=10)
    axes[0,2].set_title("Avg CGPA by Department", color="#c9d1d9")
    axes[0,2].set_ylabel("Avg CGPA")
    axes[0,2].set_ylim(0,10)
else:
    axes[0,2].text(0.5,0.5,"Need multiple departments",
                   ha="center",va="center",color="#8b949e",
                   fontsize=12,transform=axes[0,2].transAxes)
    axes[0,2].set_title("CGPA by Department", color="#c9d1d9")

# Chart 4: CGPA vs Mood
cm_map = {"Green":GREEN,"Yellow":YELLOW,"Red":RED}
for risk in ["Green","Yellow","Red"]:
    sub = df[df["risk_level"]==risk]
    if len(sub):
        axes[1,0].scatter(
            sub["mood_score"]+np.random.uniform(-0.1,0.1,len(sub)),
            sub["cgpa"], c=cm_map[risk], alpha=0.65,
            s=45, label=f"{risk} ({len(sub)})", edgecolors="none")
axes[1,0].set_title("CGPA vs Mood Score", color="#c9d1d9")
axes[1,0].set_xlabel("Mood (1=Very Bad  5=Great)")
axes[1,0].set_ylabel("CGPA")
axes[1,0].set_xticks([1,2,3,4,5])
axes[1,0].legend(facecolor="#161b22", labelcolor="#c9d1d9", fontsize=9)

# Chart 5: CGPA by semester
if df["semester"].nunique() > 1:
    sc = df.groupby("semester")["cgpa"].mean()
    axes[1,1].plot(sc.index, sc.values, color=BLUE,
                   marker="o", lw=2.5, markersize=9)
    axes[1,1].fill_between(sc.index, sc.values, alpha=0.12, color=BLUE)
    for s,v in zip(sc.index,sc.values):
        axes[1,1].text(s, v+0.1, f"{v:.2f}", ha="center", color=BLUE, fontsize=10)
    axes[1,1].set_title("Avg CGPA by Semester", color="#c9d1d9")
    axes[1,1].set_xlabel("Semester")
    axes[1,1].set_ylabel("CGPA")
    axes[1,1].set_ylim(0,10)
else:
    axes[1,1].text(0.5,0.5,"Need multiple semesters",
                   ha="center",va="center",color="#8b949e",
                   fontsize=12,transform=axes[1,1].transAxes)
    axes[1,1].set_title("CGPA by Semester", color="#c9d1d9")

# Chart 6: Backlogs
bkc = df["backlog_count"].value_counts().sort_index()
bc6 = [GREEN if k==0 else YELLOW if k<=2 else RED for k in bkc.index]
b6  = axes[1,2].bar(bkc.index, bkc.values, color=bc6, edgecolor="none", width=0.6)
for bar in b6:
    h = bar.get_height()
    axes[1,2].text(bar.get_x()+bar.get_width()/2, h+0.2,
                   str(int(h)), ha="center", color="#c9d1d9", fontsize=11)
axes[1,2].set_title("Backlog Distribution", color="#c9d1d9")
axes[1,2].set_xlabel("Number of Backlogs")
axes[1,2].set_ylabel("Students")

plt.tight_layout()
plt.savefig("academic_progress.png", dpi=150, bbox_inches="tight")
print("Saved → academic_progress.png")
plt.show()