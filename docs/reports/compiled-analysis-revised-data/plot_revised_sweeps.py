"""
Plots the revised, real-5-seed "Varying Max Nesting Depth" / "Varying Max
Linking Depth" / amount-of-spells sweeps from the JSON produced by
apps/web/scripts_tmp/run_web_depth_sweep.ts and run_web_amount_sweep.ts
(both of which call the actual web-app generator, apps/web/lib/batch.ts's
runConfig(), which in turn calls spellbox/src/core/bulkMetricsGenerator
directly). Mirrors test_files/spell-sweeps/plot_sweeps.py's style/palette,
but plots mean +/- std across the 5 real seeds instead of a single seed.

Usage:
    python3 plot_revised_sweeps.py
"""

from __future__ import annotations

import json
import statistics as st
from pathlib import Path

import matplotlib.pyplot as plt

HERE = Path(__file__).parent
DEPTH_JSON = HERE / "depth_sweep_output.json"
AMOUNT_JSON = HERE / "amount_sweep_output.json"
OUT_DIR = HERE / "plots"

NORM_COLORS = {
    "sigmoid": "#e56b8a",
    "exponential": "#58c8b0",
    "arctan": "#8c7cf4",
}
TIER_LABELS = ["Novice", "Apprentice", "Adept", "Master"]
TIER_INDEX = {label: i for i, label in enumerate(TIER_LABELS)}


def aggregate(rows: list[dict], depths: list[int], norms: list[str]) -> dict:
    out = {}
    for depth in depths:
        for norm in norms:
            subset = [r for r in rows if r["depth"] == depth and r["normalization"] == norm]
            val = [r["validityPct"] for r in subset]
            uniq = [r["uniquenessRatio"] for r in subset]
            raw = [r["avgRawScore"] for r in subset]
            comp = [r["avgComplexityScore"] for r in subset]
            tiers = [r["highestTier"] for r in subset]
            modal_tier = max(set(tiers), key=tiers.count)
            out[(depth, norm)] = dict(
                validity_mean=st.mean(val),
                validity_std=st.pstdev(val),
                uniq_mean=st.mean(uniq),
                raw_mean=st.mean(raw),
                raw_std=st.pstdev(raw),
                comp_mean=st.mean(comp),
                tier_index=TIER_INDEX[modal_tier],
            )
    return out


def plot_depth_metric(agg: dict, depths: list[int], norms: list[str], metric: str, std_metric: str | None,
                       ylabel: str, title: str, out_path: Path) -> None:
    fig, ax = plt.subplots(figsize=(8, 5))
    for norm in norms:
        xs = depths
        ys = [agg[(d, norm)][metric] for d in depths]
        color = NORM_COLORS.get(norm)
        if std_metric:
            stds = [agg[(d, norm)][std_metric] for d in depths]
            ax.errorbar(xs, ys, yerr=stds, marker="o", markersize=4, capsize=3,
                        label=norm, color=color)
        else:
            ax.plot(xs, ys, marker="o", markersize=4, label=norm, color=color)
    ax.set_xlabel("Max depth")
    ax.set_ylabel(ylabel)
    ax.set_title(title)
    ax.legend(title="normalization")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"wrote {out_path}")


def plot_depth_sweep(agg: dict, depths: list[int], norms: list[str], label: str) -> None:
    plot_depth_metric(agg, depths, norms, "validity_mean", "validity_std",
                       "Validity % (mean +/- std, n=5 seeds)",
                       f"Validity % vs max {label} depth (real 5-seed runs)",
                       OUT_DIR / f"{label}_validity.png")
    plot_depth_metric(agg, depths, norms, "uniq_mean", None,
                       "Average uniqueness ratio (mean, n=5 seeds)",
                       f"Uniqueness ratio vs max {label} depth (real 5-seed runs)",
                       OUT_DIR / f"{label}_uniqueness.png")
    plot_depth_metric(agg, depths, norms, "raw_mean", "raw_std",
                       "Average raw score (mean +/- std, n=5 seeds)",
                       f"Raw score vs max {label} depth (real 5-seed runs)",
                       OUT_DIR / f"{label}_raw_score.png")
    plot_depth_metric(agg, depths, norms, "comp_mean", None,
                       "Average complexity score (mean, n=5 seeds)",
                       f"Complexity score vs max {label} depth (real 5-seed runs)",
                       OUT_DIR / f"{label}_complexity.png")
    plot_depth_metric(agg, depths, norms, "tier_index", None,
                       f"Modal complexity tier (0={TIER_LABELS[0]}..3={TIER_LABELS[3]})",
                       f"Tier progression vs max {label} depth (real 5-seed runs, modal tier)",
                       OUT_DIR / f"{label}_tier.png")


