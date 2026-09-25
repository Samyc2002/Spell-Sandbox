# Valid-Only Metrics Rerun: Data for Review

This file collects the corrected, validity-gated data from the full experiment
rerun, for review before it gets folded into `research-paper.md`. Nothing in
`compiled-analysis.md` was touched or used to produce these numbers; all of it
comes from freshly regenerated JSON in `test_files/spell-sweeps/` and
`packages/spellbox-cli/out/`, produced by the newly-added `*ValidOnly` /
`*ValidSignatures` fields.

**Background:** every uniqueness-ratio and discovery-rate metric in the
original paper counted a spell's signature as "unique" or "newly discovered"
regardless of whether that spell was structurally *valid*. This file reports
the same metrics recomputed with a validity gate: `uniquenessRatioValidOnly =
uniqueValidSignatures / validCount` (fraction of *valid* spells that are also
unique) and `discoveryRatePctValidOnly = newValidCount / validTotal` per run
(fraction of *valid* spells in a batch that are newly-seen valid signatures).
The original (unfiltered) metric is kept alongside every corrected one below
so the two can be compared directly.

---

## 1. Depth sweep: uniqueness ratio, all-spells vs. valid-only (n=5 seeds, amount=1200)

**Nesting:**

| Depth | Validity % | Uniqueness (all) | Uniqueness (valid-only) | Δ |
| :---: | :---: | :---: | :---: | :---: |
| 0  | 87.9 | 0.7778 | 0.7659 | −0.0119 |
| 5  | 72.0 | 0.9582 | 0.9463 | −0.0119 |
| 10 | 56.0 | 0.9900 | 0.9833 | −0.0067 |
| 15 | 44.3 | 0.9960 | 0.9925 | −0.0035 |
| 20 | 36.1 | 0.9972 | 0.9920 | −0.0052 |
| 25 | 29.7 | 0.9983 | 0.9949 | −0.0034 |
| 30 | 25.7 | 0.9985 | 0.9941 | −0.0044 |

**Links:**

| Depth | Validity % | Uniqueness (all) | Uniqueness (valid-only) | Δ |
| :---: | :---: | :---: | :---: | :---: |
| 0  | 87.9 | 0.7778 | 0.7659 | −0.0119 |
| 5  | 71.6 | 0.9687 | 0.9611 | −0.0076 |
| 10 | 57.5 | 0.9892 | 0.9828 | −0.0064 |
| 15 | 45.1 | 0.9948 | 0.9889 | −0.0059 |
| 20 | 36.2 | 0.9970 | 0.9922 | −0.0048 |
| 25 | 31.1 | 0.9977 | 0.9923 | −0.0054 |
| 30 | 25.1 | 0.9992 | 0.9968 | −0.0024 |

**Takeaway:** uniqueness ratio moves very little once filtered to valid-only
(at most ~1.2 points). Section 3.2's original claim ("uniqueness rises with
depth because the reachable space explodes") appears to survive essentially
intact — the bug did not meaningfully distort this particular metric.

---

## 2. Discovery-rate sequences: all-spells vs. valid-only (n=5 seed-anchors, 30 re-rolls)

Selected run indices per shape (full data in
`test_files/spell-sweeps/multi-seed/multi-seed-results.json`,
`discoverySweep[].runs[].discoveryRatePctValidOnly`):

**nesting=0 (flat baseline)**

| Run | All-spells (mean ± std) | Valid-only (mean ± std) |
| :---: | :---: | :---: |
| 1  | 79.37 ± 1.93 | 78.24 ± 2.11 |
| 5  | 43.70 ± 1.06 | 42.99 ± 1.08 |
| 10 | 31.30 ± 1.13 | 30.15 ± 1.16 |
| 15 | 22.47 ± 1.63 | 20.92 ± 1.92 |
| 20 | 18.43 ± 0.37 | 17.18 ± 0.59 |
| 25 | 14.27 ± 0.49 | 12.93 ± 0.68 |
| 30 | 12.38 ± 0.75 | 11.14 ± 0.91 |

**nesting=5**

| Run | All-spells | Valid-only |
| :---: | :---: | :---: |
| 1  | 96.63 ± 0.36 | 95.71 ± 0.42 |
| 5  | 86.83 ± 0.39 | 83.77 ± 0.50 |
| 10 | 83.68 ± 0.61 | 79.60 ± 0.71 |
| 15 | 80.55 ± 1.29 | 76.03 ± 1.46 |
| 20 | 79.25 ± 0.70 | 73.87 ± 1.12 |
| 25 | 78.03 ± 1.20 | 72.92 ± 1.24 |
| 30 | 76.23 ± 1.07 | 71.04 ± 1.36 |

**nesting=10**

