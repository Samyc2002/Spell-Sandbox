"""
Curve fitting for the research paper: fits exponential, logarithmic, and
power-law models to (a) discovery rate vs. run number, per shape, and
(b) uniqueness ratio vs. amount of spells generated, per shape.

Usage:
    python3 curve_fit.py
"""

import json
from pathlib import Path

import numpy as np
from scipy.optimize import curve_fit
from scipy.stats import pearsonr

BASE = Path(__file__).parent

MULTI_SEED = json.loads((BASE / "multi-seed" / "multi-seed-results.json").read_text())
AMOUNT_UNIQ = json.loads((BASE / "multi-seed" / "amount-uniqueness.json").read_text())


def r_squared(y_actual, y_predicted):
    y_actual = np.asarray(y_actual, dtype=float)
    y_predicted = np.asarray(y_predicted, dtype=float)
    ss_res = np.sum((y_actual - y_predicted) ** 2)
    ss_tot = np.sum((y_actual - np.mean(y_actual)) ** 2)
    if ss_tot == 0:
        return 1.0 if ss_res == 0 else 0.0
    return 1 - ss_res / ss_tot


def fit_exponential(x, y):
    # y = a * exp(-b * x) + c
    def model(x, a, b, c):
        return a * np.exp(-b * x) + c

    p0 = [y[0] - y[-1], 0.05, y[-1]]
    try:
        popt, _ = curve_fit(model, x, y, p0=p0, maxfev=20000)
        y_pred = model(np.array(x), *popt)
        return {"params": {"a": popt[0], "b": popt[1], "c": popt[2]}, "r2": r_squared(y, y_pred)}
    except RuntimeError:
        return None


def fit_logarithmic(x, y):
    # y = a * ln(x) + b
    def model(x, a, b):
        return a * np.log(x) + b

    x_safe = np.array(x, dtype=float)
    x_safe[x_safe <= 0] = 1e-6
    try:
        popt, _ = curve_fit(model, x_safe, y, maxfev=20000)
        y_pred = model(x_safe, *popt)
        return {"params": {"a": popt[0], "b": popt[1]}, "r2": r_squared(y, y_pred)}
    except RuntimeError:
        return None


def fit_power_law(x, y):
    # y = a * x^b (requires x > 0, y > 0)
    def model(x, a, b):
        return a * np.power(x, b)

    x_arr = np.array(x, dtype=float)
    y_arr = np.array(y, dtype=float)
    mask = (x_arr > 0) & (y_arr > 0)
    if mask.sum() < 3:
        return None
    try:
        popt, _ = curve_fit(model, x_arr[mask], y_arr[mask], p0=[1, -0.1], maxfev=20000)
        y_pred = model(x_arr[mask], *popt)
        return {"params": {"a": popt[0], "b": popt[1]}, "r2": r_squared(y_arr[mask], y_pred)}
    except RuntimeError:
        return None


def best_fit(x, y):
    candidates = {
        "exponential": fit_exponential(x, y),
        "logarithmic": fit_logarithmic(x, y),
        "power_law": fit_power_law(x, y),
    }
    valid = {k: v for k, v in candidates.items() if v is not None}
    if not valid:
        return None, candidates
    best_name = max(valid, key=lambda k: valid[k]["r2"])
    return best_name, candidates


def shape_label(shape):
    return f"{shape['nestingOrLinksType']}={shape['nestingOrLinks']}"


results = {
    "discovery_rate_vs_run": [],
    "discovery_rate_vs_run_valid_only": [],
    "uniqueness_vs_amount": [],
    "uniqueness_vs_amount_valid_only": [],
}

print("=" * 70)
print("DISCOVERY RATE vs. RUN NUMBER (per shape, mean across 5 seeds)")
print("=" * 70)
for seq in MULTI_SEED["discoverySweep"]:
    x = [r["runIndex"] for r in seq["runs"]]
    y = [r["discoveryRatePct"]["mean"] for r in seq["runs"]]
    best_name, candidates = best_fit(x, y)
    label = shape_label(seq["shape"])
    print(f"\nShape: {label}")
    for name, fit in candidates.items():
        if fit is None:
            print(f"  {name:12s} FAILED TO CONVERGE")
        else:
            params_str = ", ".join(f"{k}={v:.4f}" for k, v in fit["params"].items())
            marker = " <- best" if name == best_name else ""
            print(f"  {name:12s} R^2={fit['r2']:.4f}  ({params_str}){marker}")
    results["discovery_rate_vs_run"].append(
        {"shape": label, "best_fit": best_name, "fits": candidates}
    )

    y_valid = [r["discoveryRatePctValidOnly"]["mean"] for r in seq["runs"]]
    best_name_v, candidates_v = best_fit(x, y_valid)
    results["discovery_rate_vs_run_valid_only"].append(
        {"shape": label, "best_fit": best_name_v, "fits": candidates_v}
    )

print()
print("=" * 70)
print("UNIQUENESS RATIO vs. AMOUNT OF SPELLS (per shape, single seed=12345)")
print("=" * 70)
for shape_key in ["flat", "nesting", "links"]:
    rows = AMOUNT_UNIQ[shape_key]
    x = [r["amount"] for r in rows]
    y = [r["uniquenessRatio"] for r in rows]
    best_name, candidates = best_fit(x, y)
    print(f"\nShape: {shape_key}")
    for name, fit in candidates.items():
        if fit is None:
            print(f"  {name:12s} FAILED TO CONVERGE")
        else:
            params_str = ", ".join(f"{k}={v:.5f}" for k, v in fit["params"].items())
            marker = " <- best" if name == best_name else ""
            print(f"  {name:12s} R^2={fit['r2']:.4f}  ({params_str}){marker}")
    results["uniqueness_vs_amount"].append(
        {"shape": shape_key, "best_fit": best_name, "fits": candidates}
    )

    y_valid = [r["uniquenessRatioValidOnly"] for r in rows]
    best_name_v, candidates_v = best_fit(x, y_valid)
    results["uniqueness_vs_amount_valid_only"].append(
        {"shape": shape_key, "best_fit": best_name_v, "fits": candidates_v}
    )

out_path = BASE / "multi-seed" / "curve-fit-results.json"
with open(out_path, "w") as f:
    json.dump(results, f, indent=2, default=lambda o: float(o))
print(f"\nWrote {out_path}")
