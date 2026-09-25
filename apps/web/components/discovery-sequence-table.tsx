"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { NORMALIZATION_TYPES } from "spellbox/src/constants";
import {
	sequenceSpellCount,
	type DiscoverySequenceConfig,
	type NestingOrLinksType,
} from "@/lib/discovery";
import { Trash2 } from "lucide-react";

function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

export function DiscoverySequenceTable({
	sequences,
	onChange,
	onRemove,
}: {
	sequences: DiscoverySequenceConfig[];
	onChange: (id: string, patch: Partial<DiscoverySequenceConfig>) => void;
	onRemove: (id: string) => void;
}) {
	if (sequences.length === 0) {
		return (
			<p className="batch-summary-note">
				No sequences queued yet. Use the builder above to add one.
			</p>
		);
	}

	return (
		<div className="config-table-wrap">
			<table className="config-table">
				<thead>
					<tr>
						<th>#</th>
						<th>Amount / run</th>
						<th>Nesting / Links</th>
						<th>Depth</th>
						<th>Normalization</th>
						<th>Start seed</th>
						<th>Runs</th>
						<th>Total spells</th>
						<th />
					</tr>
				</thead>
				<tbody>
					{sequences.map((config, index) => (
						<tr key={config.id}>
							<td>{index + 1}</td>
							<td>
								<Input
									type="number"
									min="1"
									value={config.amount}
									onChange={(event) =>
										onChange(config.id, {
											amount: event.target.value,
										})
									}
									className="rounded-2xl w-28"
								/>
							</td>
							<td>
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
										{config.nestingOrLinksType === "nesting"
											? "Nesting"
											: "Links"}
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuGroup>
											{(
												[
													"nesting",
													"links",
												] as NestingOrLinksType[]
											).map((type) => (
												<DropdownMenuItem
													key={type}
													onClick={() =>
														onChange(config.id, {
															nestingOrLinksType:
																type,
														})
													}
												>
													{type === "nesting"
														? "Nesting"
														: "Links"}
												</DropdownMenuItem>
											))}
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</td>
							<td>
								<Input
									type="number"
									min="0"
									max="20"
									value={config.nestingOrLinks}
									onChange={(event) =>
										onChange(config.id, {
											nestingOrLinks: event.target.value,
										})
									}
									className="rounded-2xl w-20"
								/>
							</td>
							<td>
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
										{capitalize(config.normalization)}
									</DropdownMenuTrigger>
									<DropdownMenuContent>
										<DropdownMenuGroup>
											{Object.values(NORMALIZATION_TYPES)
												.filter(
													(type) => type !== "none",
												)
												.map((type) => (
													<DropdownMenuItem
														key={type}
														onClick={() =>
															onChange(
																config.id,
																{
																	normalization:
																		type,
																},
															)
														}
													>
														{capitalize(type)}
													</DropdownMenuItem>
												))}
										</DropdownMenuGroup>
									</DropdownMenuContent>
								</DropdownMenu>
							</td>
							<td>
								<Input
									type="number"
									value={config.startSeed}
									onChange={(event) =>
										onChange(config.id, {
											startSeed: event.target.value,
										})
									}
									className="rounded-2xl w-24"
								/>
							</td>
							<td>
								<Input
									type="number"
									min="1"
									value={config.runCount}
									onChange={(event) =>
										onChange(config.id, {
											runCount: event.target.value,
										})
									}
									className="rounded-2xl w-20"
								/>
							</td>
							<td>{sequenceSpellCount(config).toLocaleString()}</td>
							<td>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => onRemove(config.id)}
									aria-label="Remove sequence"
								>
									<Trash2 size={14} />
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