| Run | All-spells | Valid-only |
| :---: | :---: | :---: |
| 1  | 99.13 ± 0.29 | 98.47 ± 0.49 |
| 5  | 94.47 ± 0.73 | 91.13 ± 1.34 |
| 10 | 92.40 ± 0.77 | 87.49 ± 1.72 |
| 15 | 91.08 ± 0.92 | 85.62 ± 1.21 |
| 20 | 90.57 ± 0.36 | 84.69 ± 0.59 |
| 25 | 89.25 ± 1.00 | 82.61 ± 1.46 |
| 30 | 89.20 ± 0.90 | 82.94 ± 0.77 |

**nesting=20**

| Run | All-spells | Valid-only |
| :---: | :---: | :---: |
| 1  | 99.57 ± 0.16 | 98.87 ± 0.44 |
| 5  | 98.02 ± 0.24 | 94.79 ± 0.71 |
| 10 | 97.10 ± 0.27 | 92.69 ± 0.65 |
| 15 | 96.52 ± 0.47 | 91.17 ± 1.20 |
| 20 | 95.43 ± 0.64 | 88.91 ± 1.25 |
| 25 | 96.13 ± 0.71 | 90.62 ± 1.68 |
| 30 | 95.65 ± 0.36 | 89.16 ± 0.50 |

**links=5**

| Run | All-spells | Valid-only |
| :---: | :---: | :---: |
| 1  | 96.53 ± 0.75 | 95.50 ± 1.10 |
| 5  | 86.63 ± 0.61 | 83.38 ± 0.56 |
| 10 | 84.15 ± 1.46 | 80.46 ± 2.00 |
| 15 | 81.47 ± 1.17 | 76.61 ± 1.69 |
| 20 | 78.52 ± 1.19 | 73.13 ± 1.49 |
| 25 | 77.65 ± 0.57 | 72.80 ± 0.96 |
| 30 | 76.55 ± 0.68 | 70.62 ± 0.91 |

**links=10**

| Run | All-spells | Valid-only |
| :---: | :---: | :---: |
| 1  | 98.88 ± 0.45 | 98.29 ± 0.80 |
| 5  | 94.30 ± 0.28 | 90.75 ± 0.39 |
| 10 | 92.20 ± 0.93 | 87.41 ± 1.44 |
| 15 | 91.07 ± 1.35 | 85.73 ± 1.67 |
| 20 | 90.15 ± 0.76 | 84.37 ± 1.04 |
| 25 | 89.37 ± 0.89 | 83.37 ± 1.40 |
| 30 | 89.05 ± 0.39 | 82.38 ± 0.92 |

**links=20**

| Run | All-spells | Valid-only |
| :---: | :---: | :---: |
| 1  | 99.70 ± 0.19 | 99.20 ± 0.46 |
| 5  | 97.88 ± 0.29 | 94.69 ± 0.85 |
| 10 | 96.68 ± 0.28 | 91.90 ± 0.81 |
| 15 | 96.47 ± 0.46 | 91.09 ± 1.28 |
| 20 | 95.68 ± 0.99 | 89.11 ± 2.37 |
| 25 | 96.05 ± 0.90 | 90.58 ± 2.04 |
| 30 | 95.32 ± 0.72 | 88.42 ± 1.24 |

**Takeaway:** this is where the bug actually mattered. The gap between
all-spells and valid-only discovery rate grows with depth: at run 30, it's
~1.2 points at flat (12.4 → 11.1), but 6.5-7.0 points at depth 20 (95.7 → 89.2
nesting; 95.3 → 88.4 links). The original "sustained high discovery rate at
high depth" claim was real but modestly overstated — the corrected numbers
are still 76-89 percentage points above the flat baseline at run 30, so **H1
still holds**, but the exact magnitude quoted in the original abstract/Section
3.3 (64-83 point gap) needs updating to reflect the valid-only figures (now
roughly 60-78 points, using flat-valid-only 11.1% vs. compositional-valid-only
70.6-89.2% at run 30).

---

## 3. Ablation table, all-spells vs. valid-only

| Configuration | Validity % | Uniqueness (all) | Uniqueness (valid-only) | Discovery final (all) | Discovery final (valid-only) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Flat (depth=0) | 87.9 | 0.7778 | 0.7659 | 12.4 | 11.1 |
| Nesting-only (depth=5) | 72.0 | 0.9582 | 0.9463 | 76.2 | 71.0 |
| Linking-only (depth=5) | 71.6 | 0.9687 | 0.9611 | 76.5 | 70.6 |
| Nesting-only (depth=10) | 56.0 | 0.9900 | 0.9833 | 89.2 | 82.9 |
| Linking-only (depth=10) | 57.5 | 0.9892 | 0.9828 | 89.0 | 82.4 |
| Nesting-only (depth=20) | 36.1 | 0.9972 | 0.9920 | 95.7 | 89.2 |
| Linking-only (depth=20) | 36.2 | 0.9970 | 0.9922 | 95.3 | 88.4 |

