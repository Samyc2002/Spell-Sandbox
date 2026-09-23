"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NORMALIZATION_TYPES } from "spellbox/src/constants";
import { createEmptyConfig, type BatchConfig } from "@/lib/batch";

const ALL_NORMALIZATIONS = Object.values(NORMALIZATION_TYPES).filter(
	(type) => type !== "none",
);

export function MatrixBuilder({
	onGenerate,
}: {
	onGenerate: (configs: BatchConfig[]) => void;
}) {
	const [amounts, setAmounts] = useState("12, 120, 1200, 12000, 120000");
	const [depth, setDepth] = useState("4");
	const [seed, setSeed] = useState("12345");
	const [nestingOrLinksType, setNestingOrLinksType] = useState<
		"nesting" | "links"
	>("nesting");
	const [normalizations, setNormalizations] = useState<Set<string>>(
		new Set(ALL_NORMALIZATIONS),
	);

	const toggleNormalization = (type: string) => {
		setNormalizations((prev) => {
			const next = new Set(prev);
			if (next.has(type)) next.delete(type);
			else next.add(type);
			return next;
		});
	};

	const buildMatrix = () => {
		const amountList = amounts
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean);

		if (amountList.length === 0 || normalizations.size === 0) return;

		const configs: BatchConfig[] = [];
		for (const normalization of normalizations) {
			for (const amount of amountList) {
				configs.push(
					createEmptyConfig({
						amount,
						nestingOrLinksType,
						nestingOrLinks: depth,
						normalization,
						seed,
					}),
				);
			}
		}
		onGenerate(configs);
	};

	return (
		<FieldGroup className="generator">
			<Field>
				<FieldLabel htmlFor="matrix-amounts">
					SPELL AMOUNTS (COMMA SEPARATED)
				</FieldLabel>
				<Input
					id="matrix-amounts"
					value={amounts}
					onChange={(event) => setAmounts(event.target.value)}
					className="rounded-2xl"
				/>
			</Field>
			<div className="flex gap-4 items-end">
				<Field>
					<FieldLabel htmlFor="matrix-type">
						VARY BY
					</FieldLabel>
					<div className="flex gap-2">
						<Button
							type="button"
							variant={
								nestingOrLinksType === "nesting"
									? "default"
									: "outline"
							}
							className="rounded-2xl"
							onClick={() => setNestingOrLinksType("nesting")}
						>
							Nesting
						</Button>
						<Button
							type="button"
							variant={
								nestingOrLinksType === "links"
									? "default"
									: "outline"
							}
							className="rounded-2xl"
							onClick={() => setNestingOrLinksType("links")}
						>
							Links
						</Button>
					</div>
				</Field>
				<Field>
					<FieldLabel htmlFor="matrix-depth">
						MAX DEPTH
					</FieldLabel>
					<Input
						id="matrix-depth"
						type="number"
						min="0"
						max="20"
						value={depth}
						onChange={(event) => setDepth(event.target.value)}
						className="rounded-2xl w-24"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="matrix-seed">SEED</FieldLabel>
					<Input
						id="matrix-seed"
						type="number"
						value={seed}
						onChange={(event) => setSeed(event.target.value)}
						className="rounded-2xl w-28"
					/>
				</Field>
			</div>
			<Field>
				<FieldLabel>NORMALIZATION(S) TO SWEEP</FieldLabel>
				<div className="flex gap-4 flex-wrap">
					{ALL_NORMALIZATIONS.map((type) => (
						<label className="checkbox-row" key={type}>
							<input
								type="checkbox"
								checked={normalizations.has(type)}
								onChange={() => toggleNormalization(type)}
							/>
							{type.charAt(0).toUpperCase() + type.slice(1)}
						</label>
					))}
				</div>
			</Field>
			<Button
				type="button"
				className="bg-teal-500 hover:bg-teal-400 hover:shadow-md hover:shadow-teal-950 text-gray-950 cursor-pointer w-fit"
				onClick={buildMatrix}
			>
				Add matrix to queue ↗
			</Button>
		</FieldGroup>
	);
}
