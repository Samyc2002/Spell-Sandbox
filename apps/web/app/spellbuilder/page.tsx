"use client";

import { useMemo, useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { Navbar } from "@/components/navbar";
import { Panel } from "@/components/panel";
import { SpellCanvas } from "@/components/spell-canvas";
import { canvasNodeToSpell, createCanvasNode, emptyBasicSpell } from "@/lib/spellbuilder";
import type { CanvasNode } from "@/lib/spellbuilder";
import { validateSpell } from "spellbox/src/core/spellValidator";
import { classifySpell } from "spellbox/src/core/spellScoring";
import { describeSpell } from "spellbox/src/core/spellDescription";

export default function SpellBuilderPage() {
	const [root, setRoot] = useState<CanvasNode>(() =>
		createCanvasNode(emptyBasicSpell(), { x: 40, y: 40 }),
	);

	const spell = useMemo(() => canvasNodeToSpell(root), [root]);
	const { issues } = useMemo(() => validateSpell(spell), [spell]);
	const { score, tier } = useMemo(() => classifySpell(spell), [spell]);
	const description = useMemo(() => describeSpell(spell), [spell]);

	const errors = issues.filter((i) => i.severity === "error");
	const warnings = issues.filter((i) => i.severity === "warning");

	return (
		<main className="dashboard-shell">
			<Navbar />
			<div className="batch-shell">
				<DashboardHeader
					title={
						<>
							Spell <span>builder</span>
						</>
					}
					lede="Draw a Spellbox spell by dragging sigils, signs, and structure pieces onto the canvas — with live validation, scoring, and a plain-language description."
				/>

				<div className="batch-layout" style={{ marginTop: 32 }}>
					<div className="batch-main">
						<div className="panel">
							<div className="panel-heading">
								<h2>Spell canvas</h2>
								<p>
									Every spell needs at least one Control sign.
									Nesting chains a single child spell inward;
									linking adds sibling branches that fire
									independently and cannot themselves carry
									further children.
								</p>
							</div>
							<SpellCanvas root={root} onChangeRoot={setRoot} />
						</div>

						<Panel title="Validation" note="Errors block the spell from being considered valid; warnings are informational.">
							{errors.length === 0 && warnings.length === 0 && (
								<p className="hint-text">No issues found.</p>
							)}
							{errors.map((issue, i) => (
								<p key={`e-${i}`} className="hint-text error-text">
									{issue.message}
								</p>
							))}
							{warnings.map((issue, i) => (
								<p key={`w-${i}`} className="hint-text warning-text">
									{issue.message}
								</p>
							))}
						</Panel>

						<Panel title="Score & description">
							<p className="run-meta">
								<span>
									Score <strong>{score.toFixed(3)}</strong>
								</span>
								<span className="tier-pill">{tier}</span>
							</p>
							<p className="preview-description">{description}</p>
						</Panel>
					</div>
				</div>
			</div>
		</main>
	);
}
