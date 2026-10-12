"""
Plots the revised, real-5-seed-anchor discovery-rate sweep from the JSON
produced by apps/web/scripts_tmp/run_web_discovery_sweep.ts, which executes
apps/web/app/api/discovery/route.ts's own runSequence() logic (which calls
spellbox/src/core/bulkMetricsGenerator directly) for real, 7 shapes x 5
seed-anchors x 30 re-rolls. Mirrors test_files/spell-sweeps/plot_discovery.py's
style/palette, plotting mean +/- std bands across the 5 real seed-anchors,
and producing both the all-spells and validity-gated versions.

Usage:
    python3 plot_revised_discovery.py
"""

from __future__ import annotations

import json
import statistics as st
from pathlib import Path

import matplotlib.pyplot as plt

HERE = Path(__file__).parent
DISCOVERY_JSON = HERE / "discovery_sweep_output.json"
OUT_DIR = HERE / "plots"

PALETTE = {
    "flat": "#f5a65b",
    "nesting_5": "#58c8b0",
    "nesting_10": "#e56b8a",
    "nesting_20": "#8c7cf4",
    "links_5": "#58c8b0",
    "links_10": "#e56b8a",
    "links_20": "#8c7cf4",
}
LINESTYLE = {
    "flat": "-",
    "nesting_5": "-",
    "nesting_10": "-",
    "nesting_20": "-",
    "links_5": "--",
    "links_10": "--",
    "links_20": "--",
}
LABELS = {
    "flat": "amount=1200, no nesting/linking",
    "nesting_5": "amount=1200, nesting=5",
    "nesting_10": "amount=1200, nesting=10",
    "nesting_20": "amount=1200, nesting=20",
    "links_5": "amount=1200, links=5",
    "links_10": "amount=1200, links=10",
    "links_20": "amount=1200, links=20",
}


def mean_std_series(anchors: list[list[dict]], field: str) -> tuple[list[float], list[float]]:
    run_count = len(anchors[0])
    means, stds = [], []
    for i in range(run_count):
        vals = [anchor[i][field] for anchor in anchors]
        means.append(st.mean(vals))
        stds.append(st.pstdev(vals))
    return means, stds


def plot_discovery_rate(data: dict, field: str, title: str, out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 5.5))
    for shape_key, anchors in data.items():
        xs = list(range(1, len(anchors[0]) + 1))
        means, stds = mean_std_series(anchors, field)
        ys = [m * 100 for m in means]
        yerr = [s * 100 for s in stds]
        color = PALETTE.get(shape_key)
        ax.plot(xs, ys, marker="o", markersize=3, label=LABELS.get(shape_key, shape_key),
                color=color, linestyle=LINESTYLE.get(shape_key, "-"), alpha=0.9)
        lower = [y - e for y, e in zip(ys, yerr)]
        upper = [y + e for y, e in zip(ys, yerr)]
        ax.fill_between(xs, lower, upper, color=color, alpha=0.12)

    ax.set_xlabel("Run # in sequence (same shape, new seed each time)")
    ax.set_ylabel("Discovery rate % (mean +/- std across 5 seed-anchors)")
    ax.set_title(title)
    ax.legend(fontsize=8, loc="best")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"wrote {out_path}")


def plot_cumulative_unique(data: dict, out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 5.5))
    for shape_key, anchors in data.items():
        color = PALETTE.get(shape_key)
        # use the first seed-anchor's trajectory as a representative cumulative curve
        anchor0 = anchors[0]
        xs = [r["cumulativeTotal"] for r in anchor0]
        ys = [r["cumulativeUnique"] for r in anchor0]
        ax.plot(xs, ys, marker="o", markersize=3, label=LABELS.get(shape_key, shape_key),
                color=color, linestyle=LINESTYLE.get(shape_key, "-"), alpha=0.9)

    ax.set_xlabel("Cumulative spells generated (single representative seed-anchor)")
    ax.set_ylabel("Cumulative distinct spells discovered")
    ax.set_title("Cumulative unique discoveries vs. total spells generated (real run)")
    ax.legend(fontsize=8, loc="best")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"wrote {out_path}")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    data = json.loads(DISCOVERY_JSON.read_text())
    print(f"loaded {len(data)} shapes, {len(next(iter(data.values())))} seed-anchors each")

    plot_discovery_rate(
        data, "discoveryRate",
        "Discovery rate across repeated re-rolls (real, all-spells, n=5 seed-anchors)",
        OUT_DIR / "discovery_rate.png",
    )
    plot_discovery_rate(
        data, "discoveryRateValidOnly",
        "Discovery rate across repeated re-rolls (real, valid-only, n=5 seed-anchors)",
        OUT_DIR / "discovery_rate_valid_only.png",
    )
    plot_cumulative_unique(data, OUT_DIR / "discovery_cumulative_unique.png")

    print("done.")


if __name__ == "__main__":
    main()
