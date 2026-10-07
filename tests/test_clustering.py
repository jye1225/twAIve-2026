import importlib.util
from pathlib import Path
import tempfile
import unittest

import numpy as np
import pandas as pd

SPEC = importlib.util.spec_from_file_location("cluster", Path(__file__).parents[1] / "ml/cluster_learners.py")
cluster = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(cluster)
cluster.load_dependencies()


def dataset():
    rows = []
    for index in range(50):
        rows.append({
            "learner_id": f"random-{index}", "completed": True, "scoring_version": 3,
            "analytics_consent": True, "dominant_reason": "rights",
            "average_response_seconds": 2, "reflection_delta": 1,
            "risk_rate": 0.1, "proactive_rate": 0.5,
            **{key: (20 if index < 25 else 80) for key in cluster.PRINCIPLE_FEATURES},
        })
    return pd.DataFrame(rows)


class ClusteringChecks(unittest.TestCase):
    def test_independent_consented_completed_current_records(self):
        frame = dataset()
        self.assertEqual(len(cluster.validate_dataset(frame)), 50)
        for column, value in [("completed", False), ("scoring_version", 2), ("analytics_consent", False)]:
            changed = frame.copy()
            changed.loc[0, column] = value
            with self.assertRaises(ValueError):
                cluster.validate_dataset(changed)
        frame.loc[1, "learner_id"] = frame.loc[0, "learner_id"]
        with self.assertRaises(ValueError):
            cluster.validate_dataset(frame)

    def test_missing_nonfinite_and_out_of_range(self):
        for column, value in [("privacy_score", -1), ("safety_score", 101), ("risk_rate", 2), ("reflection_delta", 5), ("average_response_seconds", -1), ("dominant_reason", "unknown"), ("privacy_score", float("nan")), ("privacy_score", float("inf"))]:
            frame = dataset()
            if column in cluster.NUMERIC_FEATURES:
                frame[column] = frame[column].astype(float)
            frame.loc[0, column] = value
            with self.assertRaises(ValueError, msg=f"{column}: {value}"):
                cluster.validate_dataset(frame)

    def test_identical_patterns(self):
        with self.assertRaisesRegex(ValueError, "서로 다른"):
            cluster.choose_cluster_count(np.zeros((50, 4)))

    def test_no_extra_personal_data_in_artifacts(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as directory:
            directory = Path(directory)
            self.assertTrue(directory.resolve().is_relative_to(Path(__file__).resolve().parent))
            frame = dataset()
            frame["email"] = "never-export@example.invalid"
            frame.to_csv(directory / "input.csv", index=False)
            result = cluster.analyze(directory / "input.csv", directory / "output")
            self.assertEqual(result["sampleCount"], 50)
            self.assertEqual(result["clusterCount"], 2)
            exported = pd.read_csv(directory / "output/learner_clusters.csv")
            self.assertNotIn("email", exported)
            self.assertNotIn("learner_id", exported)


if __name__ == "__main__":
    unittest.main()
