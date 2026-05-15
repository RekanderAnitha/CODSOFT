"""Text preprocessing utilities for the Movie Genre Classification project."""

from __future__ import annotations

import re
import string
from functools import lru_cache
from pathlib import Path
from typing import Iterable

import nltk
import pandas as pd
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize, wordpunct_tokenize


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATASET_DIR = PROJECT_ROOT / "dataset"

FALLBACK_STOPWORDS = {
    "a",
    "about",
    "above",
    "after",
    "again",
    "against",
    "all",
    "am",
    "an",
    "and",
    "any",
    "are",
    "as",
    "at",
    "be",
    "because",
    "been",
    "before",
    "being",
    "below",
    "between",
    "both",
    "but",
    "by",
    "can",
    "did",
    "do",
    "does",
    "doing",
    "down",
    "during",
    "each",
    "few",
    "for",
    "from",
    "further",
    "had",
    "has",
    "have",
    "having",
    "he",
    "her",
    "here",
    "hers",
    "herself",
    "him",
    "himself",
    "his",
    "how",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "itself",
    "just",
    "me",
    "more",
    "most",
    "my",
    "myself",
    "no",
    "nor",
    "not",
    "now",
    "of",
    "off",
    "on",
    "once",
    "only",
    "or",
    "other",
    "our",
    "ours",
    "ourselves",
    "out",
    "over",
    "own",
    "same",
    "she",
    "should",
    "so",
    "some",
    "such",
    "than",
    "that",
    "the",
    "their",
    "theirs",
    "them",
    "themselves",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "through",
    "to",
    "too",
    "under",
    "until",
    "up",
    "very",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "who",
    "whom",
    "why",
    "will",
    "with",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves",
}


@lru_cache(maxsize=1)
def get_stopwords() -> set[str]:
    """Return cached English stop words with an offline-safe fallback."""
    try:
        return set(stopwords.words("english"))
    except LookupError:
        return FALLBACK_STOPWORDS


def ensure_tokenizer() -> None:
    """Check whether optional NLTK tokenizers are available."""
    for resource in ("punkt", "punkt_tab"):
        try:
            nltk.data.find(f"tokenizers/{resource}")
        except LookupError:
            return


def clean_text(text: object) -> str:
    """Lowercase, remove punctuation/noise, tokenize, and remove stop words."""
    ensure_tokenizer()
    stop_words = get_stopwords()

    text = "" if pd.isna(text) else str(text)
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = text.translate(str.maketrans("", "", string.punctuation))
    text = re.sub(r"\d+", " ", text)
    text = re.sub(r"\s+", " ", text).strip()

    try:
        tokens = word_tokenize(text)
    except LookupError:
        tokens = wordpunct_tokenize(text)
    tokens = [token for token in tokens if token.isalpha() and token not in stop_words]
    return " ".join(tokens)


def _read_kaggle_text_file(path: Path) -> pd.DataFrame:
    """Read the IMDb Genre Classification text files from Kaggle."""
    rows: list[dict[str, str]] = []
    with path.open("r", encoding="utf-8", errors="ignore") as file:
        for line in file:
            parts = [part.strip() for part in line.split(" ::: ")]
            if len(parts) >= 4:
                rows.append(
                    {
                        "movie_id": parts[0],
                        "title": parts[1],
                        "genre": parts[2],
                        "description": parts[3],
                    }
                )
            elif len(parts) >= 3:
                rows.append(
                    {
                        "movie_id": parts[0],
                        "title": parts[1],
                        "genre": "",
                        "description": parts[2],
                    }
                )
    return pd.DataFrame(rows)


def _normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Map common dataset column names to genre and description."""
    column_map = {column.lower().strip(): column for column in df.columns}

    genre_candidates = ("genre", "genres", "label", "class", "target")
    text_candidates = ("description", "plot", "plot_summary", "summary", "overview", "text")

    genre_column = next((column_map[name] for name in genre_candidates if name in column_map), None)
    text_column = next((column_map[name] for name in text_candidates if name in column_map), None)

    if genre_column is None or text_column is None:
        raise ValueError(
            "Dataset must contain genre and plot/description columns. "
            f"Found columns: {list(df.columns)}"
        )

    return df.rename(columns={genre_column: "genre", text_column: "description"})


def find_dataset_file(dataset_dir: Path = DATASET_DIR) -> Path:
    """Find a likely training dataset file in the dataset directory."""
    preferred_names = (
        "train_data.txt",
        "train_data.csv",
        "Genre Classification Dataset/train_data.txt",
        "sample_movies.csv",
    )

    for name in preferred_names:
        candidate = dataset_dir / name
        if candidate.exists():
            return candidate

    candidates = [
        *dataset_dir.rglob("*.csv"),
        *dataset_dir.rglob("*.txt"),
        *dataset_dir.rglob("*.tsv"),
    ]
    if not candidates:
        raise FileNotFoundError(
            f"No dataset found in {dataset_dir}. Add Kaggle train_data.txt or a CSV with genre and description columns."
        )
    return candidates[0]


def load_dataset(dataset_path: str | Path | None = None) -> pd.DataFrame:
    """Load the IMDb genre dataset and return clean genre/description columns."""
    path = Path(dataset_path) if dataset_path else find_dataset_file()

    if path.suffix.lower() == ".txt":
        df = _read_kaggle_text_file(path)
    elif path.suffix.lower() == ".tsv":
        df = pd.read_csv(path, sep="\t")
    else:
        df = pd.read_csv(path)

    df = _normalise_columns(df)
    df = df[["genre", "description"]].dropna()
    df["genre"] = df["genre"].astype(str).str.lower().str.strip()
    df["description"] = df["description"].astype(str).str.strip()
    df = df[(df["genre"] != "") & (df["description"] != "")]
    return df.drop_duplicates().reset_index(drop=True)


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Add a cleaned text column for training and inference."""
    cleaned_df = df.copy()
    cleaned_df["clean_description"] = cleaned_df["description"].apply(clean_text)
    cleaned_df = cleaned_df[cleaned_df["clean_description"].str.len() > 0]
    return cleaned_df.reset_index(drop=True)


def clean_many(texts: Iterable[str]) -> list[str]:
    """Clean multiple input strings for vectorized prediction."""
    return [clean_text(text) for text in texts]
