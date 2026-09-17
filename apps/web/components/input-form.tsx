import { Button } from "./ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "./ui/input";
import { NORMALIZATION_TYPES } from "spellbox/src/constants";

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
}) {
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
								onAmountChange(event.target.value)
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
												onNestingOrLinksTypeChange(
													"nesting",
												)
											}
										>
											Nesting
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() =>
												onNestingOrLinksTypeChange(
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
									onNestingOrLinksChange(event.target.value)
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
								onSeedChange(event.target.value)
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
													onNormalizationChange(type)
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
				<Field orientation="horizontal">
					<Button
						type="submit"
						disabled={isLoading}
						className={
							"bg-teal-500 hover:bg-teal-400 hover:shadow-md hover:shadow-teal-950 text-gray-950"
						}
						onClick={(event) => onSubmit(event)}
					>
						{isLoading ? "Processing..." : "Run analysis"}{" "}
						<span>↗</span>
					</Button>
				</Field>
			</FieldGroup>
		</aside>
	);
}
