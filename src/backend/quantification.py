"""Small deterministic Monte Carlo engine used by the API.

The seed keeps the demo reproducible, while the aggregation rule prevents two
attack paths that reach the same asset from double-counting the same loss.
"""

from __future__ import annotations

import random
from dataclasses import dataclass


@dataclass(frozen=True)
class RiskPath:
    overlap_group: str
    annual_probability: float
    loss: float


PATHS = (
    RiskPath("payment-core", 0.34, 18_000_000),
    RiskPath("payment-core", 0.22, 12_000_000),
    RiskPath("identity-api", 0.28, 9_000_000),
    RiskPath("identity-api", 0.17, 6_000_000),
    RiskPath("vendor-backup", 0.14, 8_000_000),
    RiskPath("branch-mobile", 0.19, 5_000_000),
)


def aggregate_overlapping_losses(path_losses: list[tuple[str, float]]) -> float:
    """Combine losses by taking the largest loss per shared attack target."""
    grouped: dict[str, float] = {}
    for group, loss in path_losses:
        grouped[group] = max(grouped.get(group, 0.0), loss)
    return sum(grouped.values())


def deduplicate_reductions(reductions: list[tuple[str, float]]) -> float:
    """Credit the strongest fix once when several fixes cover one shared node."""
    grouped: dict[str, float] = {}
    for group, reduction in reductions:
        grouped[group] = max(grouped.get(group, 0.0), reduction)
    return sum(grouped.values())


def monte_carlo_eal(
    *,
    factor: float = 1.0,
    control_reduction: float = 0.0,
    iterations: int = 10_000,
    seed: int = 42,
) -> dict[str, float | int | bool]:
    rng = random.Random(seed)
    samples: list[float] = []
    scale = max(0.0, 1.0 - control_reduction / 42_800_000)
    for _ in range(iterations):
        realized = [
            (path.overlap_group, path.loss * factor * scale)
            for path in PATHS
            if rng.random() < path.annual_probability
        ]
        samples.append(aggregate_overlapping_losses(realized))

    samples.sort()
    mean = sum(samples) / iterations
    var99 = samples[min(iterations - 1, int(iterations * 0.99))]
    return {
        "eal": round(mean, 2),
        "var99": round(var99, 2),
        "iterations": iterations,
        "overlap_safe": True,
    }
