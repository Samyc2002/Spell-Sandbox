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

export function InputForm({
	amount,
	nestingOrLinks,
	nestingOrLinksType,
	seed,
	isLoading,
	onAmountChange,
	onNestingOrLinksChange,
	onNestingOrLinksTypeChange,
	onSeedChange,
	onSubmit,
}: {
	amount: string;
	nestingOrLinks: string;
	nestingOrLinksType: string;
	seed: string;
	isLoading: boolean;
	onAmountChange: (amount: string) => void;
	onNestingOrLinksChange: (nestingOrLinks: string) => void;
	onNestingOrLinksTypeChange: (nestingOrLinksType: string) => void;
	onSeedChange: (seed: string) => void;
	onSubmit: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
	return (
		<aside>
			<FieldGroup className="generator">
				<Field>
					<FieldLabel htmlFor="amount">SPELLS TO GENERATE</FieldLabel>
					<Input
						id="amount"
						type="number"
						min="1"
						max="124406"
						value={amount}
						onChange={(event) => onAmountChange(event.target.value)}
						className="rounded-2xl"
					/>
				</Field>
				<Field>
					<FieldLabel htmlFor="nestingOrLinks">
						SET MAX NESTING OR LINK LEVEL
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
											onNestingOrLinksTypeChange("links")
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
				<Field>
					<FieldLabel htmlFor="seed">SEED</FieldLabel>
					<Input
						id="seed"
						type="number"
						value={seed}
						onChange={(event) => onSeedChange(event.target.value)}
						className="rounded-2xl"
					/>
				</Field>
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
