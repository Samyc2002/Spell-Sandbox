"use client";

import { useState } from "react";
import type { PlacedSign, Sigil, Sign, Transformation } from "spellbox/src/models/spell";
import {
	CONTROL_SIGNS,
	MANIFESTATION_SIGNS,
	TRANSFORMATION_SIGNS,
	SIGILS,
	isCompositionSymbol,
	signCategoryOf,
	signIconPath,
	sigilIconPath,
	type CanvasNode,
} from "@/lib/spellbuilder";

const OUTER_RADIUS = 96;
const CONTROL_RADIUS = 56;
const MANIFEST_RADIUS = 78;
const CENTER = 130;
const VIEWBOX = 260;

function ringPosition(radius: number, angleDeg: number) {
	const rad = (angleDeg - 90) * (Math.PI / 180);
	return { x: CENTER + radius * Math.cos(rad), y: CENTER + radius * Math.sin(rad) };
}

/**
 * One spell drawn as an actual magic circle: a closed ring, a central
 * symbol, control signs on an inner ring and manifestation signs
 * interleaved on an outer ring — the exact layout described in
 * docs/rules.md, evenly auto-spaced rather than freely dragged.
 */
export function MagicCircle({
	node,
	size = VIEWBOX,
	interactive = true,
	onChangeNode,
	nestedScale = 0.52,
}: {
	node: CanvasNode;
	size?: number;
	interactive?: boolean;
	onChangeNode?: (next: CanvasNode) => void;
	nestedScale?: number;
}) {
	const { spell } = node;
	const [pickerOpen, setPickerOpen] = useState<"symbol" | number | "add" | null>(null);

	const composition = isCompositionSymbol(spell.symbol) ? spell.symbol : null;
	const isBareSigil = (["Air", "Water", "Earth", "Fire", "Light"] as string[]).includes(
		spell.symbol as string,
	);
	const symbolIcon = composition
		? null
		: isBareSigil
			? sigilIconPath(spell.symbol as Sigil)
			: signIconPath(spell.symbol as Transformation);

	const controlSigns = spell.sign
		.map((p, i) => ({ ...p, index: i }))
		.filter((p) => signCategoryOf(p.sign) === "control");
	const manifestSigns = spell.sign
		.map((p, i) => ({ ...p, index: i }))
		.filter((p) => signCategoryOf(p.sign) === "manifestation");
	const otherTransformSigns = spell.sign
		.map((p, i) => ({ ...p, index: i }))
		.filter((p) => signCategoryOf(p.sign) === "transformation");

	const nestedChild =
		node.children && !node.linked && node.children.length > 0 ? node.children[0] : null;

	function changeSpell(next: CanvasNode["spell"]) {
		onChangeNode?.({ ...node, spell: next });
	}

	function setSymbol(next: CanvasNode["spell"]["symbol"]) {
		changeSpell({ ...spell, symbol: next });
		setPickerOpen(null);
	}

	function addSign(sign: Sign) {
		changeSpell({ ...spell, sign: [...spell.sign, { sign }] });
		setPickerOpen(null);
	}

	function toggleReversed(index: number) {
		changeSpell({
			...spell,
			sign: spell.sign.map((p, i) => (i === index ? { ...p, reversed: !p.reversed } : p)),
		});
	}

	function removeSign(index: number) {
		changeSpell({ ...spell, sign: spell.sign.filter((_, i) => i !== index) });
		setPickerOpen(null);
	}

	const ringComplete = controlSigns.length >= 1;

	return (
		<div className="magic-circle-wrap" style={{ width: size, height: size }}>
			<svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} width={size} height={size} className="magic-circle-svg">
				<circle
					cx={CENTER}
					cy={CENTER}
					r={OUTER_RADIUS}
					className={`ring-outer ${ringComplete ? "ring-complete" : "ring-broken"}`}
					strokeDasharray={ringComplete ? undefined : "6 7"}
				/>
				<circle cx={CENTER} cy={CENTER} r={CONTROL_RADIUS - 16} className="ring-guide" />

				{controlSigns.map((placed, order) =>
					renderSignGlyph(placed, order, controlSigns.length, CONTROL_RADIUS, "control", {
						interactive,
						onClick: () => interactive && setPickerOpen(placed.index),
					}),
				)}
				{manifestSigns.map((placed, order) =>
					renderSignGlyph(
						placed,
						order,
						manifestSigns.length,
						MANIFEST_RADIUS,
						"manifestation",
						{ interactive, onClick: () => interactive && setPickerOpen(placed.index) },
						manifestSigns.length > 0 ? 180 / manifestSigns.length : 0,
					),
				)}
				{otherTransformSigns.map((placed, order) =>
					renderSignGlyph(
						placed,
						order,
						otherTransformSigns.length,
						(CONTROL_RADIUS + MANIFEST_RADIUS) / 2,
						"transformation",
						{ interactive, onClick: () => interactive && setPickerOpen(placed.index) },
					),
				)}

				{!nestedChild && (
					<g
						className={`central-symbol ${interactive ? "clickable" : ""}`}
						onClick={() => interactive && setPickerOpen("symbol")}
					>
						<circle cx={CENTER} cy={CENTER} r={22} className="central-symbol-hit" />
						{composition ? (
							<>
								<image
									href={sigilIconPath(composition.sigils[0])}
									x={CENTER - 34}
									y={CENTER - 16}
									width={30}
									height={30}
								/>
								<image
									href={sigilIconPath(composition.sigils[1])}
									x={CENTER + 4}
									y={CENTER - 16}
									width={30}
									height={30}
								/>
								<text x={CENTER} y={CENTER + 4} textAnchor="middle" className="composition-plus-glyph">
									+
								</text>
							</>
						) : (
							<image
								href={symbolIcon!}
								x={CENTER - 20}
								y={CENTER - 20}
								width={40}
								height={40}
							/>
						)}
					</g>
				)}

				{interactive && (
					<g
						className="add-sign-target"
						transform={`translate(${ringPosition(OUTER_RADIUS + 16, 0).x} ${
							ringPosition(OUTER_RADIUS + 16, 0).y
						})`}
						onClick={() => setPickerOpen("add")}
					>
						<circle r={11} className="add-sign-target-circle" />
						<text textAnchor="middle" dominantBaseline="central" className="add-sign-target-plus">
							+
						</text>
					</g>
				)}
			</svg>

			{nestedChild && onChangeNode && (
				<div
					className="nested-circle-mount"
					style={{ width: size * nestedScale, height: size * nestedScale }}
				>
					<MagicCircle
						node={nestedChild}
						size={size * nestedScale}
						interactive={interactive}
						onChangeNode={(next) => onChangeNode({ ...node, children: [next] })}
						nestedScale={nestedScale}
					/>
				</div>
			)}

			{pickerOpen !== null && interactive && (
				<SignPicker
					mode={pickerOpen}
					currentSign={typeof pickerOpen === "number" ? spell.sign[pickerOpen] : undefined}
					onPickSymbol={setSymbol}
					onPickSign={addSign}
					onToggleReversed={() => typeof pickerOpen === "number" && toggleReversed(pickerOpen)}
					onRemove={() => typeof pickerOpen === "number" && removeSign(pickerOpen)}
					onClose={() => setPickerOpen(null)}
				/>
			)}
		</div>
	);
}

