"""Prediction helpers for saved movie genre models."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np

from preprocess import clean_text


PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = PROJECT_ROOT / "models" / "model.pkl"
TFIDF_PATH = PROJECT_ROOT / "models" / "tfidf.pkl"
METADATA_PATH = PROJECT_ROOT / "models" / "model_metadata.json"


def load_artifacts(model_path: Path = MODEL_PATH, tfidf_path: Path = TFIDF_PATH) -> tuple[object, object]:
    """Load the trained classifier and TF-IDF vectorizer from disk."""
    if not model_path.exists() or not tfidf_path.exists():
        raise FileNotFoundError("Model artifacts not found. Run `python src/train_model.py` first.")
    return joblib.load(model_path), joblib.load(tfidf_path)


def load_metadata() -> dict[str, object]:
    """Load training metadata when available."""
    if METADATA_PATH.exists():
        return json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    return {}


def _decision_scores_to_probabilities(scores: np.ndarray) -> np.ndarray:
    """Convert classifier scores to probability-like confidence values."""
    scores = np.asarray(scores, dtype=float)
    if scores.ndim == 1:
        scores = np.vstack([-scores, scores]).T
    scores = scores - scores.max(axis=1, keepdims=True)
    exp_scores = np.exp(scores)
    return exp_scores / exp_scores.sum(axis=1, keepdims=True)


def predict_genre(text: str, top_k: int = 3) -> dict[str, object]:
    """Predict the most likely genre and top-k alternatives for a plot summary."""
    model, tfidf = load_artifacts()
    cleaned_text = clean_text(text)
    vector = tfidf.transform([cleaned_text])

    predicted_genre = model.predict(vector)[0]
    classes = getattr(model, "classes_", np.array([]))

    if hasattr(model, "predict_proba"):
        probabilities = model.predict_proba(vector)[0]
    elif hasattr(model, "decision_function"):
        probabilities = _decision_scores_to_probabilities(model.decision_function(vector))[0]
    else:
        probabilities = np.ones(len(classes)) / max(len(classes), 1)

    top_indices = probabilities.argsort()[::-1][:top_k]
    top_predictions = [
        {"genre": str(classes[index]), "confidence": float(probabilities[index])}
        for index in top_indices
    ]

    confidence = next(
        (item["confidence"] for item in top_predictions if item["genre"] == predicted_genre),
        float(probabilities.max()) if len(probabilities) else 0.0,
    )

    return {
        "genre": str(predicted_genre),
        "confidence": confidence,
        "top_predictions": top_predictions,
        "cleaned_text": cleaned_text,
    }


if __name__ == "__main__":
    sample = "A detective investigates a mysterious murder while racing against time in a dark city."
    print(predict_genre(sample))
