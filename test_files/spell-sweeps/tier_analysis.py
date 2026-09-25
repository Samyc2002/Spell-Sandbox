"""
Tier 1-3 reviewer-feedback analysis for the research paper.

Produces:
  Figure 1: discovery rate vs. reroll, flat vs nesting vs linking
  Figure 2: validity vs. depth, baseline vs constraint-aware
  Figure 3: uniqueness vs. depth, two grammars (Spellbox vs Rune-Chain)
  Ablation table (flat / nesting-only / linking-only) at matched depths
  95% CIs + two-sample t-tests (flat vs nesting, flat vs linking)
  R^2 summary table for curve fits
  Runtime analysis (generation time vs depth)
  Search-space estimate vs observed unique signatures
  Complexity/raw-score distribution histograms

Usage:
    python3 tier_analysis.py
"""

import json
import math
from pathlib import Path

import numpy as np
from scipy import stats

BASE = Path(__file__).parent
REPO = BASE.parent.parent
OUT_FIG = REPO / "docs" / "reports" / "figures"
OUT_FIG.mkdir(parents=True, exist_ok=True)

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

MULTI_SEED = json.loads((BASE / "multi-seed" / "multi-seed-results.json").read_text())
CURVE_FIT = json.loads((BASE / "multi-seed" / "curve-fit-results.json").read_text())
GEN_COMPARISON = json.loads(
    (REPO / "packages" / "spellbox-cli" / "out" / "generator-comparison" / "generator-comparison.json").read_text()
)
RUNE_CHAIN = json.loads(
    (REPO / "packages" / "spellbox-cli" / "out" / "rune-chain-results.json").read_text()
)
SUPPLEMENTARY = json.loads(
    (REPO / "packages" / "spellbox-cli" / "out" / "supplementary" / "supplementary-results.json").read_text()
)

results = {}

# ---------------------------------------------------------------------------
# Figure 1: Discovery Rate vs Reroll -- Flat vs Nesting vs Linking
# ---------------------------------------------------------------------------
print("Figure 1: discovery rate vs reroll...")
fig, ax = plt.subplots(figsize=(7, 5))
shape_styles = {
    ("nesting", 0): ("Flat (depth=0)", "black", "-"),
    ("nesting", 5): ("Nesting depth=5", "tab:blue", "-"),
    ("nesting", 10): ("Nesting depth=10", "tab:blue", "--"),
    ("nesting", 20): ("Nesting depth=20", "tab:blue", ":"),
    ("links", 5): ("Linking depth=5", "tab:orange", "-"),
    ("links", 10): ("Linking depth=10", "tab:orange", "--"),
    ("links", 20): ("Linking depth=20", "tab:orange", ":"),
}
for seq in MULTI_SEED["discoverySweep"]:
    key = (seq["shape"]["nestingOrLinksType"], seq["shape"]["nestingOrLinks"])
    if key not in shape_styles:
        continue
    label, color, style = shape_styles[key]
    x = [r["runIndex"] for r in seq["runs"]]
    mean = np.array([r["discoveryRatePct"]["mean"] for r in seq["runs"]])
    std = np.array([r["discoveryRatePct"]["std"] for r in seq["runs"]])
    ax.plot(x, mean, label=label, color=color, linestyle=style)
    ax.fill_between(x, mean - std, mean + std, color=color, alpha=0.12)
ax.set_xlabel("Reroll (batch index)")
ax.set_ylabel("Discovery rate (% new unique signatures)")
ax.set_title("Figure 1: Discovery Rate vs. Reroll")
ax.legend(fontsize=8)
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig(OUT_FIG / "figure1_discovery_rate.png", dpi=150)
plt.close(fig)

print("Figure 1b: discovery rate vs reroll (valid-only)...")
fig, ax = plt.subplots(figsize=(7, 5))
for seq in MULTI_SEED["discoverySweep"]:
    key = (seq["shape"]["nestingOrLinksType"], seq["shape"]["nestingOrLinks"])
    if key not in shape_styles:
        continue
    label, color, style = shape_styles[key]
    x = [r["runIndex"] for r in seq["runs"]]
    mean = np.array([r["discoveryRatePctValidOnly"]["mean"] for r in seq["runs"]])
    std = np.array([r["discoveryRatePctValidOnly"]["std"] for r in seq["runs"]])
    ax.plot(x, mean, label=label, color=color, linestyle=style)
    ax.fill_between(x, mean - std, mean + std, color=color, alpha=0.12)
