# ============================================================
# mentor_risk_analysis.py
# RUN AFTER: python "ml model.py"
# HOW TO RUN: python mentor_risk_analysis.py
# SHOWS: risk per student, CGPA prediction, intervention
# ============================================================

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import os, joblib
from data_loader import load_students, FEATURES, GREEN, YELLOW, RED, BLUE, PURPLE, CHART_STYLE

plt.style.use("dark_background")
plt.rcParams.update(CHART_STYLE)

print("=" * 55)
print("  MENTOR RISK ANALYSIS — MentorX")
print("=" * 55)

if not os.path.exists("risk_classifier.pkl"):
    print("Run ml model.py first!"); exit()

df, status = load_students()
print(f"Data: {status} | Students: {len(df)}")

clf=joblib.load("risk_classifier.pkl")
reg=joblib.load("cgpa_regressor.pkl")
scaler=joblib.load("scaler.pkl")

X=scaler.transform(df[FEATURES])
df["predicted_risk"]     =[["Green","Yellow","Red"][r] for r in clf.predict(X)]
df["red_probability"]    =(clf.predict_proba(X)[:,2]*100).round(1)
df["predicted_next_cgpa"]=np.round(reg.predict(X),2)

def concern(row):
    return min({"CGPA":row["cgpa"]/10,"Attendance":row["attendance"]/100,
                "Mood":row["mood_score"]/5},
               key=lambda k:{"CGPA":row["cgpa"]/10,"Attendance":row["attendance"]/100,
                              "Mood":row["mood_score"]/5}[k])

def action(row):
    if row["predicted_risk"]=="Green": return "Regular monitoring."
    c=row["primary_concern"]
    if row["predicted_risk"]=="Red":
        return {"CGPA":f"URGENT: CGPA {row['cgpa']} — academic support now.",
                "Attendance":f"URGENT: Attendance {row['attendance']}% — call student.",
                "Mood":f"URGENT: Mood {row['mood_score']}/5 — refer to counselor."
                }.get(c,"Immediate intervention.")
    return {"CGPA":f"CGPA {row['cgpa']} — share study material.",
            "Attendance":f"Attendance {row['attendance']}% — send reminder.",
            "Mood":f"Mood {row['mood_score']}/5 — check on student."
            }.get(c,"Schedule a check-in.")

df["primary_concern"]=df.apply(concern,axis=1)
df["intervention"]   =df.apply(action,axis=1)

total=len(df)
r_n=(df["predicted_risk"]=="Red").sum()
y_n=(df["predicted_risk"]=="Yellow").sum()
g_n=(df["predicted_risk"]=="Green").sum()
print(f"\n🟢 Green : {g_n}  🟡 Yellow: {y_n}  🔴 Red: {r_n}")

at_risk=df[df["predicted_risk"]!="Green"].sort_values("red_probability",ascending=False)
mc=next((c for c in ["mentor","mentor_id"] if c in df.columns),None)
if mc and len(at_risk):
    print("\n" + "─"*55 + "\nMENTOR ALERTS\n" + "─"*55)
    for mentor,grp in at_risk.groupby(mc):
        print(f"\n📧 {mentor}")
        for _,row in grp.iterrows():
            icon="🔴" if row["predicted_risk"]=="Red" else "🟡"
            arrow="↓" if row["predicted_next_cgpa"]<row["cgpa"] else "↑"
            print(f"\n  {icon} {row.get('name','?')} ({row.get('roll_no','N/A')})")
            print(f"     Risk      : {row['predicted_risk']}")
            print(f"     CGPA      : {row['cgpa']} → {row['predicted_next_cgpa']} {arrow}")
            print(f"     Attendance: {row['attendance']}%")
            print(f"     Concern   : {row['primary_concern']}")
            print(f"     ⚡ Action : {row['intervention']}")

df.to_csv("risk_report.csv",index=False)
print("\nSaved → risk_report.csv")

fig,axes=plt.subplots(2,2,figsize=(14,10))
fig.suptitle(f"Mentor Risk Analysis — {total} students",fontsize=14,color="#c9d1d9",fontweight="bold")
axes[0,0].pie([g_n,y_n,r_n],colors=[GREEN,YELLOW,RED],
              labels=[f"Green\n{g_n}",f"Yellow\n{y_n}",f"Red\n{r_n}"],
              startangle=90,wedgeprops=dict(width=0.55),textprops={"color":"#c9d1d9","fontsize":11})
axes[0,0].set_title("Risk Distribution",color="#c9d1d9")
sc=[{"Green":GREEN,"Yellow":YELLOW,"Red":RED}[r] for r in df["predicted_risk"]]
axes[0,1].scatter(df["cgpa"],df["predicted_next_cgpa"],c=sc,alpha=0.7,s=45,edgecolors="none")
lo=min(df["cgpa"].min(),df["predicted_next_cgpa"].min())
hi=max(df["cgpa"].max(),df["predicted_next_cgpa"].max())
axes[0,1].plot([lo,hi],[lo,hi],"w--",lw=1,alpha=0.4)
axes[0,1].set_title("Current vs Predicted CGPA",color="#c9d1d9")
axes[0,1].set_xlabel("Current CGPA"); axes[0,1].set_ylabel("Predicted Next CGPA")
axes[1,0].hist(df["red_probability"],bins=min(20,len(df)),color=BLUE,edgecolor="#0d1117",alpha=0.85)
axes[1,0].axvline(50,color=RED,linestyle="--",lw=2,label="50%")
axes[1,0].set_title("Red Probability Distribution",color="#c9d1d9")
axes[1,0].set_xlabel("Red Probability %"); axes[1,0].set_ylabel("Students")
axes[1,0].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=9)
cc=df[df["predicted_risk"]!="Green"]["primary_concern"].value_counts()
if len(cc):
    axes[1,1].pie(cc.values,labels=cc.index,colors=[RED,YELLOW,PURPLE],
                  autopct="%1.0f%%",startangle=90,textprops={"color":"#c9d1d9","fontsize":11})
    axes[1,1].set_title("Primary Concern",color="#c9d1d9")
else:
    axes[1,1].text(0.5,0.5,"All students Green ✅",ha="center",va="center",
                   color=GREEN,fontsize=13,transform=axes[1,1].transAxes)
    axes[1,1].set_title("Primary Concern",color="#c9d1d9")

plt.tight_layout()
plt.savefig("mentor_risk_analysis.png",dpi=150,bbox_inches="tight")
print("Saved → mentor_risk_analysis.png")
plt.show()