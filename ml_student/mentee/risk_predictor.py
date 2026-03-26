import joblib

def apply_model(df):
    model = joblib.load("risk_model.pkl")

    X = df[["cgpa", "attendance", "mood_score", "backlog_count", "placement_status"]]

    preds = model.predict(X)

    label_map = {0: "Green", 1: "Yellow", 2: "Red"}

    df["risk_level"] = [label_map[p] for p in preds]

    return df