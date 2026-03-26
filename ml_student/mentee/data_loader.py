import pandas as pd
import numpy as np

def load_students():
    np.random.seed(10)

    n = 30

    df = pd.DataFrame({
        "name": [f"Student_{i}" for i in range(n)],
        "cgpa": np.round(np.random.uniform(4, 9, n), 2),
        "attendance": np.round(np.random.uniform(50, 100, n), 2),
        "mood_score": np.random.randint(1, 6, n),
        "backlog_count": np.random.randint(0, 4, n),
        "placement_status": np.random.choice([0, 1], n)
    })

    return df