def plot_shape_comparison(nest_agg: dict, link_agg: dict, depths: list[int], metric: str,
                           ylabel: str, title: str, out_path: Path, norm: str = "exponential") -> None:
    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(depths, [nest_agg[(d, norm)][metric] for d in depths],
            marker="o", markersize=4, label="nesting", color="#f5a65b")
    ax.plot(depths, [link_agg[(d, norm)][metric] for d in depths],
            marker="o", markersize=4, label="linking", color="#58c8b0")
    ax.set_xlabel("Max depth")
    ax.set_ylabel(ylabel)
    ax.set_title(f"{title} ({norm} normalization, real 5-seed means)")
    ax.legend(title="shape")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"wrote {out_path}")


def plot_amount_sweep() -> None:
    data = json.loads(AMOUNT_JSON.read_text())
    norms = ["sigmoid", "exponential", "arctan"]

    for shape_key, shape_label in (("nestingShapeRows", "nesting"), ("linkingShapeRows", "linking")):
        rows = data[shape_key]
        amounts = sorted({r["amount"] for r in rows})

        for metric, ylabel, fname in (
            ("validityPct", "Validity %", "validity"),
            ("uniquenessRatio", "Average uniqueness ratio", "uniqueness"),
            ("avgRawScore", "Average raw score", "raw_score"),
            ("avgComplexityScore", "Average complexity score", "complexity"),
        ):
            fig, ax = plt.subplots(figsize=(8, 5))
            for norm in norms:
                points = sorted(
                    (r["amount"], r[metric]) for r in rows if r["normalization"] == norm
                )
                xs, ys = zip(*points)
                ax.plot(xs, ys, marker="o", markersize=4, label=norm, color=NORM_COLORS.get(norm))
            ax.set_xscale("log")
            ax.set_xlabel("Amount of spells (log scale)")
            ax.set_ylabel(ylabel)
            ax.set_title(f"{ylabel} vs amount of spells ({shape_label}, real run, seed 12345)")
            ax.legend(title="normalization")
            ax.grid(True, alpha=0.3)
            fig.tight_layout()
            out_path = OUT_DIR / f"amount_{fname}_{shape_label}.png"
            fig.savefig(out_path, dpi=150)
            plt.close(fig)
            print(f"wrote {out_path}")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    depth_data = json.loads(DEPTH_JSON.read_text())
    depths = [0, 5, 10, 15, 20, 25, 30]
    norms = ["sigmoid", "exponential", "arctan"]

    nest_agg = aggregate(depth_data["nestingRows"], depths, norms)
    link_agg = aggregate(depth_data["linkingRows"], depths, norms)

    plot_depth_sweep(nest_agg, depths, norms, "nesting")
    plot_depth_sweep(link_agg, depths, norms, "linking")

    plot_shape_comparison(nest_agg, link_agg, depths, "raw_mean",
                           "Average raw score", "Raw score: nesting vs linking depth",
                           OUT_DIR / "nesting_vs_linking_raw_score.png")
    plot_shape_comparison(nest_agg, link_agg, depths, "validity_mean",
                           "Validity %", "Validity %: nesting vs linking depth",
                           OUT_DIR / "nesting_vs_linking_validity.png")

    plot_amount_sweep()

    print("done.")


if __name__ == "__main__":
    main()
