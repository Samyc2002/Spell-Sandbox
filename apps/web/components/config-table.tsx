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
import { type BatchConfig, type NestingOrLinksType } from "@/lib/batch";
import { Trash2 } from "lucide-react";

function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ConfigTable({
	configs,
	onChange,
	onRemove,
}: {
	configs: BatchConfig[];
	onChange: (id: string, patch: Partial<BatchConfig>) => void;
	onRemove: (id: string) => void;
}) {
	if (configs.length === 0) {
		return (
			<p className="batch-summary-note">
				No configs queued yet. Use the matrix generator or add a row
				manually below.
			</p>
		);
	}

	return (
		<div className="config-table-wrap">
			<table className="config-table">
				<thead>
					<tr>
						<th>#</th>
						<th>Amount</th>
						<th>Nesting / Links</th>
						<th>Depth</th>
						<th>Normalization</th>
						<th>Seed</th>
						<th />
					</tr>
				</thead>
				<tbody>
					{configs.map((config, index) => (
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
									value={config.seed}
									onChange={(event) =>
										onChange(config.id, {
											seed: event.target.value,
										})
									}
									className="rounded-2xl w-24"
								/>
							</td>
							<td>
								<Button
									variant="ghost"
									size="icon-sm"
									onClick={() => onRemove(config.id)}
									aria-label="Remove config"
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
