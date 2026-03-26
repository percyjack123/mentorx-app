def run(df):
    print("\nMentor Alerts:\n")

    for _, row in df.iterrows():

        if row["risk_level"] == "Red":
            print(f"{row['name']} → Immediate intervention required")

        elif row["risk_level"] == "Yellow":
            print(f"{row['name']} → Needs monitoring")

        if row["mood_score"] <= 1:
            print(f"{row['name']} → Welfare check required")