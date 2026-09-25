"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { NORMALIZATION_TYPES } from "spellbox/src/constants";
import {
	createEmptySequence,
	type DiscoverySequenceConfig,
	type NestingOrLinksType,
} from "@/lib/discovery";

const ALL_NORMALIZATIONS = Object.values(NORMALIZATION_TYPES).filter(
	(type) => type !== "none",
);

function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DiscoverySequenceBuilder({
	onAdd,
}: {
	onAdd: (config: DiscoverySequenceConfig) => void;
}) {
	const [amount, setAmount] = useState("1200");
	const [nestingOrLinksType, setNestingOrLinksType] =
		useState<NestingOrLinksType>("nesting");
	const [depth, setDepth] = useState("4");
	const [normalization, setNormalization] = useState("exponential");
	const [startSeed, setStartSeed] = useState("1");
	const [runCount, setRunCount] = useState("20");

	const addSequence = () => {
		onAdd(
			createEmptySequence({
				amount,
				nestingOrLinksType,
				nestingOrLinks: depth,
				normalization,
				startSeed,
				runCount,
			}),
		);
	};

	return (
		<FieldGroup className="generator">
			<div className="flex gap-4 items-end flex-wrap">
				<Field>
					<FieldLabel htmlFor="disc-amount">
						AMOUNT PER RUN
					</FieldLabel>
					<Input
						id="disc-amount"
						type="number"
						min="1"
						value={amount}
						onChange={(event) => setAmount(event.target.value)}
						className="rounded-2xl w-28"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="disc-type">SHAPE</FieldLabel>
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
					<FieldLabel htmlFor="disc-depth">MAX DEPTH</FieldLabel>
					<Input
						id="disc-depth"
						type="number"
						min="0"
						max="20"
						value={depth}
						onChange={(event) => setDepth(event.target.value)}
						className="rounded-2xl w-24"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="disc-normalization">
						NORMALIZATION
					</FieldLabel>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="outline"
									size="sm"
									className="rounded-2xl"
								/>
							}
						>
							{capitalize(normalization)}
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuGroup>
								{ALL_NORMALIZATIONS.map((type) => (
									<DropdownMenuItem
										key={type}
										onClick={() => setNormalization(type)}
									>
										{capitalize(type)}
									</DropdownMenuItem>
								))}
							</DropdownMenuGroup>
						</DropdownMenuContent>
					</DropdownMenu>
				</Field>
			</div>
			<div className="flex gap-4 items-end flex-wrap">
				<Field>
					<FieldLabel htmlFor="disc-start-seed">
						START SEED
					</FieldLabel>
					<Input
						id="disc-start-seed"
						type="number"
						value={startSeed}
						onChange={(event) => setStartSeed(event.target.value)}
						className="rounded-2xl w-28"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="disc-run-count">
						RUNS IN SEQUENCE
					</FieldLabel>
					<Input
						id="disc-run-count"
						type="number"
						min="1"
						value={runCount}
						onChange={(event) => setRunCount(event.target.value)}
						className="rounded-2xl w-28"
					/>
				</Field>
				<p className="batch-summary-note">
					Re-rolls this shape {runCount || 0} times, seeds{" "}
					{startSeed || 0}-
					{(Number(startSeed) || 0) + (Number(runCount) || 0) - 1},
					tracking distinct spell signatures across the whole
					sequence.
				</p>
			</div>
			<Button
				type="button"
				className="bg-teal-500 hover:bg-teal-400 hover:shadow-md hover:shadow-teal-950 text-gray-950 cursor-pointer w-fit"
				onClick={addSequence}
			>
				Add sequence to queue ↗
			</Button>
		</FieldGroup>
	);
}
