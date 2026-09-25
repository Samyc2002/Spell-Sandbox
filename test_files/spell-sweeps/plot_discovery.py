"""
Plots discovery-rate curves from a discovery-reports.json file (produced by
packages/spellbox-cli/src/scripts/runDiscoverySweep.ts).

"Discovery rate" answers: if you keep generating spells with the same
config (amount, nesting/linking depth) but a different seed each time, how
many of each run's spells are structurally new -- never produced by any
earlier run with that same config? A high, flat discovery rate means the
generator is nowhere near exhausting the possible spells for that config; a
falling rate means the space is starting to saturate.

Usage:
    python plot_discovery.py --input discovery-reports.json --out plots/
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt

PALETTE = [
    "#f5a65b",
    "#58c8b0",
    "#e56b8a",
    "#8c7cf4",
    "#e8d36b",
    "#5ba8f5",
    "#c084fc",
    "#4ade80",
    "#fb923c",
]

LINESTYLE_BY_TYPE = {
    "nesting": "-",
    "links": "--",
}


def shape_label(sequence: dict) -> str:
    depth = sequence["nestingOrLinks"]
    kind = sequence["nestingOrLinksType"]
    amount = sequence["amount"]
    if depth == 0:
        return f"amount={amount}, no nesting/linking"
    return f"amount={amount}, {kind}={depth}"


def plot_discovery_rate(sequences: list[dict], out_dir: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 5.5))

    for index, sequence in enumerate(sequences):
        color = PALETTE[index % len(PALETTE)]
        linestyle = LINESTYLE_BY_TYPE.get(sequence["nestingOrLinksType"], "-")
        xs = [r["runIndex"] for r in sequence["runs"]]
        ys = [r["discoveryRate"] * 100 for r in sequence["runs"]]
        ax.plot(
            xs,
            ys,
            marker="o",
            markersize=3,
            label=shape_label(sequence),
            color=color,
            linestyle=linestyle,
            alpha=0.85,
        )

    ax.set_xlabel("Run # in sequence (same config, new seed each time)")
    ax.set_ylabel("Discovery rate % (new spells / total spells that run)")
    ax.set_title("Discovery rate across repeated re-rolls")
    ax.legend(fontsize=8, loc="best")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    out_path = out_dir / "discovery_rate.png"
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"wrote {out_path}")


def plot_cumulative_unique(sequences: list[dict], out_dir: Path) -> None:
    fig, ax = plt.subplots(figsize=(9, 5.5))

    for index, sequence in enumerate(sequences):
        color = PALETTE[index % len(PALETTE)]
        linestyle = LINESTYLE_BY_TYPE.get(sequence["nestingOrLinksType"], "-")
        xs = [r["cumulativeTotal"] for r in sequence["runs"]]
        ys = [r["cumulativeUnique"] for r in sequence["runs"]]
        ax.plot(
            xs,
            ys,
            marker="o",
            markersize=3,
            label=shape_label(sequence),
            color=color,
            linestyle=linestyle,
            alpha=0.85,
        )

    ax.set_xlabel("Cumulative spells generated across the sequence")
    ax.set_ylabel("Cumulative distinct spells discovered")
    ax.set_title("Cumulative unique discoveries vs. total spells generated")
    ax.legend(fontsize=8, loc="best")
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    out_path = out_dir / "discovery_cumulative_unique.png"
    fig.savefig(out_path, dpi=150)
    plt.close(fig)
    print(f"wrote {out_path}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path, help="Path to discovery-reports.json")
    parser.add_argument("--out", default=Path("plots"), type=Path, help="Output directory for PNGs")
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    sequences = json.loads(args.input.read_text())
    print(f"loaded {len(sequences)} sequences from {args.input}")

    plot_discovery_rate(sequences, args.out)
    plot_cumulative_unique(sequences, args.out)

    print("done.")


if __name__ == "__main__":
    main()
