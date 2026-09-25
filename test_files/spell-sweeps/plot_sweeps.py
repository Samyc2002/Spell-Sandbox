"""
Plots the "Varying Amount of Spells" / "Varying Max Nesting Depth" /
"Varying Max Linking Depth" observations from a folder (or zip) of
per-run Metrics JSON reports exported from the batch runs page
(apps/web/app/batch/page.tsx -> "Export all reports (.zip)").

Each input file is one `Metrics` object (see apps/web/lib/metrics.ts).
It does NOT embed the original BatchConfig, so this script derives the
run's shape (amount / nesting / linking) straight from the Metrics
fields (total, maxNesting, maxLinks, normalization).

Usage:
    python plot_sweeps.py --input path/to/batch-reports.zip --out out/
    python plot_sweeps.py --input path/to/extracted-folder --out out/

Only stdlib + matplotlib are required (pip install matplotlib).
"""

from __future__ import annotations

import argparse
import json
import zipfile
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt

TIER_LABELS = ["Novice", "Apprentice", "Adept", "Master"]
NORMALIZATIONS = ["sigmoid", "exponential", "arctan"]
NORM_COLORS = {
    "sigmoid": "#e56b8a",
    "exponential": "#58c8b0",
    "arctan": "#8c7cf4",
}


@dataclass
class RunSummary:
    amount: int
    max_nesting: int
    max_links: int
    normalization: str
    validity_pct: float
    uniqueness_ratio: float
    avg_complexity: float
    avg_raw_score: float
    highest_tier: str
    highest_tier_index: int


def highest_tier(tier_counts: list[int]) -> tuple[str, int]:
    """Mirrors apps/web/lib/batch.ts::highestTier: the tier with the
    most spells in it (the mode), not the max tier any single spell hit."""
    max_tier = 0
    for i in range(len(tier_counts)):
        if tier_counts[i] > tier_counts[max_tier]:
            max_tier = i
    label = TIER_LABELS[max_tier] if max_tier < len(TIER_LABELS) else "-"
    return label, max_tier


def summarize(metrics: dict) -> RunSummary:
    total = metrics["total"]
    valid = metrics["valid"]
    unique = metrics["unique"]
    tier_label, tier_index = highest_tier(metrics["tierCounts"])

    return RunSummary(
        amount=total,
        max_nesting=metrics["maxNesting"],
        max_links=metrics["maxLinks"],
        normalization=metrics["normalization"],
        validity_pct=round((valid / total) * 100) if total else 0,
        uniqueness_ratio=(unique / total) if total else 0.0,
        avg_complexity=metrics["avgScore"],
        avg_raw_score=metrics["avgRawScore"],
        highest_tier=tier_label,
        highest_tier_index=tier_index,
    )


def load_reports(input_path: Path) -> list[RunSummary]:
    summaries: list[RunSummary] = []

    if input_path.is_dir():
        files = sorted(input_path.glob("**/*.json"))
        for file in files:
            summaries.append(summarize(json.loads(file.read_text())))
    elif input_path.suffix == ".zip":
        with zipfile.ZipFile(input_path) as zf:
            names = sorted(n for n in zf.namelist() if n.endswith(".json"))
            for name in names:
                summaries.append(summarize(json.loads(zf.read(name))))
    else:
        raise ValueError(
            f"--input must be a directory of .json reports or a .zip, got: {input_path}"
        )

    if not summaries:
        raise ValueError(f"No .json reports found under {input_path}")

    return summaries


