import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { type Metrics } from "@/lib/metrics";
import { Input } from "./ui/input";
import { NORMALIZATION_TYPES } from "spellbox/src/constants";
import { useState } from "react";

const isMetricsPayload = (value: unknown): value is Metrics => {
	if (!value || typeof value !== "object") return false;
	const candidate = value as Partial<Metrics>;
	return (
		typeof candidate.generatedAt === "string" &&
		typeof candidate.total === "number" &&
		typeof candidate.unique === "number"
	);
};

const readMetricsReport = async (file: File): Promise<Metrics | null> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const text = reader.result;
				if (typeof text !== "string") {
					resolve(null);
					return;
				}

				const parsed = JSON.parse(text) as unknown;
				resolve(isMetricsPayload(parsed) ? parsed : null);
			} catch (error) {
				reject(error);
			}
		};
		reader.onerror = () => reject(new Error("Failed to read report file"));
		reader.readAsText(file);
	});
};

export function InputForm({
	amount,
	nestingOrLinks,
	nestingOrLinksType,
	seed,
	normalization,
	isLoading,
	onAmountChange,
	onNestingOrLinksChange,
	onNestingOrLinksTypeChange,
	onSeedChange,
	onNormalizationChange,
	onSubmit,
	onReportUpload,
}: {
	amount: string;
	nestingOrLinks: string;
	nestingOrLinksType: string;
	seed: string;
	normalization: string;
	isLoading: boolean;
	onAmountChange: (amount: string) => void;
	onNestingOrLinksChange: (nestingOrLinks: string) => void;
	onNestingOrLinksTypeChange: (nestingOrLinksType: string) => void;
	onSeedChange: (seed: string) => void;
	onNormalizationChange: (normalization: string) => void;
	onSubmit: (event: React.MouseEvent<HTMLButtonElement>) => void;
	onReportUpload: (report: Metrics) => void;
}) {
	const [run, setRun] = useState(true);
	const [parsedMetrics, setParsedMetrics] = useState<Metrics | null>(null);

	const resetLocalState = () => {
		setRun(true);
		setParsedMetrics(null);
	};

	const handleFieldChange = (
		setter: (value: string) => void,
		value: string,
	) => {
		setter(value);
		resetLocalState();
	};

	return (
		<aside>
			<div className="rules-heading">
				<p className="eyebrow">CONFIGURATION / 01</p>
				<h2>Generator Configuration</h2>
			</div>
			<FieldGroup className="generator pt-4">
				<div className="flex gap-4 items-end">
					<Field>
						<FieldLabel htmlFor="amount">
							SPELLS TO GENERATE
						</FieldLabel>
						<Input
							id="amount"
							type="number"
							min="1"
							max="124406"
							value={amount}
							onChange={(event) =>
								handleFieldChange(
									onAmountChange,
									event.target.value,
								)
							}
							className="rounded-2xl"
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor="nestingOrLinks">
							SET MAX NESTING OR LINK LEVEL (CHANGE DROPDOWN TO
							SELECT NESTING/LINK)
						</FieldLabel>
						<div className="flex">
							<DropdownMenu>
								<DropdownMenuTrigger
									render={
										<Button
											variant={"outline"}
											className={
												"rounded-r-none rounded-l-2xl"
											}
										/>
									}
								>
									Max{" "}
									{nestingOrLinksType === "nesting"
										? "Nesting"
										: "Link"}
								</DropdownMenuTrigger>
								<DropdownMenuContent>
									<DropdownMenuGroup>
										<DropdownMenuItem
											onClick={() =>
												handleFieldChange(
													onNestingOrLinksTypeChange,
													"nesting",
												)
											}
										>
											Nesting
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() =>
												handleFieldChange(
													onNestingOrLinksTypeChange,
													"links",
												)
											}
										>
											Links
										</DropdownMenuItem>
									</DropdownMenuGroup>
								</DropdownMenuContent>
							</DropdownMenu>
							<Input
								id="nestingOrLinks"
								type="number"
								min="1"
								max="20"
								value={nestingOrLinks}
								onChange={(event) =>
									handleFieldChange(
										onNestingOrLinksChange,
										event.target.value,
									)
								}
								className="rounded-l-none rounded-r-2xl"
							/>
						</div>
					</Field>
				</div>
				<div className="flex gap-4 items-end">
					<Field>
						<FieldLabel htmlFor="seed">SEED</FieldLabel>
						<Input
							id="seed"
							type="number"
							value={seed}
							onChange={(event) =>
								handleFieldChange(
									onSeedChange,
									event.target.value,
								)
							}
							className="rounded-2xl"
						/>
					</Field>
					<Field className="max-w-max">
						<FieldLabel htmlFor="nestingOrLinks">
							SET NORMALIZATION TYPE
						</FieldLabel>
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant={"outline"}
										className={"rounded-2xl"}
									/>
								}
							>
								{normalization.charAt(0).toUpperCase() +
									normalization.slice(1)}{" "}
								Normalization
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuGroup>
									{Object.values(NORMALIZATION_TYPES)
										.filter(
											(type) =>
												type !== "none" &&
												type !== normalization,
										)
										.map((type, i) => (
											<DropdownMenuItem
												onClick={() =>
													handleFieldChange(
														onNormalizationChange,
														type,
													)
												}
												key={i}
											>
												{type.charAt(0).toUpperCase() +
													type.slice(1)}
											</DropdownMenuItem>
										))}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</Field>
				</div>
				<Field
					orientation="horizontal"
					className="flex gap-4 items-end"
				>
					<Field>
						<FieldLabel htmlFor="nestingOrLinks">
							UPLOAD OLD REPORT TO VISUALIZE (OPTIONAL)
						</FieldLabel>
						<Input
							id="report"
							type="file"
							accept=".json,application/json"
							onChange={async (event) => {
								const file = event.target.files?.[0];
								if (!file) return;

								try {
									const parsed =
										await readMetricsReport(file);
									if (parsed) {
										setParsedMetrics(parsed);
										setRun(false);
									}
									return null;
								} catch (error) {
									console.error(
										"Failed to parse report JSON",
										error,
									);
									return null;
								} finally {
									event.target.value = "";
								}
							}}
						/>
					</Field>
					<Button
						type="submit"
						disabled={isLoading}
						className={
							"bg-teal-500 hover:bg-teal-400 hover:shadow-md hover:shadow-teal-950 text-gray-950 cursor-pointer"
						}
						onClick={(event) => {
							if (run) {
								onSubmit(event);
								return;
							}

							onReportUpload(parsedMetrics as Metrics);
							resetLocalState();
						}}
					>
						{isLoading
							? "Processing..."
							: run
								? "Run analysis"
								: "Load Report"}{" "}
						<span>↗</span>
					</Button>
				</Field>
			</FieldGroup>
		</aside>
	);
}