**Takeaway:** nesting and linking remain functionally interchangeable under
the corrected metric too (within ~0.6 points of each other at every depth) —
Section 3.5's conclusion is unaffected.

---

## 4. Constraint-aware generator comparison (Section 3.8), all-spells vs. valid-only

| Depth | Generator | Validity % | Uniqueness (all) | Uniqueness (valid-only) |
| :---: | :--- | :---: | :---: | :---: |
| 0  | baseline | 87.90 | 0.7778 | 0.7659 |
| 0  | constraint-aware | 93.63 | 0.7785 | 0.7697 |
| 10 | baseline | 56.00 | 0.9900 | 0.9833 |
| 10 | constraint-aware | 71.95 | 0.9905 | 0.9868 |
| 20 | baseline | 36.10 | 0.9972 | 0.9920 |
| 20 | constraint-aware | 55.02 | 0.9963 | 0.9933 |
| 30 | baseline | 25.70 | 0.9985 | 0.9941 |
| 30 | constraint-aware | 43.38 | 0.9987 | 0.9970 |

Discovery rate, final run (nesting shapes only):

| Depth | Generator | Discovery final (all) | Discovery final (valid-only) |
| :---: | :--- | :---: | :---: |
| 0  | baseline | 12.38 | 11.14 |
| 0  | constraint-aware | 11.87 | 10.28 |
| 10 | baseline | 89.20 | 82.94 |
| 10 | constraint-aware | 89.08 | 85.59 |
| 20 | baseline | 95.65 | 89.16 |
| 20 | constraint-aware | 95.60 | 92.27 |

**Takeaway:** the paper's claim that discovery rate is "essentially unchanged
between generators" still holds under the all-spells metric, but under
valid-only, constraint-aware pulls noticeably *ahead* of baseline at depth 20
(92.27% vs. 89.16%, a 3.1-point gap) — because it has fewer invalid spells
being silently excluded from the "valid" denominator, its valid-only discovery
rate looks better. This is a new, mildly interesting finding not present in
the original draft: the constraint-aware fix helps valid-only discovery rate
a bit at high depth, on top of its already-reported validity gain.

---

## 5. Second grammar (Rune-Chain), refinement + chaining, all-spells vs. valid-only

**Refinement (nesting-equivalent):**

| Depth | Validity % | Uniqueness % (all) | Uniqueness % (valid-only) |
| :---: | :---: | :---: | :---: |
| 0  | 89.5 | 8.3   | 8.4   |
| 2  | 85.6 | 94.2  | 94.2  |
| 4  | 77.6 | 99.9  | 100.0 |
| 6  | 71.2 | 100.0 | 100.0 |
| 8  | 64.0 | 100.0 | 100.0 |
| 10 | 57.8 | 100.0 | 100.0 |
| 12 | 52.6 | 100.0 | 100.0 |

**Chaining (linking-equivalent, validity pinned ~100% by design):**

| Depth | Validity % | Uniqueness % (all) | Uniqueness % (valid-only) |
| :---: | :---: | :---: | :---: |
| 0  | 89.5 | 8.3   | 8.4   |
| 2  | 100  | 58.1  | 58.1  |
| 4  | 100  | 99.5  | 99.5  |
| 6  | 100  | 100   | 100   |
| 8  | 100  | 100   | 100   |
| 10 | 100  | 100   | 100   |
| 12 | 100  | 100   | 100   |

Discovery rate, run 1 vs. run 30 (all-spells vs. valid-only), selected shapes:

| Shape | Run 1 (all) | Run 1 (valid-only) | Run 30 (all) | Run 30 (valid-only) |
| :--- | :---: | :---: | :---: | :---: |
| refinement=0 | 8.3  | 8.3  | 0    | 0    |
| refinement=2 | 94.2 | 94.3 | 2.8  | 2.9  |
| refinement=4 | 99.9 | 99.9 | 96.6 | 96.7 |
| refinement=8 | 100  | 100  | 100  | 100  |
| chaining=2   | 58.1 | 58.1 | 0    | 0    |
| chaining=4   | 99.4 | 99.4 | 69.5 | 69.5 |
| chaining=8   | 100  | 100  | 100  | 100  |

**Takeaway:** this is the internal-consistency check that was expected in
advance — since chaining's validity is pinned at ~100% (chain-adjacency
violations are warnings, not hard errors, per Section 3.6/3.7 of the original
paper), its valid-only numbers are identical to its all-spells numbers to
within noise. Refinement, which does have real validity loss, shows the same
pattern as Spellbox: negligible movement, because refinement's validity stays
fairly high (52.6-89.5%) across the tested range. This confirms the fix
behaves exactly as expected where the pre-existing bug should have had zero
effect, which is reassuring evidence the fix itself is implemented correctly
rather than just producing different numbers for unrelated reasons.

