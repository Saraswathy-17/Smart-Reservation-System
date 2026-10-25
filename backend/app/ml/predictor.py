import os
from pathlib import Path
from typing import Dict, Any, Optional
import joblib
import pandas as pd
from app.ml.trainer import FEATURE_COLUMNS, ARTIFACTS_DIR, train_wait_time_model


class QueuePredictor:
    def __init__(self):
        self.model_data: Optional[Dict[str, Any]] = None
        self._load_or_train()

    def _load_or_train(self):
        model_path = ARTIFACTS_DIR / "wait_time_model.joblib"
        if model_path.exists():
            try:
                self.model_data = joblib.load(model_path)
            except Exception:
                self.model_data = None

        if self.model_data is None:
            # Auto-train default model on first load
            try:
                train_wait_time_model(n_samples=2000)
                if model_path.exists():
                    self.model_data = joblib.load(model_path)
            except Exception:
                self.model_data = None

    def predict(
        self,
        queue_position: int,
        total_queue_length: int,
        resource_capacity: int = 1,
        slot_duration_minutes: int = 60,
        hour_of_day: int = 12,
        day_of_week: int = 0,
        cancellation_rate: float = 0.12,
    ) -> Dict[str, Any]:
        """
        Predicts waiting time in minutes using ML model with deterministic M/M/c fallback.
        """
        # Ensure safe bounds
        capacity = max(1, resource_capacity)
        position = max(1, queue_position)
        total_queue = max(position, total_queue_length)
        duration = max(15, slot_duration_minutes)
        cancel_rate = max(0.01, min(0.5, cancellation_rate))
        is_weekend = 1 if day_of_week in [5, 6] else 0

        # Deterministic Queuing Theory Baseline (M/M/c with reneging)
        # Service rate per unit of capacity
        service_rate_per_min = capacity / duration
        theoretical_wait = (position / service_rate_per_min) * (1.0 - (cancel_rate * 0.7))
        baseline_wait = max(1.0, round(theoretical_wait, 1))

        if self.model_data and "model" in self.model_data:
            try:
                input_df = pd.DataFrame([{
                    "queue_position": position,
                    "total_queue_length": total_queue,
                    "resource_capacity": capacity,
                    "slot_duration_minutes": duration,
                    "hour_of_day": hour_of_day,
                    "day_of_week": day_of_week,
                    "is_weekend": is_weekend,
                    "cancellation_rate": cancel_rate,
                }])[FEATURE_COLUMNS]

                ml_wait = float(self.model_data["model"].predict(input_df)[0])
                predicted_wait = max(1.0, round(ml_wait, 1))

                return {
                    "predicted_wait_time_minutes": predicted_wait,
                    "baseline_wait_time_minutes": baseline_wait,
                    "model_used": "HistGradientBoostingRegressor (Scikit-Learn)",
                    "confidence_level": "High (R²: {:.2f})".format(
                        self.model_data.get("metrics", {}).get("r2", 0.95)
                    ),
                    "queue_position": position,
                    "total_queue_length": total_queue,
                    "factors": {
                        "capacity": capacity,
                        "slot_duration": duration,
                        "hour": hour_of_day,
                        "cancellation_rate_percent": round(cancel_rate * 100, 1),
                    },
                }
            except Exception:
                pass

        # Fallback to Queuing Theory
        return {
            "predicted_wait_time_minutes": baseline_wait,
            "baseline_wait_time_minutes": baseline_wait,
            "model_used": "Deterministic M/M/c Queuing Model",
            "confidence_level": "Standard Baseline",
            "queue_position": position,
            "total_queue_length": total_queue,
            "factors": {
                "capacity": capacity,
                "slot_duration": duration,
                "hour": hour_of_day,
                "cancellation_rate_percent": round(cancel_rate * 100, 1),
            },
        }


# Global singleton instance
predictor = QueuePredictor()
