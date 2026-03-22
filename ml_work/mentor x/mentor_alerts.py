# ============================================================
# mentor_alerts.py
# RUN AFTER: python "ml model.py"
# HOW TO RUN: python mentor_alerts.py
# SHOWS: full weekly alert report for every mentor
# ============================================================

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import os, joblib
from data_loader import load_students, FEATURES, GREEN, YELLOW, RED, BLUE, CHART_STYLE

plt.style.use("dark_background")
plt.rcParams.update(CHART_STYLE)

print("=" * 55)
print("  MENTOR ALERTS — MentorX")
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
df["primary_concern"]=df.apply(concern,axis=1)

total=len(df)
r_n=(df["predicted_risk"]=="Red").sum()
y_n=(df["predicted_risk"]=="Yellow").sum()
g_n=(df["predicted_risk"]=="Green").sum()

print()
print("╔" + "═"*53 + "╗")
print("║      MENTORX — WEEKLY MENTOR ALERTS               ║")
print("╚" + "═"*53 + "╝")
print(f"\n  Total  : {total}  |  🟢 {g_n}  🟡 {y_n}  🔴 {r_n}")

at_risk=df[df["predicted_risk"]!="Green"].sort_values("red_probability",ascending=False)
mc=next((c for c in ["mentor","mentor_id"] if c in df.columns),None)

if len(at_risk)==0:
    print("\n  ✅ All students are Green — no alerts this week!")
elif mc:
    for mentor,grp in at_risk.groupby(mc):
        reds=(grp["predicted_risk"]=="Red").sum()
        yels=(grp["predicted_risk"]=="Yellow").sum()
        print(f"\n{'─'*55}")
        print(f"  📧 {mentor}")
        print(f"     {reds} Red alert(s) · {yels} Yellow alert(s)")
        print(f"{'─'*55}")
        for _,row in grp.iterrows():
            icon="🔴" if row["predicted_risk"]=="Red" else "🟡"
            arrow="↓" if row["predicted_next_cgpa"]<row["cgpa"] else "↑"
            name=row.get("name","Unknown")
            roll=row.get("roll_no","N/A")
            dept=row.get("department","")
            c=row["primary_concern"]
            print(f"\n  {icon} {name} ({roll}) — {dept}")
            print(f"     Risk         : {row['predicted_risk']}")
            print(f"     CGPA         : {row['cgpa']} → {row['predicted_next_cgpa']} {arrow}")
            print(f"     Attendance   : {row['attendance']}%")
            print(f"     Mood Score   : {row['mood_score']}/5")
            print(f"     Backlogs     : {row['backlog_count']}")
            print(f"     Placement    : {row.get('placement_status','N/A')}")
            print(f"     Resource need: {row.get('resource_needed','N/A')}")
            print(f"     Red prob     : {row['red_probability']}%")
            if row["predicted_risk"]=="Red":
                actions={"CGPA":f"Arrange academic support — CGPA {row['cgpa']} is critical.",
                         "Attendance":f"Call student — Attendance {row['attendance']}% is very low.",
                         "Mood":f"Refer to counselor — Mood {row['mood_score']}/5."}
            else:
                actions={"CGPA":f"Share study material — CGPA {row['cgpa']} needs improvement.",
                         "Attendance":f"Send attendance reminder.",
                         "Mood":f"Have an informal check-in conversation."}
            print(f"     ⚡ Action    : {actions.get(c,'Schedule a meeting.')}")

df.to_csv("weekly_alerts_report.csv",index=False)
print(f"\n\nFull report saved → weekly_alerts_report.csv")

# Charts
fig,axes=plt.subplots(1,3,figsize=(17,5))
fig.suptitle(f"Mentor Alert Dashboard — {total} students",fontsize=14,color="#c9d1d9",fontweight="bold")
axes[0].pie([g_n,y_n,r_n],colors=[GREEN,YELLOW,RED],
            labels=[f"Green\n{g_n}",f"Yellow\n{y_n}",f"Red\n{r_n}"],
            startangle=90,wedgeprops=dict(width=0.55),
            textprops={"color":"#c9d1d9","fontsize":11})
axes[0].set_title("Risk Overview",color="#c9d1d9")
axes[1].hist(df["red_probability"],bins=min(20,len(df)),color=BLUE,edgecolor="#0d1117",alpha=0.85)
axes[1].axvline(50,color=RED,linestyle="--",lw=2,label="50%")
axes[1].set_title("Red Probability Distribution",color="#c9d1d9")
axes[1].set_xlabel("Red Probability %"); axes[1].set_ylabel("Students")
axes[1].legend(facecolor="#161b22",labelcolor="#c9d1d9",fontsize=9)
if mc and df[mc].nunique()>1:
    mn=at_risk[mc].unique()
    rd=[int((at_risk[at_risk[mc]==m]["predicted_risk"]=="Red").sum()) for m in mn]
    yl=[int((at_risk[at_risk[mc]==m]["predicted_risk"]=="Yellow").sum()) for m in mn]
    x=np.arange(len(mn)); w=0.3
    axes[2].bar(x-w/2,rd,w,color=RED,label="Red",edgecolor="none")
    axes[2].bar(x+w/2,yl,w,color=YELLOW,label="Yellow",edgecolor="none")
    axes[2].set_xticks(x)
    axes[2].set_xticklabels([str(m).replace("Prof. ","") for m in mn],rotation=20,ha="right",fontsize=9)
    axes[2].set_title("Alerts per Mentor",color="#c9d1d9"); axes[2].set_ylabel("Students")
    axes[2].legend(facecolor="#161b22",labelcolor="#c9d1d9")
else:
    axes[2].text(0.5,0.5,"Need multiple mentors",ha="center",va="center",
                 color="#8b949e",fontsize=12,transform=axes[2].transAxes)
    axes[2].set_title("Alerts per Mentor",color="#c9d1d9")

plt.tight_layout()
plt.savefig("mentor_alerts.png",dpi=150,bbox_inches="tight")
print("Saved → mentor_alerts.png")
plt.show()