ax.set_xlabel("Reroll (batch index)")
ax.set_ylabel("Discovery rate, valid spells only (% new unique signatures)")
ax.set_title("Figure 1b: Discovery Rate vs. Reroll (Valid-Only)")
ax.legend(fontsize=8)
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig(OUT_FIG / "figure1b_discovery_rate_valid_only.png", dpi=150)
plt.close(fig)

# ---------------------------------------------------------------------------
# Figure 2: Validity vs Depth -- Baseline vs Constraint-Aware
# ---------------------------------------------------------------------------
print("Figure 2: validity vs depth...")
fig, ax = plt.subplots(figsize=(7, 5))
depths = GEN_COMPARISON["depths"]
for gen_name, gen_data in GEN_COMPARISON["depthSweep"].items():
    nesting_rows = [r for r in gen_data["nesting"] if r["depth"] in depths]
    x = [r["depth"] for r in nesting_rows]
    y = [r["validityPct"]["mean"] for r in nesting_rows]
    ax.plot(x, y, marker="o", label=f"{gen_name} (nesting)")
ax.set_xlabel("Nesting depth")
ax.set_ylabel("Validity (%)")
ax.set_title("Figure 2: Validity vs. Depth (Baseline vs. Constraint-Aware)")
ax.legend(fontsize=8)
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig(OUT_FIG / "figure2_validity_baseline_vs_constraint_aware.png", dpi=150)
plt.close(fig)

# ---------------------------------------------------------------------------
# Figure 3: Uniqueness vs Depth -- Two Grammars
# ---------------------------------------------------------------------------
print("Figure 3: uniqueness vs depth, two grammars...")
fig, ax = plt.subplots(figsize=(7, 5))
sb_nesting = MULTI_SEED["depthSweep"]["nesting"]
x_sb = [r["depth"] for r in sb_nesting]
y_sb = [r["uniquenessRatio"]["mean"] * 100 for r in sb_nesting]
ax.plot(x_sb, y_sb, marker="o", label="Spellbox (nesting)", color="tab:blue")

rc_depth = RUNE_CHAIN["depthSweep"]
rc_key = "refinement" if "refinement" in rc_depth else list(rc_depth.keys())[0]
rc_rows = rc_depth[rc_key]
x_rc = [r["depth"] for r in rc_rows]
y_rc = [r["uniquenessRatio"]["mean"] * 100 for r in rc_rows]
ax.plot(x_rc, y_rc, marker="s", label="Rune-Chain (refinement)", color="tab:red")

ax.set_xlabel("Depth")
ax.set_ylabel("Uniqueness ratio (%)")
ax.set_title("Figure 3: Uniqueness vs. Depth (Two Grammars)")
ax.legend(fontsize=8)
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig(OUT_FIG / "figure3_uniqueness_two_grammars.png", dpi=150)
plt.close(fig)

print("Figure 3b: uniqueness vs depth, two grammars (valid-only)...")
fig, ax = plt.subplots(figsize=(7, 5))
y_sb_v = [r["uniquenessRatioValidOnly"]["mean"] * 100 for r in sb_nesting]
ax.plot(x_sb, y_sb_v, marker="o", label="Spellbox (nesting)", color="tab:blue")

y_rc_v = [r["uniquenessRatioValidOnly"]["mean"] * 100 for r in rc_rows]
ax.plot(x_rc, y_rc_v, marker="s", label="Rune-Chain (refinement)", color="tab:red")

ax.set_xlabel("Depth")
ax.set_ylabel("Uniqueness ratio, valid spells only (%)")
ax.set_title("Figure 3b: Uniqueness vs. Depth (Two Grammars, Valid-Only)")
ax.legend(fontsize=8)
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig(OUT_FIG / "figure3b_uniqueness_two_grammars_valid_only.png", dpi=150)
plt.close(fig)

