from data_loader import load_students
from risk_predictor import apply_model

import academic_progress
import attendance_analysis
import mentor_alerts

def main():
    df = load_students()

    df = apply_model(df)

    print("\nFinal Output:\n")
    print(df.head())

    academic_progress.run(df)
    attendance_analysis.run(df)
    mentor_alerts.run(df)

if __name__ == "__main__":
    main()