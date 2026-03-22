# ============================================================
# resources_analysis.py
# HOW TO RUN: python resources_analysis.py
# SHOWS: what resources students need, by risk, by dept
# ============================================================

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
from data_loader import load_students, GREEN, YELLOW, RED, BLUE, PURPLE, CHART_STYLE

plt.style.use("dark_background")
plt.rcParams.update(CHART_STYLE)

print("=" * 55)
print("  RESOURCES ANALYSIS — MentorX")
print("=" * 55)

df, status = load_students()
print(f"Data: {status} | Students: {len(df)}\n")

rc_=df["resource_needed"].value_counts()
print("Resource demand:")
for res,cnt in rc_.items():
    print(f"  {res:20s}: {cnt} ({cnt/len(df)*100:.1f}%)")

print("\nGenerating charts...")
fig, axes = plt.subplots(2,3,figsize=(18,11))
fig.suptitle(f"Resources Analysis — {len(df)} students",fontsize=15,color="#c9d1d9",fontweight="bold",y=1.01)

res_colors=[BLUE,GREEN,YELLOW,PURPLE,RED,"#ff9f40"]
all_res=df["resource_needed"].unique()

# Chart 1: overall demand
rs=df["resource_needed"].value_counts().sort_values()
bc=[RED if v==rs.max() else BLUE for v in rs.values]
bars=axes[0,0].barh(rs.index,rs.values,color=bc,edgecolor="none",height=0.6)
for bar,val in zip(bars,rs.values):
    axes[0,0].text(val+0.1,bar.get_y()+bar.get_height()/2,str(val),
                   va="center",color="#c9d1d9",fontsize=10)
axes[0,0].set_title("Overall Resource Demand\n(red = most requested)",color="#c9d1d9")
axes[0,0].set_xlabel("Students")

# Chart 2: by risk level stacked
rr=df.groupby(["resource_needed","risk_level"]).size().unstack(fill_value=0)
for col in ["Green","Yellow","Red"]:
    if col not in rr.columns: rr[col]=0
rr=rr[["Green","Yellow","Red"]]
rp=rr.div(rr.sum(axis=1),axis=0)*100
bottom=np.zeros(len(rp))
for risk,color in [("Green",GREEN),("Yellow",YELLOW),("Red",RED)]:
    axes[0,1].barh(rp.index,rp[risk],left=bottom,color=color,
                   edgecolor="none",label=risk,height=0.6)
    bottom+=rp[risk].values
axes[0,1].set_title("Resources by Risk Level",color="#c9d1d9")
axes[0,1].set_xlabel("%")
axes[0,1].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=9)

# Chart 3: heatmap
sns.heatmap(rr,annot=True,fmt="d",cmap="YlOrRd",linewidths=0.5,
            linecolor="#0d1117",cbar=False,ax=axes[0,2],annot_kws={"size":11})
axes[0,2].set_title("Heatmap: Resource × Risk",color="#c9d1d9")
axes[0,2].set_xlabel("Risk Level"); axes[0,2].set_ylabel("")

# Chart 4: by department
if df["department"].nunique()>1:
    dr=df.groupby(["department","resource_needed"]).size().unstack(fill_value=0)
    dp=dr.div(dr.sum(axis=1),axis=0)*100
    bottom2=np.zeros(len(dp))
    for res,color in zip(all_res,res_colors):
        if res in dp.columns:
            v=dp[res].values
            axes[1,0].bar(dp.index,v,bottom=bottom2,color=color,edgecolor="none",label=res)
            bottom2+=v
    axes[1,0].set_title("Resources by Department",color="#c9d1d9")
    axes[1,0].set_ylabel("%")
    axes[1,0].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=7)
    axes[1,0].tick_params(axis="x",rotation=15)
else:
    axes[1,0].text(0.5,0.5,"Need multiple departments",ha="center",va="center",
                   color="#8b949e",fontsize=12,transform=axes[1,0].transAxes)
    axes[1,0].set_title("Resources by Department",color="#c9d1d9")

# Chart 5: by CGPA range
import pandas as pd
cb=[0,5.5,6.5,7.5,10]; cl=["<5.5","5.5-6.5","6.5-7.5",">7.5"]
df["cgpa_range"]=pd.cut(df["cgpa"],bins=cb,labels=cl,right=False)
cr=df.groupby(["cgpa_range","resource_needed"],observed=True).size().unstack(fill_value=0)
cp=cr.div(cr.sum(axis=1),axis=0)*100
bottom3=np.zeros(len(cp))
for res,color in zip(all_res,res_colors):
    if res in cp.columns:
        v=cp[res].values
        axes[1,1].bar(cl[:len(cp)],v,bottom=bottom3,color=color,edgecolor="none",label=res)
        bottom3+=v
axes[1,1].set_title("Resources by CGPA Range",color="#c9d1d9")
axes[1,1].set_xlabel("CGPA Range"); axes[1,1].set_ylabel("%")
axes[1,1].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=7)

# Chart 6: grouped bar per risk group
x=np.arange(3); w=0.12
for idx,(res,color) in enumerate(zip(all_res,res_colors)):
    if res in rr.columns:
        vals=rr[res].reindex(["Green","Yellow","Red"],fill_value=0)
        axes[1,2].bar(x+idx*w,vals,w,color=color,edgecolor="none",label=res)
axes[1,2].set_xticks(x+w*(len(all_res)-1)/2)
axes[1,2].set_xticklabels(["Green","Yellow","Red"])
axes[1,2].set_title("Resources per Risk Group",color="#c9d1d9")
axes[1,2].set_ylabel("Students")
axes[1,2].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=7)

plt.tight_layout()
plt.savefig("resources_analysis.png",dpi=150,bbox_inches="tight")
print("Saved → resources_analysis.png")
plt.show()