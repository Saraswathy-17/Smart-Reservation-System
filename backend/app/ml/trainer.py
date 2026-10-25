import os
import joblib
from pathlib import Path
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from app.ml.synthetic_data import generate_synthetic_reservation_data

FEATURE_COLUMNS = [
    "queue_position",
    "total_queue_length",
    "resource_capacity",
    "slot_duration_minutes",
    "hour_of_day",
    "day_of_week",
    "is_weekend",
    "cancellation_rate",
]

TARGET_COLUMN = "actual_wait_time_minutes"
ARTIFACTS_DIR = Path(__file__).parent / "artifacts"


def train_wait_time_model(n_samples: int = 3000) -> dict:
    """
    Trains and serializes the Gradient Boosting queue wait-time predictor.
    Returns performance metrics.
    """
    os.makedirs(ARTIFACTS_DIR, exist_ok=True)
    df = generate_synthetic_reservation_data(n_samples=n_samples)

    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = HistGradientBoostingRegressor(
        max_iter=150,
        learning_rate=0.08,
        max_depth=6,
        random_state=42,
    )
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    mae = float(mean_absolute_error(y_test, preds))
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    r2 = float(r2_score(y_test, preds))

    model_path = ARTIFACTS_DIR / "wait_time_model.joblib"
    joblib.dump(
        {
            "model": model,
            "features": FEATURE_COLUMNS,
            "metrics": {"mae": mae, "rmse": rmse, "r2": r2},
            "n_samples": n_samples,
        },
        model_path,
    )

    return {
        "status": "success",
        "model_path": str(model_path),
        "mae_minutes": round(mae, 2),
        "rmse_minutes": round(rmse, 2),
        "r2_score": round(r2, 4),
        "samples_trained": len(df),
    }


if __name__ == "__main__":
    results = train_wait_time_model()
    print("Training Complete:", results)