function renderSignGlyph(
	placed: PlacedSign<Sign> & { index: number },
	order: number,
	total: number,
	radius: number,
	category: string,
	handlers: { interactive: boolean; onClick: () => void },
	angleOffset = 0,
) {
	const angle = total > 0 ? (360 / total) * order + angleOffset : 0;
	const { x, y } = ringPosition(radius, angle);
	const rotation = placed.reversed ? angle + 180 : angle;
	return (
		<g
			key={placed.index}
			transform={`translate(${x} ${y}) rotate(${rotation})`}
			className={`sign-glyph sign-glyph-${category} ${handlers.interactive ? "clickable" : ""}`}
			onClick={handlers.onClick}
		>
			<image href={signIconPath(placed.sign)} x={-11} y={-11} width={22} height={22} />
		</g>
	);
}

function SignPicker({
	mode,
	currentSign,
	onPickSymbol,
	onPickSign,
	onToggleReversed,
	onRemove,
	onClose,
}: {
	mode: "symbol" | number | "add";
	currentSign?: PlacedSign<Sign>;
	onPickSymbol: (symbol: CanvasNode["spell"]["symbol"]) => void;
	onPickSign: (sign: Sign) => void;
	onToggleReversed: () => void;
	onRemove: () => void;
	onClose: () => void;
}) {
	return (
		<div className="sign-picker-overlay" onClick={onClose}>
			<div className="sign-picker" onClick={(e) => e.stopPropagation()}>
				{mode === "symbol" && (
					<>
						<p className="field-caption">Central symbol</p>
						<div className="picker-grid">
							{SIGILS.map((s) => (
								<button key={s} className="picker-item" onClick={() => onPickSymbol(s)}>
									<img src={sigilIconPath(s)} alt="" width={24} height={24} />
									<span>{s}</span>
								</button>
							))}
							{TRANSFORMATION_SIGNS.map((s) => (
								<button key={s} className="picker-item" onClick={() => onPickSymbol(s)}>
									<img src={signIconPath(s)} alt="" width={24} height={24} />
									<span>{s}</span>
								</button>
							))}
							<button
								className="picker-item"
								onClick={() =>
									onPickSymbol({ composition: "Radial", sigils: ["Air", "Water"] })
								}
							>
								<img src={signIconPath("Radial")} alt="" width={24} height={24} />
								<span>Radial</span>
							</button>
						</div>
					</>
				)}
				{mode === "add" && (
					<>
						<p className="field-caption">Control signs</p>
						<div className="picker-grid">
							{CONTROL_SIGNS.map((s) => (
								<button key={s} className="picker-item" onClick={() => onPickSign(s)}>
									<img src={signIconPath(s)} alt="" width={24} height={24} />
									<span>{s}</span>
								</button>
							))}
						</div>
						<p className="field-caption">Manifestation signs</p>
						<div className="picker-grid">
							{MANIFESTATION_SIGNS.map((s) => (
								<button key={s} className="picker-item" onClick={() => onPickSign(s)}>
									<img src={signIconPath(s)} alt="" width={24} height={24} />
									<span>{s}</span>
								</button>
							))}
						</div>
						<p className="field-caption">Transformation signs</p>
						<div className="picker-grid">
							{TRANSFORMATION_SIGNS.map((s) => (
								<button key={s} className="picker-item" onClick={() => onPickSign(s)}>
									<img src={signIconPath(s)} alt="" width={24} height={24} />
									<span>{s}</span>
								</button>
							))}
						</div>
					</>
				)}
				{typeof mode === "number" && currentSign && (
					<>
						<p className="field-caption">{currentSign.sign}</p>
						<div className="picker-actions">
							<button className="picker-action" onClick={onToggleReversed}>
								{currentSign.reversed ? "Un-reverse" : "Reverse"}
							</button>
							<button className="picker-action picker-action-danger" onClick={onRemove}>
								Remove
							</button>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
