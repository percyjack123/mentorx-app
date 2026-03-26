import matplotlib.pyplot as plt

def run(df):
    print("\nAttendance Analysis:\n")
    print(df[["name", "attendance"]])

    plt.figure()
    plt.hist(df["attendance"], bins=10)
    plt.title("Attendance Distribution")
    plt.savefig("attendance_analysis.png")