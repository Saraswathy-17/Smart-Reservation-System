import random
import numpy as np
import pandas as pd


def generate_synthetic_reservation_data(n_samples: int = 2500) -> pd.DataFrame:
    """
    Generates realistic historical queue wait-time data adhering to queuing dynamics:
    - Little's Law & M/M/c relationships
    - Peak lunch (12-14) and dinner (18-21) surges
    - Weekend vs. weekday patterns
    - Real-world stochastic variation & cancellation behavior
    """
    np.random.seed(42)
    random.seed(42)

    records = []

    for _ in range(n_samples):
        # Resource capacity (e.g. 1 to 8 concurrent servers/tables)
        capacity = random.choice([1, 2, 4, 6, 8])
        slot_duration = random.choice([30, 45, 60, 90])
        
        # Day of week: 0 = Mon, 6 = Sun
        day_of_week = random.randint(0, 6)
        is_weekend = 1 if day_of_week in [5, 6] else 0

        # Hour of day: weighted towards peak hours
        hour_weights = [
            0.01, 0.01, 0.01, 0.01, 0.01, 0.01,  # 00-05
            0.02, 0.03, 0.05, 0.08, 0.09, 0.12,  # 06-11
            0.15, 0.14, 0.08, 0.06, 0.07, 0.11,  # 12-17
            0.16, 0.15, 0.10, 0.06, 0.03, 0.02   # 18-23
        ]
        hour = np.random.choice(range(24), p=np.array(hour_weights)/sum(hour_weights))

        # Peak factor
        is_peak = 1 if (12 <= hour <= 14 or 18 <= hour <= 21) else 0

        # Queue length depends on peak time and capacity
        base_queue_max = 12 if is_peak else 5
        total_queue = random.randint(1, base_queue_max)
        queue_position = random.randint(1, total_queue)

        # Historical cancellation rate for this time (higher on weekday mornings, lower on weekend evenings)
        base_cancel_rate = 0.12
        if is_weekend:
            base_cancel_rate -= 0.04
        if hour in [9, 10, 14, 15]:
            base_cancel_rate += 0.05
        cancel_rate = max(0.02, min(0.35, base_cancel_rate + np.random.normal(0, 0.02)))

        # Queuing theory wait time calculation:
        # Expected wait is approximately (queue_position / (capacity / (slot_duration / (1 - cancel_rate))))
        # with variance from early departures and varying service lengths
        service_rate_per_min = capacity / max(slot_duration, 15)
        theoretical_wait = (queue_position / service_rate_per_min) * (1.0 - (cancel_rate * 0.7))

        # Realized wait time includes stochastic noise (log-normal distribution to avoid negative values)
        noise = np.random.normal(0, max(1.5, theoretical_wait * 0.12))
        actual_wait = max(1.0, theoretical_wait + noise)

        records.append({
            "queue_position": queue_position,
            "total_queue_length": total_queue,
            "resource_capacity": capacity,
            "slot_duration_minutes": slot_duration,
            "hour_of_day": hour,
            "day_of_week": day_of_week,
            "is_weekend": is_weekend,
            "cancellation_rate": round(cancel_rate, 3),
            "actual_wait_time_minutes": round(actual_wait, 2),
        })

    return pd.DataFrame(records)
