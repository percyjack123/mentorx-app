# ============================================================
# ml_model.py
# ============================================================
# WHAT THIS FILE DOES:
# Trains two ML models using student data.
# Works with or without real students.
#
# HOW TO RUN: python ml_model.py
# RUN THIS FIRST before other files.
# ============================================================

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import numpy as np
import joblib
from collections import Counter

from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import (classification_report, accuracy_score,
                              confusion_matrix, mean_absolute_error)

from data_loader import (load_students, FEATURES, GREEN,
                          YELLOW, RED, BLUE, CHART_STYLE)

plt.style.use("dark_background")
plt.rcParams.update(CHART_STYLE)

print("=" * 55)
print("  ML MODEL TRAINING — MentorX")
print("=" * 55)

df, status = load_students()
print(f"\nData source : {status}")
print(f"Students    : {len(df)}")

# ── Prepare inputs ──
X      = df[FEATURES]
y_risk = df["risk_encoded"]
np.random.seed(42)
y_cgpa = (df["cgpa"]*0.70 + df["attendance"]*0.02 +
          df["mood_score"]*0.12 +
          np.random.normal(0, 0.2, len(df))).clip(0, 10).round(2)

# ── Normalize features ──
# StandardScaler makes all features same scale
# So CGPA (0-10) and mood (1-5) are treated equally
scaler   = StandardScaler()
X_scaled = scaler.fit_transform(X)

# ── Train/Test split ──
if len(df) >= 20:
    X_tr, X_te, yr_tr, yr_te = train_test_split(
        X_scaled, y_risk, test_size=0.2, random_state=42, stratify=y_risk)
    _,    _,    yc_tr, yc_te = train_test_split(
        X_scaled, y_cgpa, test_size=0.2, random_state=42)
else:
    X_tr = X_te = X_scaled
    yr_tr = yr_te = y_risk
    yc_tr = yc_te = y_cgpa

print(f"Training set: {len(X_tr)} | Testing set: {len(X_te)}")

# ── Model 1: Risk Classifier ──
# Random Forest = 100 decision trees voting together
# class_weight='balanced' = pays extra attention to rare Red students
clf = RandomForestClassifier(
    n_estimators=100, max_depth=10,
    class_weight="balanced", random_state=42, n_jobs=-1)
clf.fit(X_tr, yr_tr)

y_pred   = clf.predict(X_te)
accuracy = accuracy_score(yr_te, y_pred)
print(f"\nRisk Classifier Accuracy : {accuracy:.2%}")
print(classification_report(yr_te, y_pred,
      target_names=["Green","Yellow","Red"], zero_division=0))

# ── Model 2: CGPA Regressor ──
# Predicts a NUMBER (next semester CGPA)
reg = RandomForestRegressor(n_estimators=100, max_depth=10,
                             random_state=42, n_jobs=-1)
reg.fit(X_tr, yc_tr)
mae = mean_absolute_error(yc_te, reg.predict(X_te))
print(f"CGPA Regressor MAE : {mae:.3f} CGPA points")

# ── Feature Importance ──
fi = sorted(zip(FEATURES, clf.feature_importances_), key=lambda x: -x[1])
print("\nFeature Importance (what drives risk prediction):")
for feat, imp in fi:
    print(f"  {feat:<25} {imp:.3f}  {'█'*int(imp*80)}")

# ── Save Models ──
joblib.dump(clf,    "risk_classifier.pkl")
joblib.dump(reg,    "cgpa_regressor.pkl")
joblib.dump(scaler, "scaler.pkl")
print("\nSaved: risk_classifier.pkl  cgpa_regressor.pkl  scaler.pkl")
print("Now run: python mentor_risk_analysis.py")

# ── Charts ──
print("\nGenerating charts...")
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle(f"ML Model Results — {len(df)} students ({status} data)",
             fontsize=14, color="#c9d1d9", fontweight="bold")

# Confusion matrix
cm = confusion_matrix(yr_te, y_pred, labels=[0,1,2])
sns.heatmap(cm, annot=True, fmt="d", cmap="Blues",
            xticklabels=["Green","Yellow","Red"],
            yticklabels=["Green","Yellow","Red"],
            linewidths=0.5, ax=axes[0,0], annot_kws={"size":13})
axes[0,0].set_title(f"Confusion Matrix (Acc={accuracy:.2%})", color="#c9d1d9")
axes[0,0].set_ylabel("Actual")
axes[0,0].set_xlabel("Predicted")

# Feature importance
feats = [f for f,_ in fi]
imps  = [i for _,i in fi]
bc    = [RED if v==max(imps) else BLUE for v in imps]
bars  = axes[0,1].barh(feats[::-1], imps[::-1], color=bc[::-1],
                        edgecolor="none", height=0.55)
for bar, val in zip(bars, imps[::-1]):
    axes[0,1].text(val+0.002, bar.get_y()+bar.get_height()/2,
                   f"{val:.3f}", va="center", color="#c9d1d9", fontsize=10)
axes[0,1].set_title("Feature Importance", color="#c9d1d9")

# Actual vs Predicted CGPA
yc_pred_plot = reg.predict(X_te)
axes[1,0].scatter(yc_te, yc_pred_plot, alpha=0.5,
                  color=BLUE, s=30, edgecolors="none")
lo = min(float(yc_te.min()), yc_pred_plot.min())
hi = max(float(yc_te.max()), yc_pred_plot.max())
axes[1,0].plot([lo,hi],[lo,hi],"r--",lw=1.5,label="Perfect prediction")
axes[1,0].set_xlabel("Actual CGPA")
axes[1,0].set_ylabel("Predicted CGPA")
axes[1,0].set_title(f"CGPA Prediction (MAE={mae:.3f})", color="#c9d1d9")
axes[1,0].legend(facecolor="#161b22", labelcolor="#c9d1d9", fontsize=9)

# Risk distribution
all_pred   = clf.predict(X_scaled)
pred_names = [["Green","Yellow","Red"][p] for p in all_pred]
pc         = Counter(pred_names)
axes[1,1].bar(["Green","Yellow","Red"],
              [pc.get("Green",0),pc.get("Yellow",0),pc.get("Red",0)],
              color=[GREEN,YELLOW,RED], edgecolor="none", width=0.5)
for i,(label,count) in enumerate(zip(
        ["Green","Yellow","Red"],
        [pc.get("Green",0),pc.get("Yellow",0),pc.get("Red",0)])):
    axes[1,1].text(i, count+0.2, str(count), ha="center",
                   color="#c9d1d9", fontsize=13, fontweight="bold")
axes[1,1].set_title("Predicted Risk — All Students", color="#c9d1d9")
axes[1,1].set_ylabel("Students")

plt.tight_layout()
plt.savefig("ml_model_results.png", dpi=150, bbox_inches="tight")
print("Saved → ml_model_results.png")
plt.show()