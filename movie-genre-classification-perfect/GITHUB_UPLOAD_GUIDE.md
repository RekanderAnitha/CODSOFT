# GitHub Upload Guide

## Recommended Upload

Use the GitHub-ready zip:

```text
movie-genre-classification-github.zip
```

This zip excludes:

- `.venv/`
- `.git/`
- `.cache/`
- `__pycache__/`
- raw Kaggle dataset file `dataset/train_data.txt`

The trained model files are included, so the Streamlit app can run immediately after installing dependencies.

## Commands

```bash
cd movie-genre-classification
git init
git branch -M main
git add .
git commit -m "Initial movie genre classification project"
git remote add origin https://github.com/YOUR_USERNAME/movie-genre-classification.git
git push -u origin main
```

## Train Again With Kaggle Dataset

Download the Kaggle dataset and place `train_data.txt` inside:

```text
dataset/train_data.txt
```

Then run:

```bash
pip install -r requirements.txt
python src/train_model.py --dataset dataset/train_data.txt
```

The `.gitignore` intentionally excludes `dataset/train_data.txt` so the raw dataset is not uploaded to GitHub.
