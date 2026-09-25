"""
Reviewer-round-2 analysis for the research paper.

Produces:
  1. Effective-vs-nominal search-space size per shape (occupancy inversion),
     using the raw per-seed cumulative-unique-signature counts.
  2. Achieved per-spell depth distribution per ceiling (sampler-bias evidence).
  3. Per-seed AIC/BIC model selection for discovery-rate-vs-run curves
     (exponential vs logarithmic vs power-law), replacing the R^2-on-means
     comparison, plus the distribution of the winning model across seeds.
  4. Cohen's d effect sizes for flat-vs-nesting and flat-vs-linking validity,
     replacing the t-test table (CIs are already reported elsewhere).
  5. Geometric (conjunction-of-independent-checks) baseline for H2's
     validity-vs-depth curve, compared against the observed curve.

Usage:
    python3 review_round2_analysis.py
"""

import json
import math
from pathlib import Path

import numpy as np
from scipy.optimize import curve_fit

BASE = Path(__file__).parent
REPO = BASE.parent.parent

MULTI_SEED = json.loads((BASE / "multi-seed" / "multi-seed-results.json").read_text())
ROUND2 = json.loads((BASE / "review-round2" / "review-round2-results.json").read_text())

results = {}

# ---------------------------------------------------------------------------
# 1. Effective-vs-nominal search-space size (occupancy inversion)
# ---------------------------------------------------------------------------
print("1. Effective-vs-nominal space size...")

N_SIGIL = 5
N_TRANSFORM = 5
N_CONTROL = 5
N_MANIFEST = 5

symbol_classes = N_SIGIL + N_TRANSFORM + (math.comb(N_SIGIL, 2) + N_SIGIL)
opt1 = N_CONTROL * 2
opt2 = (N_CONTROL * 2) * (N_TRANSFORM * 2 + N_MANIFEST * 2)
opt3 = (N_CONTROL * 2) * (N_MANIFEST * 2) * (N_TRANSFORM * 2)
sign_classes = opt1 + opt2 + opt3
per_node_classes = symbol_classes * sign_classes


def nominal_space(depth):
    nodes = depth + 1
    return per_node_classes**nodes


def occupancy_repeat_prob(cumulative_unique_before, batch_size, n_eff):
    """P(>=1 repeat in a batch), approximated as batch_size * k / n_eff
    (expected repeats over the batch, small-probability regime)."""
    return batch_size * cumulative_unique_before / n_eff


def build_space_table(cumulative_key, new_key, total_key):
    table = []
    for seq in ROUND2["discoveryPerSeed"]:
        shape = seq["shape"]
        if shape["nestingOrLinksType"] != "nesting":
            continue
        depth = shape["nestingOrLinks"]

        # Effective size per seed, from the final run: at run i, k = cumulative
        # unique BEFORE this run's batch, observed repeats = total - newCount.
        n_eff_estimates = []
        for seed_run in seq["perSeed"]:
            runs = seed_run["runs"]
            for r in runs[-10:]:  # use the later, more stable runs
                if r[total_key] <= 0:
                    continue
                k_before = r[cumulative_key] - r[new_key]
                repeats = r[total_key] - r[new_key]
                if k_before <= 0 or repeats <= 0:
                    continue
                observed_repeat_prob = repeats / r[total_key]
                n_eff = k_before / observed_repeat_prob
                n_eff_estimates.append(n_eff)

        n_eff_arr = np.array(n_eff_estimates)
        nominal = nominal_space(depth)
        row = {
            "depth": depth,
            "nominalSpace": nominal,
            "effectiveSpaceMean": float(n_eff_arr.mean()) if len(n_eff_arr) else None,
            "effectiveSpaceStd": float(n_eff_arr.std(ddof=1)) if len(n_eff_arr) > 1 else None,
            "effectiveSpaceEstimateCount": len(n_eff_arr),
            "gapOrdersOfMagnitude": (
                math.log10(nominal) - math.log10(n_eff_arr.mean())
                if len(n_eff_arr) and n_eff_arr.mean() > 0
                else None
            ),
            "finalCumulativeUniqueAcrossSeeds": [
                seed_run["runs"][-1][cumulative_key] for seed_run in seq["perSeed"]
            ],
        }
        table.append(row)
    return table


space_table = build_space_table("cumulativeUnique", "newCount", "total")
space_table_valid_only = build_space_table(
    "cumulativeUniqueValid", "newValidCount", "validTotal"
)

results["effective_vs_nominal_space"] = {
    "perNodeClasses": per_node_classes,
    "symbolClasses": symbol_classes,
    "signClasses": sign_classes,
    "table": space_table,
    "tableValidOnly": space_table_valid_only,
}

# ---------------------------------------------------------------------------
# 2. Achieved per-spell depth distribution
# ---------------------------------------------------------------------------
print("2. Achieved depth distributions...")
results["achieved_depth_distributions"] = ROUND2["depthDistributions"]

# ---------------------------------------------------------------------------
# 3. Per-seed AIC/BIC model selection for discovery-rate-vs-run
# ---------------------------------------------------------------------------
print("3. Per-seed AIC/BIC curve fits...")


def exp_model(x, a, b, c):
    return a * np.exp(-b * x) + c


def log_model(x, a, b):
    return a * np.log(x) + b


def power_model(x, a, b):
    return a * np.power(x, b)


MODELS = {
    "exponential": (exp_model, 3, [50.0, 0.1, 50.0]),
    "logarithmic": (log_model, 2, [-10.0, 80.0]),
    "power_law": (power_model, 2, [90.0, -0.1]),
}