def split_by_sweep(
    summaries: list[RunSummary],
) -> tuple[list[RunSummary], list[RunSummary], list[RunSummary]]:
    """Classifies each run into the amount-sweep, nesting-sweep, or
    linking-sweep bucket.

    Each run has a "shape" of (max_nesting, max_links) and an amount.
    A shape belongs to the amount sweep if more than one distinct
    `amount` was generated for it (i.e. amount was the thing being
    varied while nesting/linking depth stayed fixed). Everything else
    is a depth sweep at a fixed amount, split into nesting vs linking
    by which one is nonzero.

    A single (amount, shape) pair can legitimately appear in more than
    one sweep (e.g. amount=1200, nesting=4 is both the amount sweep's
    nested data point and a point on the nesting-depth sweep) - such
    rows are included in every sweep they match, which is the
    dataset's own overlap, not a classification error.
    """

    shape_amounts: dict[tuple[int, int], set[int]] = {}
    for s in summaries:
        key = (s.max_nesting, s.max_links)
        shape_amounts.setdefault(key, set()).add(s.amount)

    amount_sweep_shapes = {
        shape for shape, amounts in shape_amounts.items() if len(amounts) > 1
    }

    amount_sweep = [
        s for s in summaries if (s.max_nesting, s.max_links) in amount_sweep_shapes
    ]
    nesting_sweep = [
        s
        for s in summaries
        if s.max_links == 0
        and (s.max_nesting, s.max_links) not in amount_sweep_shapes
    ]
    linking_sweep = [
        s
        for s in summaries
        if s.max_nesting == 0
        and (s.max_nesting, s.max_links) not in amount_sweep_shapes
    ]

    return amount_sweep, nesting_sweep, linking_sweep


def _plot_by_normalization(
    runs: list[RunSummary],
    x_attr: str,
    y_attr: str,
    xlabel: str,
    ylabel: str,
    title: str,
    out_path: Path,
    log_x: bool = False,
    series_attr: str | None = None,
) -> None:
    fig, ax = plt.subplots(figsize=(8, 5))

    series_key = series_attr or "normalization"
    series_values = sorted({getattr(r, series_key) for r in runs})

    for series_value in series_values:
        points = sorted(
            (getattr(r, x_attr), getattr(r, y_attr))
            for r in runs
            if getattr(r, series_key) == series_value
        )
        if not points:
            continue
        xs, ys = zip(*points)
        color = NORM_COLORS.get(series_value)
        ax.plot(xs, ys, marker="o", markersize=4, label=series_value, color=color)

    if log_x:
        ax.set_xscale("log")
    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.legend(title=series_key.replace("_", " "))
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"wrote {out_path}")


def _plot_shape_comparison(
    nesting_runs: list[RunSummary],
    linking_runs: list[RunSummary],
    x_attr: str,
    y_attr: str,
    xlabel: str,
    ylabel: str,
    title: str,
    out_path: Path,
    normalization: str = "exponential",
) -> None:
    fig, ax = plt.subplots(figsize=(8, 5))

    for label, runs, color in (
        ("nesting", nesting_runs, "#f5a65b"),
        ("linking", linking_runs, "#58c8b0"),
    ):
        points = sorted(
            (getattr(r, x_attr), getattr(r, y_attr))
            for r in runs
            if r.normalization == normalization
        )
        if not points:
            continue
        xs, ys = zip(*points)
        ax.plot(xs, ys, marker="o", markersize=4, label=label, color=color)

    ax.set_xlabel(xlabel)
    ax.set_ylabel(ylabel)
    ax.set_title(f"{title} ({normalization} normalization)")
    ax.legend(title="shape")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"wrote {out_path}")


def plot_amount_sweep(runs: list[RunSummary], out_dir: Path) -> None:
    nested = [r for r in runs if r.max_nesting > 0]
    linked = [r for r in runs if r.max_links > 0]

    for shape_label, shape_runs in (("nesting", nested), ("linking", linked)):
        if not shape_runs:
            continue
        _plot_by_normalization(
            shape_runs,
            x_attr="amount",
            y_attr="validity_pct",
            xlabel="Amount of spells (log scale)",
            ylabel="Validity %",
            title=f"Validity % vs amount of spells ({shape_label})",
            out_path=out_dir / f"amount_validity_{shape_label}.png",
            log_x=True,
        )
        _plot_by_normalization(
            shape_runs,
            x_attr="amount",
            y_attr="uniqueness_ratio",
            xlabel="Amount of spells (log scale)",
            ylabel="Average uniqueness ratio",
            title=f"Uniqueness ratio vs amount of spells ({shape_label})",
            out_path=out_dir / f"amount_uniqueness_{shape_label}.png",
            log_x=True,
        )
        _plot_by_normalization(
            shape_runs,
            x_attr="amount",
            y_attr="avg_raw_score",
            xlabel="Amount of spells (log scale)",
            ylabel="Average raw score",
            title=f"Raw score vs amount of spells ({shape_label})",
            out_path=out_dir / f"amount_raw_score_{shape_label}.png",
            log_x=True,
        )
        _plot_by_normalization(
            shape_runs,
            x_attr="amount",
            y_attr="avg_complexity",
            xlabel="Amount of spells (log scale)",
            ylabel="Average complexity score",
            title=f"Complexity score vs amount of spells ({shape_label})",
            out_path=out_dir / f"amount_complexity_{shape_label}.png",
            log_x=True,
        )


