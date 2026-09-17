# Spell Sandbox Plan

**RESEARCH GOAL**: Design and implement a compositional spell-construction system based on a small set of primitive building blocks and transformation rules, then analyze the expressive range of the resulting spell space by measuring complexity, diversity, and emergent behaviors as compositions increase.

## Personal Goal

Build a lightweight sandbox for creating spells from a limited set of primitive components and composition rules, then study the space of spells that emerge from those rules.

The project aims to answer the following questions:

1. How many distinct spells can be generated from a given rule set?
2. Does the system produce meaningful diversity, or do generated spells eventually converge to similar outcomes?
3. Which rules contribute most to the expansion of the spell space?
4. Can a small set of primitives generate a surprisingly large range of behaviors?
5. Is the resulting spell space finite, countably infinite, or effectively bounded by behavioral equivalence?

### Scope

The sandbox will:

- Define a set of primitive spell components.
- Define composition rules for combining components.
- Represent spells as structured objects.
- Generate valid spell combinations automatically.
- Compute metrics for generated spells.
- Visualize the resulting spell space.

## Working Hypothesis

A relatively small set of compositional rules can generate a disproportionately large and diverse spell space, but beyond a certain level of composition the system will exhibit convergence, where additional complexity produces diminishing behavioral novelty.

## Core Research Artifact

The primary deliverable of this project is not the spell sandbox itself. The sandbox exists as an experimental environment for studying the expressive range of compositional rule systems. The main outcome of the project is expected to be:

- A formalized rule set
- A spell generation framework
- Quantitative analysis of generated spells
- Visualizations of the resulting spell space
- Findings regarding diversity, convergence, and scalability

## References/Motivations

The majority of the motivation for this project lies in the [Witch Hat Atlier](https://www.netflix.com/in/title/82741721) Magic system and the creativity of the magic displayed by Rudeus in [Mushoku Tensei](https://www.crunchyroll.com/series/G24H1N3MP/mushoku-tensei-jobless-reincarnation). As such, here's a reference material to understand the rules for the Magic System in Witch Hat Atlier: <https://witch-hat-atelier.fandom.com/wiki/Magic>

## Design Philosophy

This project is inspired by fictional magic systems that emphasize composition and creativity. The objective is not to reproduce any specific magic system, but to explore how a small set of composable primitives can generate a wide range of magical effects and behaviors.

## Metrics

Metrics currently being collected on generated and hand-authored spells:

- **Structural features**: sign counts by category (Control / Manifestation / Transformation), the multiset of specific signs used, reversed-sign count, central-symbol composition (element, transformation-as-core, or Radial composition), nesting depth, and linked-branch count.
- **Complexity score**: a weighted score over the structural features above, classifying each spell into a tier (e.g. Cantrip / Apprentice / Adept / Master).
- **Similarity**: a breakdown comparing two spells along separate effect axes like element, delivery (Manifestation), movement (Control), transformation, and structural shape, rather than a single blended number.
- **Diff**: a positional, node-by-node comparison between two spells reporting symbol changes, signs added/removed, and nesting differences.
- **Validation status**: errors and warnings (e.g. missing Control sign, incompatible sigil composition, illegal nesting+linking) reported alongside the above.

**NOTE**: Complexity score is also being normalized and the normalization function used might also affect the results. Hence, that is another point we need to check on while running the mass simulations.

## Future Work

Potential future directions include:

- Environmental interaction systems
- World-state propagation
- NPC spell generation
- Procedural content generation using the same rule framework
- Integration into Helios
- User-facing visual spell editor
