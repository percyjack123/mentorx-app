# ============================================================
# mentor_engagement_analysis.py
# HOW TO RUN: python mentor_engagement_analysis.py
# SHOWS: peer comparison, badges, skill log, resource engagement
# ============================================================

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from data_loader import load_students, GREEN, YELLOW, RED, BLUE, PURPLE, CHART_STYLE

plt.style.use("dark_background")
plt.rcParams.update(CHART_STYLE)

print("=" * 55)
print("  MENTOR ENGAGEMENT ANALYSIS — MentorX")
print("=" * 55)

df, status = load_students()
print(f"Data: {status} | Students: {len(df)}\n")

# ── Peer Comparison ──
df["cgpa_percentile"]       = df["cgpa"].rank(pct=True).round(3)*100
df["attendance_percentile"] = df["attendance"].rank(pct=True).round(3)*100
df["overall_score"]         = df["cgpa"]/10*0.6 + df["attendance"]/100*0.4
df["overall_rank"]          = df["overall_score"].rank(ascending=False).astype(int)

print("Top 5 by rank (anonymous):")
top5=df.nsmallest(5,"overall_rank")[["overall_rank","cgpa","attendance","cgpa_percentile"]]
print(top5.to_string(index=False))

# ── Auto Badges ──
badge_rows=[]
for _,row in df.iterrows():
    if row["cgpa"]>=8.5:     badge_rows.append({"name":row["name"],"badge":"Academic Excellence"})
    if row["attendance"]>=95:badge_rows.append({"name":row["name"],"badge":"Full Attendance"})
    if row.get("placement_status","")=="Placed":
                             badge_rows.append({"name":row["name"],"badge":"Placement Ready"})
    if row["cgpa"]>=7.0 and row["backlog_count"]==0:
                             badge_rows.append({"name":row["name"],"badge":"Clean Record"})

import pandas as pd
badges_df=pd.DataFrame(badge_rows) if badge_rows else pd.DataFrame(columns=["name","badge"])
print(f"\nAuto-assigned badges: {len(badges_df)}")
if not badges_df.empty:
    print(badges_df["badge"].value_counts().to_string())

students_no_badge=len(df)-df["name"].isin(badges_df["name"].unique()).sum() if not badges_df.empty else len(df)
print(f"\nStudents with no badges: {students_no_badge} → mentor should encourage these!")

# ── Charts ──
print("\nGenerating charts...")
fig,axes=plt.subplots(2,2,figsize=(14,10))
fig.suptitle(f"Mentor Engagement Analysis — {len(df)} students",fontsize=14,color="#c9d1d9",fontweight="bold")

# Chart 1: Peer comparison scatter
sc=[{"Green":GREEN,"Yellow":YELLOW,"Red":RED}[r] for r in df["risk_level"]]
axes[0,0].scatter(df["attendance_percentile"],df["cgpa_percentile"],
                  c=sc,alpha=0.7,s=45,edgecolors="none")
axes[0,0].axvline(50,color="white",linestyle="--",alpha=0.2,lw=1)
axes[0,0].axhline(50,color="white",linestyle="--",alpha=0.2,lw=1)
axes[0,0].set_title("Peer Comparison\n(anonymous percentile ranking)",color="#c9d1d9")
axes[0,0].set_xlabel("Attendance Percentile"); axes[0,0].set_ylabel("CGPA Percentile")

# Chart 2: CGPA percentile distribution
axes[0,1].hist(df["cgpa_percentile"],bins=min(15,len(df)),color=BLUE,edgecolor="#0d1117",alpha=0.85)
axes[0,1].set_title("CGPA Percentile Distribution",color="#c9d1d9")
axes[0,1].set_xlabel("Percentile (100=top)"); axes[0,1].set_ylabel("Students")

# Chart 3: Badge distribution
if not badges_df.empty:
    bc_=badges_df["badge"].value_counts()
    axes[1,0].barh(bc_.index,bc_.values,color=[GREEN,BLUE,YELLOW,PURPLE],edgecolor="none",height=0.6)
    for i,val in enumerate(bc_.values):
        axes[1,0].text(val+0.1,i,str(val),va="center",color="#c9d1d9",fontsize=10)
    axes[1,0].set_title("Milestone Badges Earned",color="#c9d1d9"); axes[1,0].set_xlabel("Count")
else:
    axes[1,0].text(0.5,0.5,"No badges yet",ha="center",va="center",
                   color="#8b949e",fontsize=13,transform=axes[1,0].transAxes)
    axes[1,0].set_title("Milestone Badges",color="#c9d1d9")

# Chart 4: Resource engagement by risk
rr=df.groupby(["resource_needed","risk_level"]).size().unstack(fill_value=0)
for col in ["Green","Yellow","Red"]:
    if col not in rr.columns: rr[col]=0
rr=rr[["Green","Yellow","Red"]]
bottom=np.zeros(len(rr))
for risk,color in [("Green",GREEN),("Yellow",YELLOW),("Red",RED)]:
    axes[1,1].barh(rr.index,rr[risk],left=bottom,color=color,
                   edgecolor="none",label=risk,height=0.6)
    bottom+=rr[risk].values
axes[1,1].set_title("Resource Engagement by Risk",color="#c9d1d9")
axes[1,1].set_xlabel("Students")
axes[1,1].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=9)

plt.tight_layout()
plt.savefig("mentor_engagement_analysis.png",dpi=150,bbox_inches="tight")
print("Saved → mentor_engagement_analysis.png")
plt.show()