def plot_depth_sweep(
    runs: list[RunSummary], out_dir: Path, depth_attr: str, label: str
) -> None:
    if not runs:
        return

    _plot_by_normalization(
        runs,
        x_attr=depth_attr,
        y_attr="validity_pct",
        xlabel=f"Max {label} depth",
        ylabel="Validity %",
        title=f"Validity % vs max {label} depth",
        out_path=out_dir / f"{label}_validity.png",
    )
    _plot_by_normalization(
        runs,
        x_attr=depth_attr,
        y_attr="uniqueness_ratio",
        xlabel=f"Max {label} depth",
        ylabel="Average uniqueness ratio",
        title=f"Uniqueness ratio vs max {label} depth",
        out_path=out_dir / f"{label}_uniqueness.png",
    )
    _plot_by_normalization(
        runs,
        x_attr=depth_attr,
        y_attr="avg_raw_score",
        xlabel=f"Max {label} depth",
        ylabel="Average raw score",
        title=f"Raw score vs max {label} depth",
        out_path=out_dir / f"{label}_raw_score.png",
    )
    _plot_by_normalization(
        runs,
        x_attr=depth_attr,
        y_attr="avg_complexity",
        xlabel=f"Max {label} depth",
        ylabel="Average complexity score",
        title=f"Complexity score vs max {label} depth",
        out_path=out_dir / f"{label}_complexity.png",
    )
    _plot_by_normalization(
        runs,
        x_attr=depth_attr,
        y_attr="highest_tier_index",
        xlabel=f"Max {label} depth",
        ylabel=f"Highest complexity tier (0={TIER_LABELS[0]}..3={TIER_LABELS[3]})",
        title=f"Tier progression vs max {label} depth",
        out_path=out_dir / f"{label}_tier.png",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        help="Folder of batch-run-*.json reports, or the exported batch-reports.zip",
    )
    parser.add_argument(
        "--out",
        default=Path("plots"),
        type=Path,
        help="Output directory for generated PNGs (default: ./plots)",
    )
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)

    summaries = load_reports(args.input)
    print(f"loaded {len(summaries)} reports from {args.input}")

    amount_sweep, nesting_sweep, linking_sweep = split_by_sweep(summaries)
    print(
        f"amount sweep: {len(amount_sweep)}, "
        f"nesting sweep: {len(nesting_sweep)}, "
        f"linking sweep: {len(linking_sweep)}"
    )

    plot_amount_sweep(amount_sweep, args.out)
    plot_depth_sweep(nesting_sweep, args.out, depth_attr="max_nesting", label="nesting")
    plot_depth_sweep(linking_sweep, args.out, depth_attr="max_links", label="linking")

    if nesting_sweep and linking_sweep:
        _plot_shape_comparison(
            nesting_sweep,
            linking_sweep,
            x_attr="max_nesting",
            y_attr="avg_raw_score",
            xlabel="Max depth",
            ylabel="Average raw score",
            title="Raw score: nesting vs linking depth",
            out_path=args.out / "nesting_vs_linking_raw_score.png",
        )
        _plot_shape_comparison(
            nesting_sweep,
            linking_sweep,
            x_attr="max_nesting",
            y_attr="validity_pct",
            xlabel="Max depth",
            ylabel="Validity %",
            title="Validity %: nesting vs linking depth",
            out_path=args.out / "nesting_vs_linking_validity.png",
        )

    print("done.")


if __name__ == "__main__":
    main()
