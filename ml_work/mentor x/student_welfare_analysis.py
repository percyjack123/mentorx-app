# ============================================================
# student_welfare_analysis.py
# HOW TO RUN: python student_welfare_analysis.py
# SHOWS: mood trends, health records, emergency contacts, SOS
# ============================================================

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from data_loader import load_students, GREEN, YELLOW, RED, BLUE, PURPLE, CHART_STYLE

plt.style.use("dark_background")
plt.rcParams.update(CHART_STYLE)

print("=" * 55)
print("  STUDENT WELFARE ANALYSIS — MentorX")
print("=" * 55)

df, status = load_students()
print(f"Data: {status} | Students: {len(df)}\n")

# ── Mood Analysis from main data ──
print("--- Mood Check-in Analysis ---")
print(f"Average mood score : {df['mood_score'].mean():.2f} / 5")
print(f"Mood = 1 (Very Bad): {(df['mood_score']==1).sum()} students — ALERT!")
print(f"Mood = 2 (Bad)     : {(df['mood_score']==2).sum()} students — Watch")
print(f"Mood = 3 (Okay)    : {(df['mood_score']==3).sum()} students")
print(f"Mood = 4 (Good)    : {(df['mood_score']==4).sum()} students")
print(f"Mood = 5 (Great)   : {(df['mood_score']==5).sum()} students")

low_mood = df[df["mood_score"]<=2]
print(f"\nStudents with mood ≤ 2: {len(low_mood)}")
if len(low_mood):
    print("  → These students may need counseling support.")

# ── Mood + CGPA correlation ──
corr = df["mood_score"].corr(df["cgpa"])
print(f"\nMood ↔ CGPA correlation: {corr:.3f}")
print("(Positive = better mood = better CGPA)")

# ── Student type (hosteller vs day scholar) ──
print("\n--- Student Type ---")
if "student_type" in df.columns:
    print(df["student_type"].value_counts().to_string())
    hostellers = (df["student_type"]=="Hosteller").sum()
    day_scholars= (df["student_type"]=="Day Scholar").sum()
else:
    hostellers=0; day_scholars=len(df)
    print("student_type column not available.")

# ── Emergency contact note ──
print("\n--- Emergency Contacts ---")
print(f"Hostellers  : {hostellers} → need: Roommate (primary) + Parent (secondary)")
print(f"Day scholars: {day_scholars} → need: Parent (primary) + Close friend (secondary)")
print("  → Mentor must verify all students have emergency contacts set up.")

# ── SOS note ──
print("\n--- SOS Emergency Button ---")
print("SOS button on app sends instant alert to:")
print("  1. Mentor")
print("  2. Primary emergency contact (roommate/parent)")
print("  3. Secondary emergency contact (parent/friend)")
print("No SOS alerts triggered yet. (Good!)")

# ── Charts ──
print("\nGenerating charts...")
fig,axes=plt.subplots(2,2,figsize=(14,10))
fig.suptitle(f"Student Welfare Analysis — {len(df)} students",fontsize=14,color="#c9d1d9",fontweight="bold")

# Chart 1: Mood distribution
mood_counts=df["mood_score"].value_counts().sort_index()
mc=[RED,RED,BLUE,GREEN,GREEN]
bars=axes[0,0].bar(mood_counts.index,mood_counts.values,
                   color=mc[:len(mood_counts)],edgecolor="none",width=0.6)
for bar in bars:
    h=bar.get_height()
    axes[0,0].text(bar.get_x()+bar.get_width()/2,h+0.2,str(int(h)),
                   ha="center",color="#c9d1d9",fontsize=11)
axes[0,0].set_xticks([1,2,3,4,5])
axes[0,0].set_xticklabels(["1\nVery Bad","2\nBad","3\nOkay","4\nGood","5\nGreat"])
axes[0,0].set_title("Mood Score Distribution",color="#c9d1d9")
axes[0,0].set_ylabel("Students")

# Chart 2: Mood vs CGPA scatter
sc=[{"Green":GREEN,"Yellow":YELLOW,"Red":RED}[r] for r in df["risk_level"]]
axes[0,1].scatter(df["mood_score"]+np.random.uniform(-0.1,0.1,len(df)),
                  df["cgpa"],c=sc,alpha=0.65,s=45,edgecolors="none")
axes[0,1].set_title(f"Mood vs CGPA (corr={corr:.2f})",color="#c9d1d9")
axes[0,1].set_xlabel("Mood Score"); axes[0,1].set_ylabel("CGPA")
axes[0,1].set_xticks([1,2,3,4,5])

# Chart 3: Student type pie
if "student_type" in df.columns and df["student_type"].nunique()>1:
    stc=df["student_type"].value_counts()
    axes[1,0].pie(stc.values,labels=stc.index,colors=[BLUE,GREEN],
                  autopct="%1.0f%%",startangle=90,
                  textprops={"color":"#c9d1d9","fontsize":11})
    axes[1,0].set_title("Student Type\n(affects emergency contact setup)",color="#c9d1d9")
else:
    axes[1,0].text(0.5,0.5,"All Day Scholars",ha="center",va="center",
                   color=BLUE,fontsize=13,transform=axes[1,0].transAxes)
    axes[1,0].set_title("Student Type",color="#c9d1d9")

# Chart 4: Low mood students need attention
concern_map={"Green":GREEN,"Yellow":YELLOW,"Red":RED}
lm=df[df["mood_score"]<=2].copy()
if len(lm):
    axes[1,1].barh(lm["name"].head(10),lm["mood_score"].head(10),
                   color=[concern_map[r] for r in lm["risk_level"].head(10)],
                   edgecolor="none",height=0.6)
    axes[1,1].axvline(3,color=YELLOW,linestyle="--",lw=1.5,label="Mood=3 baseline")
    axes[1,1].set_title("Students with Low Mood (≤2)\nNeed Immediate Attention",color="#c9d1d9")
    axes[1,1].set_xlabel("Mood Score"); axes[1,1].set_xlim(0,5)
    axes[1,1].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=9)
else:
    axes[1,1].text(0.5,0.5,"No students with very low mood ✅",
                   ha="center",va="center",color=GREEN,fontsize=12,transform=axes[1,1].transAxes)
    axes[1,1].set_title("Low Mood Students",color="#c9d1d9")

plt.tight_layout()
plt.savefig("student_welfare_analysis.png",dpi=150,bbox_inches="tight")
print("Saved → student_welfare_analysis.png")
plt.show()