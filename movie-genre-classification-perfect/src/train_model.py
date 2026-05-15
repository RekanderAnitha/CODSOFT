"""Train and evaluate movie genre classification models."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("MPLCONFIGDIR", str(PROJECT_ROOT / ".cache" / "matplotlib"))
os.environ.setdefault("XDG_CACHE_HOME", str(PROJECT_ROOT / ".cache"))
os.environ.setdefault("MPLBACKEND", "Agg")

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC

from preprocess import clean_dataframe, load_dataset


MODELS_DIR = PROJECT_ROOT / "models"
SCREENSHOTS_DIR = PROJECT_ROOT / "screenshots"


def plot_genre_distribution(df: pd.DataFrame, output_path: Path) -> None:
    """Save a count plot showing the class distribution."""
    plt.figure(figsize=(12, 7))
    order = df["genre"].value_counts().index
    sns.countplot(data=df, y="genre", order=order, palette="viridis", hue="genre", legend=False)
    plt.title("Genre Distribution")
    plt.xlabel("Number of Movies")
    plt.ylabel("Genre")
    plt.tight_layout()
    plt.savefig(output_path, dpi=160)
    plt.close()


def plot_model_comparison(results: dict[str, float], output_path: Path) -> None:
    """Save a bar chart comparing model test accuracy."""
    plt.figure(figsize=(9, 5))
    names = list(results.keys())
    scores = [results[name] for name in names]
    sns.barplot(x=names, y=scores, palette="mako", hue=names, legend=False)
    plt.ylim(0, 1)
    plt.title("Model Accuracy Comparison")
    plt.ylabel("Accuracy")
    plt.xlabel("Model")
    for index, score in enumerate(scores):
        plt.text(index, score + 0.01, f"{score:.3f}", ha="center", fontweight="bold")
    plt.tight_layout()
    plt.savefig(output_path, dpi=160)
    plt.close()


def train_models(dataset_path: str | Path | None = None, test_size: float = 0.2) -> dict[str, object]:
    """Train all candidate models, save the best one, and return evaluation data."""
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)

    df = load_dataset(dataset_path)
    df = clean_dataframe(df)

    if df["genre"].nunique() < 2:
        raise ValueError("Training requires at least two genres.")

    plot_genre_distribution(df, SCREENSHOTS_DIR / "genre_distribution.png")

    class_count = df["genre"].nunique()
    test_rows = int(round(len(df) * test_size))
    train_rows = len(df) - test_rows
    can_stratify = df["genre"].value_counts().min() >= 2 and test_rows >= class_count and train_rows >= class_count
    stratify = df["genre"] if can_stratify else None
    x_train, x_test, y_train, y_test = train_test_split(
        df["clean_description"],
        df["genre"],
        test_size=test_size,
        random_state=42,
        stratify=stratify,
    )

    tfidf = TfidfVectorizer(max_features=50000, ngram_range=(1, 2), min_df=2)
    try:
        x_train_tfidf = tfidf.fit_transform(x_train)
    except ValueError:
        tfidf = TfidfVectorizer(max_features=50000, ngram_range=(1, 2), min_df=1)
        x_train_tfidf = tfidf.fit_transform(x_train)
    x_test_tfidf = tfidf.transform(x_test)

    models = {
        "Multinomial Naive Bayes": MultinomialNB(),
        "Logistic Regression": LogisticRegression(max_iter=1000, C=4.0),
        "Linear SVM": LinearSVC(C=1.0),
    }

    trained_models: dict[str, object] = {}
    accuracies: dict[str, float] = {}
    reports: dict[str, dict[str, object]] = {}
    predictions_by_model: dict[str, list[str]] = {}

    for name, model in models.items():
        model.fit(x_train_tfidf, y_train)
        predictions = model.predict(x_test_tfidf)
        trained_models[name] = model
        accuracies[name] = accuracy_score(y_test, predictions)
        reports[name] = classification_report(y_test, predictions, output_dict=True, zero_division=0)
        predictions_by_model[name] = predictions.tolist()

    best_model_name = max(accuracies, key=accuracies.get)
    best_model = trained_models[best_model_name]
    best_predictions = predictions_by_model[best_model_name]

    labels = sorted(df["genre"].unique())
    cm = confusion_matrix(y_test, best_predictions, labels=labels)
    plt.figure(figsize=(12, 9))
    sns.heatmap(cm, annot=False, cmap="Blues", xticklabels=labels, yticklabels=labels)
    plt.title(f"Confusion Matrix - {best_model_name}")
    plt.xlabel("Predicted Genre")
    plt.ylabel("Actual Genre")
    plt.tight_layout()
    plt.savefig(SCREENSHOTS_DIR / "confusion_matrix.png", dpi=160)
    plt.close()

    plot_model_comparison(accuracies, SCREENSHOTS_DIR / "model_accuracy_comparison.png")

    joblib.dump(best_model, MODELS_DIR / "model.pkl")
    joblib.dump(tfidf, MODELS_DIR / "tfidf.pkl")

    metadata = {
        "best_model": best_model_name,
        "accuracy": accuracies[best_model_name],
        "all_accuracies": accuracies,
        "classes": labels,
        "dataset_rows": int(len(df)),
    }
    (MODELS_DIR / "model_metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    report_text = classification_report(y_test, best_predictions, zero_division=0)
    (MODELS_DIR / "classification_report.txt").write_text(report_text, encoding="utf-8")
    pd.DataFrame({"model": accuracies.keys(), "accuracy": accuracies.values()}).to_csv(
        MODELS_DIR / "model_results.csv", index=False
    )

    return {
        "best_model": best_model_name,
        "accuracies": accuracies,
        "classification_report": report_text,
        "metadata": metadata,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train movie genre classification models.")
    parser.add_argument("--dataset", type=str, default=None, help="Optional path to Kaggle train_data.txt or CSV.")
    parser.add_argument("--test-size", type=float, default=0.2, help="Test split size.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    result = train_models(args.dataset, args.test_size)
    print(f"Best model: {result['best_model']}")
    print("Accuracies:")
    for model_name, score in result["accuracies"].items():
        print(f"  {model_name}: {score:.4f}")