# ---------------------------------------------------------------------------
# Ablation table: Flat / Nesting-only / Linking-only
# ---------------------------------------------------------------------------
print("Ablation table...")
ablation = []
depths_to_report = [0, 5, 10, 20]
nesting_by_depth = {r["depth"]: r for r in MULTI_SEED["depthSweep"]["nesting"]}
links_by_depth = {r["depth"]: r for r in MULTI_SEED["depthSweep"]["links"]}
for d in depths_to_report:
    if d == 0:
        row = nesting_by_depth[0]
        ablation.append({
            "config": "Flat (depth=0)",
            "depth": 0,
            "validityPct": row["validityPct"]["mean"],
            "uniquenessRatio": row["uniquenessRatio"]["mean"],
            "uniquenessRatioValidOnly": row["uniquenessRatioValidOnly"]["mean"],
        })
    else:
        n = nesting_by_depth[d]
        l = links_by_depth[d]
        ablation.append({
            "config": f"Nesting-only (depth={d})",
            "depth": d,
            "validityPct": n["validityPct"]["mean"],
            "uniquenessRatio": n["uniquenessRatio"]["mean"],
            "uniquenessRatioValidOnly": n["uniquenessRatioValidOnly"]["mean"],
        })
        ablation.append({
            "config": f"Linking-only (depth={d})",
            "depth": d,
            "validityPct": l["validityPct"]["mean"],
            "uniquenessRatio": l["uniquenessRatio"]["mean"],
            "uniquenessRatioValidOnly": l["uniquenessRatioValidOnly"]["mean"],
        })
results["ablation"] = ablation

# Discovery rate final value per shape for the ablation table
disc_final = {}
disc_final_valid_only = {}
for seq in MULTI_SEED["discoverySweep"]:
    key = (seq["shape"]["nestingOrLinksType"], seq["shape"]["nestingOrLinks"])
    disc_final[key] = seq["runs"][-1]["discoveryRatePct"]["mean"]
    disc_final_valid_only[key] = seq["runs"][-1]["discoveryRatePctValidOnly"]["mean"]
for row in ablation:
    if row["config"].startswith("Flat"):
        row["finalDiscoveryRatePct"] = disc_final.get(("nesting", 0))
        row["finalDiscoveryRatePctValidOnly"] = disc_final_valid_only.get(("nesting", 0))
    elif row["config"].startswith("Nesting"):
        row["finalDiscoveryRatePct"] = disc_final.get(("nesting", row["depth"]))
        row["finalDiscoveryRatePctValidOnly"] = disc_final_valid_only.get(
            ("nesting", row["depth"])
        )
    elif row["config"].startswith("Linking"):
        row["finalDiscoveryRatePct"] = disc_final.get(("links", row["depth"]))
        row["finalDiscoveryRatePctValidOnly"] = disc_final_valid_only.get(
            ("links", row["depth"])
        )

# ---------------------------------------------------------------------------
# 95% CIs + two-sample t-tests
# ---------------------------------------------------------------------------
print("Statistical significance (CIs + t-tests)...")


def ci95(values):
    values = np.array(values, dtype=float)
    n = len(values)
    mean = values.mean()
    sem = values.std(ddof=1) / math.sqrt(n)
    margin = stats.t.ppf(0.975, n - 1) * sem
    return mean, mean - margin, mean + margin


stat_tests = {}
for depth in [5, 10, 20]:
    flat_valid = nesting_by_depth[0]["validityPct"]["values"]
    nest_valid = nesting_by_depth[depth]["validityPct"]["values"]
    link_valid = links_by_depth[depth]["validityPct"]["values"]

    t_fn, p_fn = stats.ttest_ind(flat_valid, nest_valid)
    t_fl, p_fl = stats.ttest_ind(flat_valid, link_valid)

    stat_tests[f"depth_{depth}"] = {
        "flat_validity_ci95": ci95(flat_valid),
        "nesting_validity_ci95": ci95(nest_valid),
        "linking_validity_ci95": ci95(link_valid),
        "flat_vs_nesting_ttest": {"t": t_fn, "p": p_fn},
        "flat_vs_linking_ttest": {"t": t_fl, "p": p_fl},
    }
