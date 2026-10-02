"""Train and evaluate learner classifiers only from consented, expert-labeled data."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

MINIMUM_SAMPLES = 50
MINIMUM_SAMPLES_PER_CLASS = 10
NUMERIC_FEATURES = [
    "human_centeredness_score",
    "privacy_score",
    "fairness_score",
    "responsibility_score",
    "safety_score",
    "reliability_score",
    "transparency_score",
    "average_response_seconds",
    "reflection_delta",
    "risk_rate",
    "proactive_rate",
]
CATEGORICAL_FEATURES = ["dominant_reason"]
TARGET = "expert_label"
CONSENT = "analytics_consent"


def preflight_dataset(data_path: Path) -> None:
    with data_path.open("r", encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        required = set(NUMERIC_FEATURES + CATEGORICAL_FEATURES + [TARGET, CONSENT])
        missing = sorted(required - set(reader.fieldnames or []))
        if missing:
            raise ValueError(f"필수 열이 없습니다: {', '.join(missing)}")
        labels = Counter(
            row[TARGET].strip()
            for row in reader
            if row[CONSENT].strip().lower() in {"true", "1", "yes"} and row[TARGET].strip()
        )

    sample_count = sum(labels.values())
    if sample_count < MINIMUM_SAMPLES:
        raise ValueError(
            f"동의·전문가 라벨 데이터가 {sample_count}건입니다. "
            f"최소 {MINIMUM_SAMPLES}건 전에는 모델을 학습하지 않습니다."
        )
    if len(labels) < 2:
        raise ValueError("전문가 라벨이 두 종류 이상이어야 합니다.")
    rare = {label: count for label, count in labels.items() if count < MINIMUM_SAMPLES_PER_CLASS}
    if rare:
        details = ", ".join(f"{label}={count}" for label, count in rare.items())
        raise ValueError(f"클래스별 최소 {MINIMUM_SAMPLES_PER_CLASS}건이 필요합니다: {details}")


def load_ml_dependencies() -> None:
    global joblib, pd, ColumnTransformer, SimpleImputer, LogisticRegression
    global accuracy_score, confusion_matrix, f1_score, StratifiedKFold
    global cross_validate, train_test_split, Pipeline, OneHotEncoder
    global StandardScaler, DecisionTreeClassifier

    import joblib
    import pandas as pd
    from sklearn.compose import ColumnTransformer
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
    from sklearn.model_selection import StratifiedKFold, cross_validate, train_test_split
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder, StandardScaler
    from sklearn.tree import DecisionTreeClassifier


def validate_dataset(frame: pd.DataFrame) -> pd.DataFrame:
    required = set(NUMERIC_FEATURES + CATEGORICAL_FEATURES + [TARGET, CONSENT])
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"필수 열이 없습니다: {', '.join(missing)}")

    consented = frame[frame[CONSENT].astype(str).str.lower().isin({"true", "1", "yes"})].copy()
    consented = consented[consented[TARGET].notna() & consented[TARGET].astype(str).str.strip().ne("")]
    if len(consented) < MINIMUM_SAMPLES:
        raise ValueError(
            f"동의·전문가 라벨 데이터가 {len(consented)}건입니다. "
            f"최소 {MINIMUM_SAMPLES}건 전에는 모델을 학습하지 않습니다."
        )

    class_counts = consented[TARGET].value_counts()
    if len(class_counts) < 2:
        raise ValueError("전문가 라벨이 두 종류 이상이어야 합니다.")
    rare = class_counts[class_counts < MINIMUM_SAMPLES_PER_CLASS]
    if not rare.empty:
        details = ", ".join(f"{label}={count}" for label, count in rare.items())
        raise ValueError(
            f"클래스별 최소 {MINIMUM_SAMPLES_PER_CLASS}건이 필요합니다: {details}"
        )
    return consented


def preprocessing_pipeline() -> ColumnTransformer:
    numeric = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    categorical = Pipeline(
        [
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    return ColumnTransformer(
        [
            ("numeric", numeric, NUMERIC_FEATURES),
            ("categorical", categorical, CATEGORICAL_FEATURES),
        ]
    )


def candidate_models() -> dict[str, object]:
    return {
        "logistic_regression": LogisticRegression(
            max_iter=2000,
            class_weight="balanced",
            random_state=42,
        ),
        "decision_tree": DecisionTreeClassifier(
            max_depth=5,
            min_samples_leaf=5,
            class_weight="balanced",
            random_state=42,
        ),
    }


def train(data_path: Path, output_dir: Path) -> dict[str, object]:
    preflight_dataset(data_path)
    load_ml_dependencies()
    frame = validate_dataset(pd.read_csv(data_path))
    features = frame[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    labels = frame[TARGET].astype(str)
    x_train, x_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )
    folds = min(5, int(labels.value_counts().min()))
    cross_validation = StratifiedKFold(n_splits=folds, shuffle=True, random_state=42)
    reports: dict[str, object] = {}
    trained: dict[str, Pipeline] = {}

    for name, estimator in candidate_models().items():
        pipeline = Pipeline(
            [
                ("preprocess", preprocessing_pipeline()),
                ("classifier", estimator),
            ]
        )
        cv_result = cross_validate(
            pipeline,
            features,
            labels,
            cv=cross_validation,
            scoring={"accuracy": "accuracy", "macro_f1": "f1_macro"},
        )
        pipeline.fit(x_train, y_train)
        predictions = pipeline.predict(x_test)
        reports[name] = {
            "test_accuracy": round(float(accuracy_score(y_test, predictions)), 4),
            "test_macro_f1": round(float(f1_score(y_test, predictions, average="macro")), 4),
            "cv_accuracy_mean": round(float(cv_result["test_accuracy"].mean()), 4),
            "cv_macro_f1_mean": round(float(cv_result["test_macro_f1"].mean()), 4),
        }
        trained[name] = pipeline

    selected_name = max(reports, key=lambda name: reports[name]["cv_macro_f1_mean"])
    selected = trained[selected_name]
    selected.fit(x_train, y_train)
    selected_predictions = selected.predict(x_test)
    label_order = sorted(labels.unique())
    matrix = confusion_matrix(y_test, selected_predictions, labels=label_order)

    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(selected, output_dir / "learner_classifier.joblib")
    pd.DataFrame(matrix, index=label_order, columns=label_order).to_csv(
        output_dir / "confusion_matrix.csv",
        encoding="utf-8-sig",
    )
    report = {
        "dataset": {
            "rows": len(frame),
            "labels": frame[TARGET].value_counts().to_dict(),
            "consent_required": True,
            "split": "stratified 80/20",
            "cross_validation_folds": folds,
        },
        "models": reports,
        "selected_model": selected_name,
        "confusion_matrix_labels": label_order,
    }
    (output_dir / "metrics.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("data", type=Path, help="동의 및 전문가 라벨이 포함된 CSV")
    parser.add_argument("--output", type=Path, default=Path("ml/artifacts"))
    args = parser.parse_args()
    print(json.dumps(train(args.data, args.output), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
