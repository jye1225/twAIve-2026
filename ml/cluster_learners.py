"""Discover learner response patterns without requiring expert labels."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

MINIMUM_SAMPLES = 50
PRINCIPLE_FEATURES = [
    "human_centeredness_score", "privacy_score", "fairness_score",
    "responsibility_score", "safety_score", "reliability_score",
    "transparency_score",
]
NUMERIC_FEATURES = PRINCIPLE_FEATURES + [
    "average_response_seconds", "reflection_delta", "risk_rate", "proactive_rate",
]
CATEGORICAL_FEATURES = ["dominant_reason"]
CONSENT = "analytics_consent"
TEACHING_GUIDES = {
    "human_centeredness_score": "AI에게 맡길 일과 사람이 판단할 일을 구분하는 활동",
    "privacy_score": "개인정보 사용 전 동의 대상과 공개 범위를 확인하는 역할극",
    "fairness_score": "AI 결과로 불리해지는 사람과 이유를 비교하는 토론",
    "responsibility_score": "신고부터 피해 회복과 재발 방지까지 후속 행동을 설계하는 활동",
    "safety_score": "공유 전에 예상 가능한 피해와 중단 행동을 찾는 활동",
    "reliability_score": "AI 답변을 원문과 다른 출처에 대조하는 활동",
    "transparency_score": "AI가 만든 부분과 사람이 확인한 부분을 구분해 표시하는 활동",
}


def load_dependencies() -> None:
    global joblib, pd, ColumnTransformer, SimpleImputer, KMeans
    global silhouette_score, Pipeline, OneHotEncoder, StandardScaler
    import joblib
    import pandas as pd
    from sklearn.cluster import KMeans
    from sklearn.compose import ColumnTransformer
    from sklearn.impute import SimpleImputer
    from sklearn.metrics import silhouette_score
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder, StandardScaler


def validate_dataset(frame: pd.DataFrame) -> pd.DataFrame:
    required = set(NUMERIC_FEATURES + CATEGORICAL_FEATURES + [CONSENT])
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"필수 열이 없습니다: {', '.join(missing)}")
    consented = frame[
        frame[CONSENT].astype(str).str.lower().isin({"true", "1", "yes"})
    ].copy()
    if len(consented) < MINIMUM_SAMPLES:
        raise ValueError(
            f"동의하고 분석 조건을 충족한 기록이 {len(consented)}건입니다. "
            f"파일럿 기준 {MINIMUM_SAMPLES}건 전에는 군집분석을 실행하지 않습니다."
        )
    return consented


def preprocessing_pipeline() -> ColumnTransformer:
    numeric = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler", StandardScaler()),
    ])
    categorical = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore")),
    ])
    return ColumnTransformer([
        ("numeric", numeric, NUMERIC_FEATURES),
        ("categorical", categorical, CATEGORICAL_FEATURES),
    ])


def choose_cluster_count(matrix) -> int:
    scored = []
    for cluster_count in range(2, min(5, len(matrix) - 1) + 1):
        model = KMeans(n_clusters=cluster_count, n_init=20, random_state=42)
        labels = model.fit_predict(matrix)
        scored.append((silhouette_score(matrix, labels), cluster_count))
    return max(scored)[1]


def cluster_summary(frame: pd.DataFrame) -> list[dict[str, object]]:
    summaries = []
    for cluster_id, group in frame.groupby("cluster"):
        means = {column: round(float(group[column].mean()), 1) for column in PRINCIPLE_FEATURES}
        weakest = min(means, key=means.get)
        summaries.append({
            "cluster": int(cluster_id),
            "learners": int(len(group)),
            "weakestPrinciple": weakest.removesuffix("_score"),
            "weakestPrincipleScore": means[weakest],
            "averageRiskRate": round(float(group["risk_rate"].mean()), 3),
            "averageReflectionDelta": round(float(group["reflection_delta"].mean()), 2),
            "teachingGuide": TEACHING_GUIDES[weakest],
        })
    return summaries


def analyze(data_path: Path, output_dir: Path) -> dict[str, object]:
    load_dependencies()
    frame = validate_dataset(pd.read_csv(data_path))
    feature_columns = NUMERIC_FEATURES + CATEGORICAL_FEATURES
    preprocessor = preprocessing_pipeline()
    matrix = preprocessor.fit_transform(frame[feature_columns])
    cluster_count = choose_cluster_count(matrix)
    model = KMeans(n_clusters=cluster_count, n_init=20, random_state=42)
    frame["cluster"] = model.fit_predict(matrix)

    output_dir.mkdir(parents=True, exist_ok=True)
    frame.drop(columns=[CONSENT]).to_csv(
        output_dir / "learner_clusters.csv", index=False, encoding="utf-8-sig"
    )
    result = {
        "modelType": "k-means exploratory clustering",
        "sampleCount": int(len(frame)),
        "clusterCount": int(cluster_count),
        "purpose": "비슷한 판단 패턴을 찾아 그룹별 AI 윤리 지도 활동을 제안",
        "clusters": cluster_summary(frame),
    }
    (output_dir / "cluster_summary.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    joblib.dump(
        {"preprocessor": preprocessor, "clusterer": model, "features": feature_columns},
        output_dir / "learner_clusterer.joblib",
    )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="twAIve 학습자 패턴 군집분석")
    parser.add_argument("data", type=Path, help="동의한 익명 학습 기록 CSV")
    parser.add_argument("--output", type=Path, default=Path("ml/artifacts"))
    args = parser.parse_args()
    print(json.dumps(analyze(args.data, args.output), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