---

## 6. Effective-vs-nominal search-space (Section 3.10), all-spells vs. valid-only

**Occupancy-inverted effective space, review-round2 data:**

| Depth | Nominal space | Effective space (all-spells, mean) | Effective space (valid-only, mean) | Gap, all (orders of mag.) | Gap, valid-only (orders of mag.) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 0  | 3.03 × 10⁴   | 1.06 × 10⁴ | 0.877 × 10⁴ | 0.5  | 0.5  |
| 5  | 7.66 × 10²⁶  | 1.08 × 10⁵ | 0.602 × 10⁵ | 21.9 | 22.1 |
| 10 | 1.94 × 10⁵²  | 2.63 × 10⁵ | 0.870 × 10⁵ | 43.9 | 44.3 |
| 20 | 1.25 × 10¹⁰³ | 6.84 × 10⁵ | 0.966 × 10⁵ | 88.3 | 89.1 |

**Takeaway:** the headline "gap in orders of magnitude" is barely affected
(88.3 → 89.1 at depth 20), since it's a log-scale measure against an
astronomically large nominal space. But the *absolute* effective-space
estimate at depth 20 shrinks by a factor of ~7 once filtered to valid-only
(684K → 96.6K) — the true effective space the sampler explores, restricted to
spells that are actually valid, is substantially smaller than the original
paper reported. This strengthens (not weakens) Section 3.10's overall
argument that the sampler explores a far smaller space than the nominal bound
suggests.

**Search-space exploration percentage (tier_analysis.py), all-spells vs. valid-only:**

| Depth | Theoretical space upper bound | Observed unique (all, @1200 samples) | Observed unique (valid-only, @~validCount samples) | % explored (all) | % explored (valid-only) |
| :---: | :---: | :---: | :---: | :---: | :---: |
| 0  | 3.03 × 10⁴   | 933  | 808 | 3.08 × 10⁰   | 2.67 × 10⁰   |
| 5  | 7.66 × 10²⁶  | 1150 | 817 | 1.50 × 10⁻²² | 1.07 × 10⁻²² |
| 10 | 1.94 × 10⁵²  | 1188 | 661 | 6.12 × 10⁻⁴⁵ | 3.41 × 10⁻⁴⁵ |
| 20 | 1.25 × 10¹⁰³ | 1197 | 430 | 9.61 × 10⁻⁹⁰ | 3.45 × 10⁻⁹⁰ |

---

## 7. AIC/BIC per-seed curve-fit winners (Section 3.3 methodology), all-spells vs. valid-only

| Shape | All-spells: Exp / Log / Power wins (of 5) | Valid-only: Exp / Log / Power wins (of 5) |
| :--- | :---: | :---: |
| nesting=0  | 0 / 5 / 0 | 0 / 5 / 0 |
| nesting=5  | 0 / 5 / 0 | 0 / 5 / 0 |
| nesting=10 | 0 / 3 / 2 | 0 / 3 / 2 |
| nesting=20 | 0 / 3 / 2 | 2 / 1 / 2 |
| links=5    | 0 / 4 / 1 | 0 / 5 / 0 |
| links=10   | 0 / 4 / 1 | 0 / 4 / 1 |
| links=20   | 2 / 3 / 0 | 2 / 2 / 1 |

**Takeaway:** logarithmic remains the majority or tied winner in 6 of 7
shapes; only nesting=20 shows a real shift (from a 3/2 log/power split to a
2/1/2 three-way split), likely due to noisier valid-only run-to-run counts at
high depth (fewer valid spells per batch to compute the ratio from). The
qualitative conclusion — "logarithmic decay is the best-supported model once
parameter count is penalized" — is not overturned but is somewhat less clean
under valid-only data.

---

## Sources

- `test_files/spell-sweeps/multi-seed/multi-seed-results.json` (regenerated via `runMultiSeed.ts`)
- `test_files/spell-sweeps/multi-seed/amount-uniqueness.json` (regenerated via `runAmountUniquenessSweep.ts`)
- `test_files/spell-sweeps/review_round2_results.json` (regenerated via `runReviewRound2.ts` + `review_round2_analysis.py`)
- `packages/spellbox-cli/out/generator-comparison/generator-comparison.json` (regenerated via `runGeneratorComparison.ts`)
- `packages/spellbox-cli/out/rune-chain-results.json` (regenerated via `runRuneChainSweeps.ts`)
- `test_files/spell-sweeps/tier_analysis_results.json` (regenerated via `tier_analysis.py`)
- `test_files/spell-sweeps/multi-seed/curve-fit-results.json` (regenerated via `curve_fit.py`)

`docs/reports/compiled-analysis.md` was not read, used, or modified in producing any of the above.
