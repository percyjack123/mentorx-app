import matplotlib.pyplot as plt

def run(df):
    print("\nAcademic Progress:\n")
    print(df[["name", "cgpa", "risk_level"]])

    plt.figure()
    plt.hist(df["cgpa"], bins=10)
    plt.title("CGPA Distribution")
    plt.savefig("academic_progress.png")