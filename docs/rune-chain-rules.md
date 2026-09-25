# Rules for the Rune-Chain Grammar

Rune-Chain is a second, independent toy grammar used as a generality check
alongside Spellbox (see [rules.md](rules.md)): it tests whether the paper's
findings about compositional depth, validity, and diversity hold for a
grammar with a *different* flavor of primitives and constraints, not just
for Spellbox's specific rule set. The two grammars are deliberately built
from unrelated vocabulary and unrelated validity/scoring logic, sharing only
the same high-level shape: a leaf unit, a nesting-equivalent composition
operator, and a linking-equivalent composition operator.

## Basic Rules

Recipes are comprised of two main elements:

1. **Reagent draw**: A reagent draw is the grammar's leaf unit, analogous to
   a Sign placement in Spellbox. Each draw pairs one of five base
   [reagents](../../packages/spellbox-cli/src/second-grammar/recipe.ts) —
   **Ash**, **Brine**, **Verdant**, **Mercuric**, and **Umbral** — with a
   **catalyst**: either **raw** or **distilled**. Distillation is
   analogous to a Sign's "reversed" flag: it doesn't change which reagent
   is used, only how it binds.
2. **Base recipe**: A base recipe is an ordered sequence of reagent draws.
   Unlike Spellbox signs (which are arranged with radial/bilateral symmetry
   around a sigil and are order-independent), a base recipe's draws are
   strictly ordered, because the binding rule below only checks *adjacent*
   pairs in that order.

In short, every base recipe must have:

1. At least one reagent draw.
2. No two **adjacent** draws that are a volatile pair, unless at least one
   of the two draws is distilled (see **Binding Rule** below).

## Binding Rule (validity)

Within a single base recipe's draw sequence, each **adjacent** pair of
reagents must be "bindable":

- Some reagent pairs are **volatile** together: `Ash+Brine`, `Ash+Verdant`,
  `Mercuric+Umbral`, `Mercuric+Brine`, and `Verdant+Umbral`. If two adjacent
  draws form one of these pairs, the recipe is invalid **unless** at least
  one of the two draws is distilled — distillation tames the volatility.
- A **warning** (not an error) is raised when a base recipe has 3 or more
  draws and *every* draw in it is raw: an all-raw recipe of that length is
  considered unstable, mirroring Spellbox's softer warning-level issues.

This is intentionally a different (not copy-pasted) constraint from
Spellbox's sigil-compatibility table: it operates on sequence adjacency
rather than a fixed pairwise lookup over the whole composition, and it
depends on order, not just membership.

## Advanced Composition Systems

### Refinement (nesting-equivalent)

Refinement wraps a "core" recipe inside an outer shell recipe: the shell's
own draws surround and compound the core recipe's effect. Each level of
refinement is one nesting level, exactly as Spellbox's nested glyphs
resolve from the innermost spell outward. A refined recipe's shell draws
are still subject to the adjacency binding rule independently of its core.

**Over-refinement constraint**: a shell's outermost draw must not repeat
the same *raw* reagent as its immediate parent shell's outermost draw. Two
adjacent refinement levels both using the same raw reagent "curdles the
batch" and is an error. This makes validity meaningfully sensitive to
refinement depth — deeper refinement chains are more likely to trip this
rule — mirroring Spellbox's expectation that validity falls as
compositional depth rises.

### Chaining (linking-equivalent)

Chaining sequences multiple independent recipes side by side. Each link in
a chain is fully independent of the others — not nested inside them — and
retains its own effect, analogous to Spellbox's linked spells firing
simultaneously without combining. A chain where two **adjacent** links
share the exact same outermost reagent *and* catalyst is flagged as a
warning ("wasted link"): redundant chaining that adds width without adding
distinct effect.

### Mutual exclusivity

As with Spellbox, a recipe is either refined (nested) or chained (linked)
at generation time, never both in the same structure — this keeps the two
composition axes cleanly separable when sweeping refinement depth and
chain width independently.

## Structural Signature

Every recipe has a deterministic structural signature: a canonical string
encoding its full shape (refinement nesting, chain links, and each base
recipe's ordered draws, abbreviated as `<Reagent-initial><r|d>`, e.g. `Ard`
for a distilled Ash draw). Two recipes with the same signature are
structurally identical for discovery-rate and uniqueness purposes,
regardless of which random seed produced them — the same role Spellbox's
own spell signature plays.

## Scoring

Rune-Chain uses its own weighted raw score, an independent judgment call
from Spellbox's weights, on purpose:

- Each reagent draw is the mandatory baseline unit, so it is the cheapest
  contribution to score.
- A distilled catalyst requires extra process precision, so it costs more
  than a raw draw of the same reagent.
- Refinement (nesting-equivalent) compounds the whole recipe's potency
  inside another shell, so each level is weighted heavily — mirroring
  Spellbox nesting's "boosts power" design note.
- Chaining (linking-equivalent) just adds more independent, parallel
  recipes: more scale, not more power per recipe, so each link beyond the
  first is weighted lightly.

The raw score is then bounded into `[0, 1)` with the same exponential
normalization shape used elsewhere in the project.

## Architectural Decisions

1. Recipes are represented internally as structured TypeScript objects
   (`BaseRecipe | RefinedRecipe | ChainedRecipe`), the same
   representation strategy Spellbox uses for `BasicSpell`.
2. Randomly generated and (future) hand-authored recipes share the same
   representation.
3. A base recipe always draws a small, fixed number of reagents (2), and
   each refinement level or chain link adds exactly one more draw. This is
   deliberate, not an arbitrary simplification: with a larger or randomized
   per-unit branching factor, the structural-signature space would grow so
   fast that uniqueness/discovery-rate metrics would flatline at 100% for
   almost any nonzero depth, hiding the very saturation curve the sweeps
   are trying to measure. The fixed small branching factor keeps the
   signature space's growth (roughly `10^(2 + depth)`) comparable to the
   sweep sample sizes actually used (~1,200–36,000) across swept depths
   (0–12).
4. Validity and scoring logic are independently designed from Spellbox's
   (not copy-pasted or parameter-swapped), so that agreement between the
   two grammars' findings is evidence of a genuine generality result rather
   than an artifact of reusing the same rule shape.

## Relationship to Spellbox

| Spellbox concept        | Rune-Chain equivalent                     |
| ------------------------ | ------------------------------------------ |
| Sign / Sigil placement   | Reagent draw (reagent + catalyst)          |
| Reversed sign            | Distilled catalyst                         |
| Sigil compatibility table| Adjacency binding rule (volatile pairs)    |
| Nested glyph             | Refinement (shell wraps a core)            |
| Linked spell             | Chained recipe (independent links)         |
| Spell signature          | Recipe signature                           |
| Complexity score/tier    | Raw score / normalized score               |
| Validation errors/warnings | Validation errors/warnings (own rules)   |

The two grammars intentionally diverge everywhere they aren't required to
match, so that any shared behavior found in the paper's analysis (e.g.
validity declining with depth, or diversity saturating past a certain
composition size) reflects something about compositional rule systems in
general, not something specific to Spellbox's particular sigils and signs.
