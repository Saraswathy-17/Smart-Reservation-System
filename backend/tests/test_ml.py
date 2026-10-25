import pytest
from app.ml.synthetic_data import generate_synthetic_reservation_data
from app.ml.trainer import train_wait_time_model
from app.ml.predictor import predictor


def test_synthetic_data_generation():
    df = generate_synthetic_reservation_data(n_samples=100)
    assert len(df) == 100
    assert "queue_position" in df.columns
    assert "actual_wait_time_minutes" in df.columns
    assert (df["actual_wait_time_minutes"] > 0).all()


def test_model_training_and_metrics():
    results = train_wait_time_model(n_samples=500)
    assert results["status"] == "success"
    assert results["r2_score"] > 0.70
    assert results["mae_minutes"] >= 0


def test_predictor_inference():
    pred = predictor.predict(
        queue_position=2,
        total_queue_length=3,
        resource_capacity=2,
        slot_duration_minutes=60,
        hour_of_day=13,
        day_of_week=2,
        cancellation_rate=0.10,
    )
    assert "predicted_wait_time_minutes" in pred
    assert pred["predicted_wait_time_minutes"] > 0
    assert "HistGradientBoostingRegressor" in pred["model_used"] or "Queuing" in pred["model_used"]
    assert pred["queue_position"] == 2
