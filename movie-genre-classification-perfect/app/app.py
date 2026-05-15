"""Streamlit frontend for the Movie Genre Classification System."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import streamlit as st


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = PROJECT_ROOT / "src"
MODELS_DIR = PROJECT_ROOT / "models"
SCREENSHOTS_DIR = PROJECT_ROOT / "screenshots"
sys.path.append(str(SRC_DIR))

from predict import load_metadata, predict_genre  # type: ignore  # noqa: E402


st.set_page_config(
    page_title="Movie Genre Classification System",
    page_icon="ML",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');
        
        html, body, [class*="css"] {
            font-family: 'Outfit', sans-serif;
        }

        .stApp {
            background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
            color: #f8fafc;
        }
        .main-title {
            font-size: 2.7rem;
            font-weight: 800;
            color: #f8fafc;
            margin-bottom: 0.35rem;
        }
        .subtitle {
            color: #cbd5e1;
            font-size: 1.05rem;
            margin-bottom: 1.5rem;
        }
        .prediction-box {
            border: 1px solid rgba(148, 163, 184, 0.35);
            background: rgba(15, 23, 42, 0.72);
            border-radius: 8px;
            padding: 1.25rem;
            margin-top: 1rem;
        }
        .genre-label {
            color: #38bdf8;
            font-size: 2rem;
            font-weight: 800;
            text-transform: capitalize;
        }
        .metric-card {
            border: 1px solid rgba(148, 163, 184, 0.24);
            background: rgba(15, 23, 42, 0.55);
            border-radius: 8px;
            padding: 1rem;
        }
        div.stButton > button {
            width: 100%;
            border-radius: 8px;
            border: 0;
            background: #38bdf8;
            color: #082f49;
            font-weight: 800;
        }
    </style>
    """,
    unsafe_allow_html=True,
)


SAMPLES = {
    "Sci-fi adventure": "A crew of astronauts travels through a wormhole to save humanity from a dying Earth.",
    "Romantic drama": "Two artists fall in love in a coastal town while confronting family expectations and loss.",
    "Crime thriller": "A retired detective follows a trail of coded messages left by a serial killer.",
    "Comedy": "A nervous wedding planner accidentally swaps two ceremonies and tries to fix everything before sunset.",
}


def render_sidebar() -> None:
    """Show model metadata and generated project visualizations."""
    st.sidebar.header("Model Details")
    metadata = load_metadata()
    if metadata:
        st.sidebar.write(f"Best model: **{metadata.get('best_model', 'Unknown')}**")
        st.sidebar.write(f"Accuracy: **{metadata.get('accuracy', 0):.2%}**")
        st.sidebar.write(f"Training rows: **{metadata.get('dataset_rows', 0):,}**")
    else:
        st.sidebar.warning("Model metadata not found. Train the model first.")

    st.sidebar.header("Visualizations")
    comparison_chart = SCREENSHOTS_DIR / "model_accuracy_comparison.png"
    genre_chart = SCREENSHOTS_DIR / "genre_distribution.png"
    if comparison_chart.exists():
        st.sidebar.image(str(comparison_chart), caption="Model accuracy comparison")
    if genre_chart.exists():
        st.sidebar.image(str(genre_chart), caption="Genre distribution")


def main() -> None:
    render_sidebar()

    hero_path = SCREENSHOTS_DIR / "hero_banner.png"
    if hero_path.exists():
        st.image(str(hero_path), use_container_width=True)

    st.markdown('<div class="main-title">🎬 Movie Genre Classification System</div>', unsafe_allow_html=True)
    st.markdown(
        '<div class="subtitle">Predict a movie genre from a plot summary using TF-IDF and classical NLP models.</div>',
        unsafe_allow_html=True,
    )

    left, right = st.columns([1.25, 0.75], gap="large")

    with left:
        sample_name = st.selectbox("Try a sample description", ["Custom"] + list(SAMPLES.keys()))
        default_text = "" if sample_name == "Custom" else SAMPLES[sample_name]
        plot_summary = st.text_area(
            "Movie plot summary",
            value=default_text,
            height=220,
            placeholder="Enter a plot summary, synopsis, or movie description...",
        )

        predict_clicked = st.button("Predict Genre", type="primary")

        if predict_clicked:
            if not plot_summary.strip():
                st.warning("Please enter a movie plot summary.")
            elif not (MODELS_DIR / "model.pkl").exists():
                st.error("Model files are missing. Run `python src/train_model.py` first.")
            else:
                result = predict_genre(plot_summary)
                st.markdown(
                    f"""
                    <div class="prediction-box" style="text-align: center; padding: 2.5rem; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37); backdrop-filter: blur(4px);">
                        <div style="font-size: 1rem; color: #cbd5e1; text-transform: uppercase; letter-spacing: 3px;">Predicted Genre</div>
                        <div class="genre-label" style="font-size: 3.5rem; margin: 15px 0; text-shadow: 0 0 20px rgba(56, 189, 248, 0.5);">{result["genre"]}</div>
                    </div>
                    """,
                    unsafe_allow_html=True,
                )
                
                st.markdown("<br>", unsafe_allow_html=True)
                st.metric(label="Model Confidence Score", value=f"{result['confidence']:.2%}")

                top_df = pd.DataFrame(result["top_predictions"])
                top_df["confidence"] = top_df["confidence"].map(lambda value: f"{value:.2%}")
                st.subheader("🔥 Top 3 Predictions")
                st.dataframe(top_df, hide_index=True, use_container_width=True)

    with right:
        st.subheader("Evaluation")
        report_path = MODELS_DIR / "classification_report.txt"
        if report_path.exists():
            st.text(report_path.read_text(encoding="utf-8"))
        else:
            st.info("Classification report appears after training.")

        confusion_matrix_path = SCREENSHOTS_DIR / "confusion_matrix.png"
        if confusion_matrix_path.exists():
            st.image(str(confusion_matrix_path), caption="Confusion matrix")


if __name__ == "__main__":
    main()