def aic(n, k, rss):
    if rss <= 0:
        rss = 1e-12
    return n * math.log(rss / n) + 2 * k


def bic(n, k, rss):
    if rss <= 0:
        rss = 1e-12
    return n * math.log(rss / n) + k * math.log(n)


def fit_all_models(x, y):
    n = len(x)
    out = {}
    for name, (fn, k, p0) in MODELS.items():
        try:
            popt, _ = curve_fit(fn, x, y, p0=p0, maxfev=20000)
            yhat = fn(x, *popt)
            rss = float(np.sum((y - yhat) ** 2))
            out[name] = {
                "params": popt.tolist(),
                "rss": rss,
                "aic": aic(n, k, rss),
                "bic": bic(n, k, rss),
            }
        except Exception:
            out[name] = None
    return out


def run_per_seed_fits(value_fn):
    per_seed_fit_results = []
    for seq in ROUND2["discoveryPerSeed"]:
        shape = seq["shape"]
        shape_label = f"{shape['nestingOrLinksType']}={shape['nestingOrLinks']}"
        seed_fits = []
        for seed_run in seq["perSeed"]:
            runs = seed_run["runs"]
            x = np.array([r["runIndex"] for r in runs], dtype=float)
            y = np.array([value_fn(r) for r in runs])
            fits = fit_all_models(x, y)
            valid_fits = {k: v for k, v in fits.items() if v is not None}
            best_by_aic = (
                min(valid_fits, key=lambda k: valid_fits[k]["aic"]) if valid_fits else None
            )
            best_by_bic = (
                min(valid_fits, key=lambda k: valid_fits[k]["bic"]) if valid_fits else None
            )
            seed_fits.append(
                {
                    "seed": seed_run["seed"],
                    "fits": fits,
                    "best_by_aic": best_by_aic,
                    "best_by_bic": best_by_bic,
                }
            )
        aic_winners = [sf["best_by_aic"] for sf in seed_fits if sf["best_by_aic"]]
        bic_winners = [sf["best_by_bic"] for sf in seed_fits if sf["best_by_bic"]]
        winner_counts_aic = {m: aic_winners.count(m) for m in MODELS}
        winner_counts_bic = {m: bic_winners.count(m) for m in MODELS}
        per_seed_fit_results.append(
            {
                "shape": shape_label,
                "perSeedFits": seed_fits,
                "aicWinnerCounts": winner_counts_aic,
                "bicWinnerCounts": winner_counts_bic,
            }
        )
    return per_seed_fit_results


results["per_seed_curve_fits"] = run_per_seed_fits(
    lambda r: (r["newCount"] / r["total"]) * 100 if r["total"] > 0 else 0
)
results["per_seed_curve_fits_valid_only"] = run_per_seed_fits(
    lambda r: (r["newValidCount"] / r["validTotal"]) * 100 if r["validTotal"] > 0 else 0
)

# ---------------------------------------------------------------------------
# 4. Cohen's d for flat-vs-nesting / flat-vs-linking validity
# ---------------------------------------------------------------------------
print("4. Cohen's d effect sizes...")

nesting_by_depth = {r["depth"]: r for r in MULTI_SEED["depthSweep"]["nesting"]}
links_by_depth = {r["depth"]: r for r in MULTI_SEED["depthSweep"]["links"]}


def cohens_d(a, b):
    a = np.array(a, dtype=float)
    b = np.array(b, dtype=float)
    na, nb = len(a), len(b)
    pooled_std = math.sqrt(
        ((na - 1) * a.std(ddof=1) ** 2 + (nb - 1) * b.std(ddof=1) ** 2) / (na + nb - 2)
    )
    return (a.mean() - b.mean()) / pooled_std if pooled_std > 0 else None


effect_sizes = {}
flat_valid = nesting_by_depth[0]["validityPct"]["values"]
for depth in [5, 10, 20]:
    nest_valid = nesting_by_depth[depth]["validityPct"]["values"]
    link_valid = links_by_depth[depth]["validityPct"]["values"]
    effect_sizes[f"depth_{depth}"] = {
        "flat_vs_nesting_cohens_d": cohens_d(flat_valid, nest_valid),
        "flat_vs_linking_cohens_d": cohens_d(flat_valid, link_valid),
    }
results["cohens_d"] = effect_sizes

# ---------------------------------------------------------------------------
# 5. Geometric baseline for H2 (validity vs depth)
# ---------------------------------------------------------------------------
print("5. Geometric decay baseline for H2...")

p_node_error = ROUND2["perNodeErrorRate"]  # empirical P(a single depth-0 node is invalid)

geometric_vs_observed = []
for depth in [0, 5, 10, 15, 20, 25, 30]:
    n_nodes = depth + 1
    predicted_valid_pct = ((1 - p_node_error) ** n_nodes) * 100
    observed = nesting_by_depth[depth]["validityPct"]["mean"]
    geometric_vs_observed.append(
        {
            "depth": depth,
            "nodeCount": n_nodes,
            "predictedValidityPct": predicted_valid_pct,
            "observedValidityPct": observed,
            "deviation": observed - predicted_valid_pct,
        }
    )

results["h2_geometric_baseline"] = {
    "empiricalPerNodeErrorRate": p_node_error,
    "table": geometric_vs_observed,
}

# ---------------------------------------------------------------------------
# Write results
# ---------------------------------------------------------------------------
out_path = BASE / "review_round2_results.json"
with open(out_path, "w") as f:
    json.dump(results, f, indent=2, default=lambda o: float(o))
print(f"\nWrote {out_path}")