results["stat_tests"] = stat_tests

# ---------------------------------------------------------------------------
# R^2 summary table
# ---------------------------------------------------------------------------
print("R^2 summary table...")
r2_table = []
for seq in CURVE_FIT["discovery_rate_vs_run"]:
    row = {"series": seq["shape"], "metric": "discovery_rate_vs_run", "best_fit": seq["best_fit"]}
    for model, fit in seq["fits"].items():
        row[f"r2_{model}"] = fit["r2"] if fit else None
    r2_table.append(row)
for seq in CURVE_FIT["uniqueness_vs_amount"]:
    row = {"series": seq["shape"], "metric": "uniqueness_vs_amount", "best_fit": seq["best_fit"]}
    for model, fit in seq["fits"].items():
        row[f"r2_{model}"] = fit["r2"] if fit else None
    r2_table.append(row)
for seq in CURVE_FIT.get("discovery_rate_vs_run_valid_only", []):
    row = {
        "series": seq["shape"],
        "metric": "discovery_rate_vs_run_valid_only",
        "best_fit": seq["best_fit"],
    }
    for model, fit in seq["fits"].items():
        row[f"r2_{model}"] = fit["r2"] if fit else None
    r2_table.append(row)
for seq in CURVE_FIT.get("uniqueness_vs_amount_valid_only", []):
    row = {
        "series": seq["shape"],
        "metric": "uniqueness_vs_amount_valid_only",
        "best_fit": seq["best_fit"],
    }
    for model, fit in seq["fits"].items():
        row[f"r2_{model}"] = fit["r2"] if fit else None
    r2_table.append(row)
results["r2_table"] = r2_table

# ---------------------------------------------------------------------------
# Runtime analysis
# ---------------------------------------------------------------------------
print("Runtime analysis...")
runtime_summary = {}
for op in ["nesting", "links"]:
    rows = []
    for entry in SUPPLEMENTARY["timing"][op]:
        samples = np.array(entry["msSamples"])
        rows.append({
            "depth": entry["depth"],
            "meanMs": samples.mean(),
            "stdMs": samples.std(ddof=1) if len(samples) > 1 else 0.0,
        })
    runtime_summary[op] = rows
results["runtime"] = runtime_summary

fig, ax = plt.subplots(figsize=(7, 5))
for op, color in [("nesting", "tab:blue"), ("links", "tab:orange")]:
    x = [r["depth"] for r in runtime_summary[op]]
    y = [r["meanMs"] for r in runtime_summary[op]]
    yerr = [r["stdMs"] for r in runtime_summary[op]]
    ax.errorbar(x, y, yerr=yerr, marker="o", label=op, color=color, capsize=3)
ax.set_xlabel("Depth")
ax.set_ylabel(f"Generation time for {SUPPLEMENTARY['amount']} spells (ms)")
ax.set_title("Runtime: Generation Time vs. Depth")
ax.legend()
ax.grid(alpha=0.3)
fig.tight_layout()
fig.savefig(OUT_FIG / "figure_runtime_vs_depth.png", dpi=150)
plt.close(fig)

# ---------------------------------------------------------------------------
# Search-space estimation
# ---------------------------------------------------------------------------
print("Search-space estimation...")
N_SIGIL = 5
N_TRANSFORM = 5
N_CONTROL = 5
N_MANIFEST = 5

# Per-node CentralSymbol equivalence classes (as counted by signature(), which
# sorts symbolMultiset entries -- so a Radial pair {A,B} is the same class as
# {B,A}). Raw sigil-pair draws are N_SIGIL^2 = 25 (ordered, with repeats
# allowed); collapsing order gives C(5,2) + 5 = 10 + 5 = 15 distinct classes.
symbol_classes = N_SIGIL + N_TRANSFORM + (math.comb(N_SIGIL, 2) + N_SIGIL)

