# ============================================================
# attendance_analysis.py
# HOW TO RUN: python attendance_analysis.py
# ============================================================

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from data_loader import load_students, GREEN, YELLOW, RED, BLUE, CHART_STYLE

plt.style.use("dark_background")
plt.rcParams.update(CHART_STYLE)

print("=" * 55)
print("  ATTENDANCE ANALYSIS — MentorX")
print("=" * 55)

df, status = load_students()
print(f"Data: {status} | Students: {len(df)}\n")

below_75 = df[df["attendance"] < 75]
below_60 = df[df["attendance"] < 60]
corr     = df["attendance"].corr(df["cgpa"])

print(f"Average attendance  : {df['attendance'].mean():.1f}%")
print(f"Below 75% (at risk) : {len(below_75)} ({len(below_75)/len(df)*100:.1f}%)")
print(f"Below 60% (critical): {len(below_60)} ({len(below_60)/len(df)*100:.1f}%)")
print(f"Correlation w/ CGPA : {corr:.3f}")

print("\nGenerating charts...")
fig, axes = plt.subplots(2, 3, figsize=(18, 11))
fig.suptitle(f"Attendance Analysis — {len(df)} students ({status} data)",
             fontsize=15, color="#c9d1d9", fontweight="bold", y=1.01)

# Chart 1: histogram
axes[0,0].hist(df["attendance"], bins=min(20,len(df)),
               color=BLUE, edgecolor="#0d1117", alpha=0.85)
axes[0,0].axvline(75, color=RED,    linestyle="--", lw=2, label="75% threshold")
axes[0,0].axvline(60, color=YELLOW, linestyle="--", lw=1.5, label="60% critical")
axes[0,0].axvline(df["attendance"].mean(), color=GREEN, lw=1.5,
                  label=f"Avg={df['attendance'].mean():.1f}%")
axes[0,0].set_title("Attendance Distribution", color="#c9d1d9")
axes[0,0].set_xlabel("Attendance %")
axes[0,0].set_ylabel("Students")
axes[0,0].legend(facecolor="#161b22", labelcolor="#c9d1d9", fontsize=9)

# Chart 2: by department
if df["department"].nunique() > 1:
    dt = df.groupby("department").size()
    db = df[df["attendance"]<75].groupby("department").size()
    dp = (db/dt*100).fillna(0).sort_values(ascending=False)
    bc = [RED if v>40 else YELLOW if v>25 else GREEN for v in dp.values]
    b2 = axes[0,1].bar(dp.index, dp.values, color=bc, edgecolor="none", width=0.6)
    for bar, val in zip(b2, dp.values):
        axes[0,1].text(bar.get_x()+bar.get_width()/2, val+0.5,
                       f"{val:.1f}%", ha="center", color="#c9d1d9", fontsize=10)
    axes[0,1].set_title("% Below 75% by Department", color="#c9d1d9")
    axes[0,1].set_ylabel("%")
    axes[0,1].set_ylim(0,100)
else:
    axes[0,1].text(0.5,0.5,"Need multiple departments",
                   ha="center",va="center",color="#8b949e",
                   fontsize=12,transform=axes[0,1].transAxes)
    axes[0,1].set_title("% Below 75% by Department", color="#c9d1d9")

# Chart 3: by semester
if df["semester"].nunique() > 1:
    sa = df.groupby("semester")["attendance"].mean()
    axes[0,2].plot(sa.index, sa.values, color=BLUE, marker="s", lw=2.5, markersize=9)
    axes[0,2].fill_between(sa.index, sa.values, alpha=0.12, color=BLUE)
    for s,v in zip(sa.index,sa.values):
        axes[0,2].text(s, v+0.5, f"{v:.1f}%", ha="center", color=BLUE, fontsize=10)
    axes[0,2].axhline(75, color=RED, linestyle="--", lw=1.5, label="75%")
    axes[0,2].set_title("Attendance by Semester", color="#c9d1d9")
    axes[0,2].set_xlabel("Semester")
    axes[0,2].set_ylabel("Avg Attendance %")
    axes[0,2].legend(facecolor="#161b22", labelcolor="#c9d1d9", fontsize=9)
