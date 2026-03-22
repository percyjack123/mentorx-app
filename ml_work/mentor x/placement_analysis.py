# ============================================================
# placement_analysis.py
# HOW TO RUN: python placement_analysis.py
# SHOWS: who is placed, CGPA vs placement, by dept, by semester
# ============================================================

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from data_loader import load_students, GREEN, YELLOW, RED, BLUE, PURPLE, CHART_STYLE

plt.style.use("dark_background")
plt.rcParams.update(CHART_STYLE)

print("=" * 55)
print("  PLACEMENT ANALYSIS — MentorX")
print("=" * 55)

df, status = load_students()
print(f"Data: {status} | Students: {len(df)}\n")

placed    = df[df["placement_status"]=="Placed"]
not_placed= df[df["placement_status"]!="Placed"]

print(f"Total students  : {len(df)}")
print(f"Placed          : {len(placed)} ({len(placed)/len(df)*100:.1f}%)")
if len(placed):    print(f"Avg CGPA placed : {placed['cgpa'].mean():.2f}")
if len(not_placed):print(f"Avg CGPA others : {not_placed['cgpa'].mean():.2f}")
print()
for s in ["Not Started","Preparing","Applied","Interview Stage","Placed"]:
    c=(df["placement_status"]==s).sum()
    if c: print(f"  {s:20s}: {c}")

print("\nGenerating charts...")
fig, axes = plt.subplots(2,3,figsize=(18,11))
fig.suptitle(f"Placement Analysis — {len(df)} students",fontsize=15,color="#c9d1d9",fontweight="bold",y=1.01)

stage_colors={"Not Started":RED,"Preparing":YELLOW,"Applied":BLUE,
              "Interview Stage":PURPLE,"Placed":GREEN}

# Chart 1: pie
pc_=df["placement_status"].value_counts()
axes[0,0].pie(pc_.values,labels=pc_.index,
              colors=[stage_colors.get(s,BLUE) for s in pc_.index],
              autopct="%1.1f%%",startangle=90,
              textprops={"color":"#c9d1d9","fontsize":10})
axes[0,0].set_title("Placement Status",color="#c9d1d9")

# Chart 2: CGPA placed vs not placed
if len(placed) and len(not_placed):
    axes[0,1].hist(placed["cgpa"],bins=min(15,len(placed)),alpha=0.75,color=GREEN,
                   edgecolor="none",label=f"Placed ({len(placed)})")
    axes[0,1].hist(not_placed["cgpa"],bins=min(15,len(not_placed)),alpha=0.5,color=RED,
                   edgecolor="none",label=f"Not Placed ({len(not_placed)})")
    if len(placed)>1:
        axes[0,1].axvline(placed["cgpa"].mean(),color=GREEN,linestyle="--",lw=1.5,
                          label=f"Placed avg={placed['cgpa'].mean():.2f}")
    axes[0,1].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=8)
axes[0,1].set_title("CGPA: Placed vs Not Placed",color="#c9d1d9")
axes[0,1].set_xlabel("CGPA"); axes[0,1].set_ylabel("Students")

# Chart 3: placement rate by dept
if df["department"].nunique()>1:
    dpl=df[df["placement_status"]=="Placed"].groupby("department").size()
    dtl=df.groupby("department").size()
    dr =(dpl/dtl*100).fillna(0).sort_values(ascending=False)
    bc =[GREEN if v>=30 else YELLOW if v>=15 else RED for v in dr.values]
    b3 =axes[0,2].bar(dr.index,dr.values,color=bc,edgecolor="none",width=0.6)
    for bar,val in zip(b3,dr.values):
        axes[0,2].text(bar.get_x()+bar.get_width()/2,val+0.5,f"{val:.1f}%",
                       ha="center",color="#c9d1d9",fontsize=10)
    axes[0,2].set_title("Placement Rate by Department",color="#c9d1d9")
    axes[0,2].set_ylabel("%"); axes[0,2].set_ylim(0,100)
else:
    axes[0,2].text(0.5,0.5,"Need multiple departments",ha="center",va="center",
                   color="#8b949e",fontsize=12,transform=axes[0,2].transAxes)
    axes[0,2].set_title("Placement Rate by Dept",color="#c9d1d9")

# Chart 4: CGPA range vs placement stage
import pandas as pd
cgpa_bins  =[0,5.5,6.5,7.5,8.5,10]
cgpa_labels=["<5.5","5.5-6.5","6.5-7.5","7.5-8.5",">8.5"]
df["cgpa_range"]=pd.cut(df["cgpa"],bins=cgpa_bins,labels=cgpa_labels,right=False)
cpr=df.groupby(["cgpa_range","placement_status"],observed=True).size().unstack(fill_value=0)
avail=[s for s in ["Not Started","Preparing","Applied","Interview Stage","Placed"] if s in cpr.columns]
bottom=np.zeros(len(cpr))
for s,color in [(s,stage_colors.get(s,BLUE)) for s in avail]:
    v=cpr[s].values
    axes[1,0].bar(cgpa_labels[:len(cpr)],v,bottom=bottom,color=color,edgecolor="none",label=s)
    bottom+=v
axes[1,0].set_title("Placement Stage by CGPA Range",color="#c9d1d9")
axes[1,0].set_xlabel("CGPA Range"); axes[1,0].set_ylabel("Students")
axes[1,0].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=7,loc="upper left")
axes[1,0].tick_params(axis="x",rotation=15)

# Chart 5: placement by semester
if df["semester"].nunique()>1:
    spl=df.groupby(["semester","placement_status"]).size().unstack(fill_value=0)
    spp=spl.div(spl.sum(axis=1),axis=0)*100
    bottom2=np.zeros(len(spp))
    for s,color in [(s,stage_colors.get(s,BLUE)) for s in avail]:
        if s in spp.columns:
            v=spp[s].values
            axes[1,1].bar(spp.index,v,bottom=bottom2,color=color,edgecolor="none",label=s)
            bottom2+=v
    axes[1,1].set_title("Placement by Semester",color="#c9d1d9")
    axes[1,1].set_xlabel("Semester"); axes[1,1].set_ylabel("%")
    axes[1,1].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=7)
else:
    axes[1,1].text(0.5,0.5,"Need multiple semesters",ha="center",va="center",
                   color="#8b949e",fontsize=12,transform=axes[1,1].transAxes)
    axes[1,1].set_title("Placement by Semester",color="#c9d1d9")

# Chart 6: scatter CGPA vs attendance colored by placement
axes[1,2].scatter(not_placed["attendance"],not_placed["cgpa"],
                  c=RED,alpha=0.4,s=25,edgecolors="none",label="Not Placed")
if len(placed):
    axes[1,2].scatter(placed["attendance"],placed["cgpa"],
                      c=GREEN,alpha=0.8,s=60,edgecolors="none",label="Placed",marker="*")
axes[1,2].set_title("CGPA vs Attendance (★=Placed)",color="#c9d1d9")
axes[1,2].set_xlabel("Attendance %"); axes[1,2].set_ylabel("CGPA")
axes[1,2].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=9)

plt.tight_layout()
plt.savefig("placement_analysis.png",dpi=150,bbox_inches="tight")
print("Saved → placement_analysis.png")
plt.show()