# Per-node sign-option equivalence classes. signMultiset/controlMultiset/etc
# are unordered multisets with a reversed flag per sign, so order within an
# option doesn't matter, but the reversed flag on each individual sign does.
# option 1: 1 control, 2 reversed states -> 5*2 = 10 classes
opt1 = N_CONTROL * 2
# option 2: 1 control + (1 transform OR 1 manifestation), each with its own
# reversed flag -> control classes * (transform classes + manifestation classes)
opt2 = (N_CONTROL * 2) * (N_TRANSFORM * 2 + N_MANIFEST * 2)
# option 3: 1 control + 1 manifestation + 1 transformation, each reversed
opt3 = (N_CONTROL * 2) * (N_MANIFEST * 2) * (N_TRANSFORM * 2)
sign_classes = opt1 + opt2 + opt3

per_node_classes = symbol_classes * sign_classes


def theoretical_space(depth, is_linked):
    """Rough upper bound on distinct signatures reachable at a given depth.
    Nesting depth d chains d+1 nodes into ONE signature (nodes compound into
    the same multiset); this is an upper bound since the signature further
    collapses nodes with identical symbol/sign choices together (multiset,
    not sequence), so the true count is <= this estimate."""
    nodes = depth + 1
    return per_node_classes ** nodes if not is_linked else per_node_classes ** nodes


space_estimates = []
for d in [0, 5, 10, 20]:
    n_row = nesting_by_depth[d]
    est = theoretical_space(d, is_linked=False)
    observed_ratio = n_row["uniquenessRatio"]["mean"]
    n_amount = MULTI_SEED["amount"]
    observed_unique = round(observed_ratio * n_amount)
    pct_explored = observed_unique / est * 100 if est > 0 else None

    observed_ratio_valid = n_row["uniquenessRatioValidOnly"]["mean"]
    valid_amount = n_amount * (n_row["validityPct"]["mean"] / 100)
    observed_unique_valid = round(observed_ratio_valid * valid_amount)
    pct_explored_valid = observed_unique_valid / est * 100 if est > 0 else None

    space_estimates.append({
        "depth": d,
        "perNodeClasses": per_node_classes,
        "theoreticalSpaceUpperBound": est,
        "observedUniqueAt1200Samples": observed_unique,
        "pctOfSpaceExploredAt1200Samples": pct_explored,
        "observedUniqueValidOnlyAt1200Samples": observed_unique_valid,
        "pctOfSpaceExploredValidOnlyAt1200Samples": pct_explored_valid,
    })
results["search_space"] = {
    "symbolClasses": symbol_classes,
    "signClasses": sign_classes,
    "perNodeClasses": per_node_classes,
    "estimates": space_estimates,
}

# ---------------------------------------------------------------------------
# Complexity / raw-score distribution histograms
# ---------------------------------------------------------------------------
print("Complexity distribution histograms...")
fig, axes = plt.subplots(1, 2, figsize=(12, 5), sharey=True)
for ax, op in zip(axes, ["nesting", "links"]):
    hist_data = SUPPLEMENTARY["histograms"][op]
    for entry in hist_data:
        if entry["depth"] not in (0, 10, 30):
            continue
        ax.hist(
            entry["rawScores"],
            bins=30,
            alpha=0.5,
            label=f"depth={entry['depth']}",
            density=True,
        )
    ax.set_xlabel("Raw score")
    ax.set_title(f"Raw-score distribution ({op})")
    ax.legend(fontsize=8)
axes[0].set_ylabel("Density")
fig.suptitle("Figure: Complexity (Raw Score) Distribution by Depth")
fig.tight_layout()
fig.savefig(OUT_FIG / "figure_complexity_histograms.png", dpi=150)
plt.close(fig)

hist_stats = {}
for op in ["nesting", "links"]:
    rows = []
    for entry in SUPPLEMENTARY["histograms"][op]:
        arr = np.array(entry["rawScores"])
        rows.append({
            "depth": entry["depth"],
            "mean": arr.mean(),
            "std": arr.std(ddof=1),
            "min": arr.min(),
            "max": arr.max(),
        })
    hist_stats[op] = rows
results["histogram_stats"] = hist_stats

# ---------------------------------------------------------------------------
# Write results
# ---------------------------------------------------------------------------
out_path = BASE / "tier_analysis_results.json"
with open(out_path, "w") as f:
    json.dump(results, f, indent=2, default=lambda o: float(o))
print(f"\nWrote {out_path}")
print(f"Figures written to {OUT_FIG}")