else:
    axes[0,2].text(0.5,0.5,"Need multiple semesters",
                   ha="center",va="center",color="#8b949e",
                   fontsize=12,transform=axes[0,2].transAxes)
    axes[0,2].set_title("Attendance by Semester", color="#c9d1d9")

# Chart 4: scatter
cm_map = {"Green":GREEN,"Yellow":YELLOW,"Red":RED}
for risk in ["Green","Yellow","Red"]:
    sub = df[df["risk_level"]==risk]
    if len(sub):
        axes[1,0].scatter(sub["attendance"], sub["cgpa"], c=cm_map[risk],
                          alpha=0.6, s=40, label=f"{risk} ({len(sub)})",
                          edgecolors="none")
if len(df) > 2:
    z  = np.polyfit(df["attendance"], df["cgpa"], 1)
    p  = np.poly1d(z)
    xl = np.linspace(df["attendance"].min(), df["attendance"].max(), 100)
    axes[1,0].plot(xl, p(xl), color=YELLOW, lw=2,
                   linestyle="--", label=f"Trend (r={corr:.2f})")
axes[1,0].set_title("Attendance vs CGPA", color="#c9d1d9")
axes[1,0].set_xlabel("Attendance %")
axes[1,0].set_ylabel("CGPA")
axes[1,0].legend(facecolor="#161b22", labelcolor="#c9d1d9", fontsize=9)

# Chart 5: detention zones
safe     = (df["attendance"]>=75).sum()
warning  = ((df["attendance"]>=60)&(df["attendance"]<75)).sum()
critical = (df["attendance"]<60).sum()
b5 = axes[1,1].bar(["Safe\n(≥75%)","Warning\n(60-75%)","Critical\n(<60%)"],
                    [safe,warning,critical],
                    color=[GREEN,YELLOW,RED], edgecolor="none", width=0.5)
for bar, cnt in zip(b5,[safe,warning,critical]):
    axes[1,1].text(bar.get_x()+bar.get_width()/2, cnt+0.2,
                   f"{cnt}\n({cnt/len(df)*100:.0f}%)",
                   ha="center", color="#c9d1d9", fontsize=11)
axes[1,1].set_title("Detention Risk Zones", color="#c9d1d9")
axes[1,1].set_ylabel("Students")

# Chart 6: mood vs attendance
mood_vals   = sorted(df["mood_score"].unique())
mood_groups = [df[df["mood_score"]==m]["attendance"].values for m in mood_vals]
if len(mood_groups) >= 2:
    bp = axes[1,2].boxplot(mood_groups, labels=[str(int(m)) for m in mood_vals],
                            patch_artist=True,
                            medianprops=dict(color=YELLOW, linewidth=2))
    for patch, color in zip(bp["boxes"],[RED,RED,BLUE,GREEN,GREEN]):
        patch.set_facecolor(color)
        patch.set_alpha(0.5)
    axes[1,2].axhline(75, color=RED, linestyle="--", lw=1.5, alpha=0.6)
    axes[1,2].set_title("Attendance by Mood Score", color="#c9d1d9")
    axes[1,2].set_xlabel("Mood Score")
    axes[1,2].set_ylabel("Attendance %")
else:
    axes[1,2].text(0.5,0.5,"Need more mood data",
                   ha="center",va="center",color="#8b949e",
                   fontsize=12,transform=axes[1,2].transAxes)
    axes[1,2].set_title("Attendance by Mood", color="#c9d1d9")

plt.tight_layout()
plt.savefig("attendance_analysis.png", dpi=150, bbox_inches="tight")
print("Saved → attendance_analysis.png")
plt.show()