import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
import joblib

def label_risk(row):
    if (
        row["cgpa"] < 5.5 or
        row["attendance"] < 55 or
        row["mood_score"] <= 1 or
        row["backlog_count"] >= 3
    ):
        return 2
    elif (
        row["cgpa"] < 6.5 or
        row["attendance"] < 75 or
        row["mood_score"] <= 2 or
        row["backlog_count"] >= 1
    ):
        return 1
    return 0

def train():
    np.random.seed(42)

    n = 150

    df = pd.DataFrame({
        "cgpa": np.random.uniform(4, 9, n),
        "attendance": np.random.uniform(40, 100, n),
        "mood_score": np.random.randint(1, 6, n),
        "backlog_count": np.random.randint(0, 5, n),
        "placement_status": np.random.choice([0, 1], n)
    })

    df["risk"] = df.apply(label_risk, axis=1)

    X = df[["cgpa", "attendance", "mood_score", "backlog_count", "placement_status"]]
    y = df["risk"]

    model = RandomForestClassifier(n_estimators=100)
    model.fit(X, y)

    joblib.dump(model, "risk_model.pkl")
    print("Model ready")

if __name__ == "__main__":
    train()