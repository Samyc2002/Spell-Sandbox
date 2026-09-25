"use client";

import { Button } from "./ui/button";
import { Download } from "lucide-react";
import {
	downloadSequenceResults,
	downloadTextFile,
	resultsToMarkdownTable,
	sequenceLabel,
	type DiscoverySequenceResult,
} from "@/lib/discovery";

export function DiscoveryResultsTable({
	results,
}: {
	results: DiscoverySequenceResult[];
}) {
	if (results.length === 0) return null;

	return (
		<div className="config-table-wrap">
			<div className="config-table-actions">
				<p className="batch-summary-note">
					{results.length} sequence
					{results.length === 1 ? "" : "s"} completed.
				</p>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						className="rounded-2xl"
						onClick={() =>
							downloadTextFile(
								"discovery-rate-table.md",
								resultsToMarkdownTable(results),
								"text/markdown",
							)
						}
					>
						<Download size={14} /> Export table (.md)
					</Button>
					<Button
						variant="outline"
						size="sm"
						className="rounded-2xl"
						onClick={() => downloadSequenceResults(results)}
					>
						<Download size={14} /> Export raw results (.json)
					</Button>
				</div>
			</div>
			<table className="report-table">
				<thead>
					<tr>
						<th>Sequence</th>
						<th>Runs</th>
						<th>Total spells</th>
						<th>Cumulative unique</th>
						<th>Cumulative unique (valid only)</th>
						<th>First-run rate %</th>
						<th>Last-run rate %</th>
						<th>First-run rate % (valid only)</th>
						<th>Last-run rate % (valid only)</th>
					</tr>
				</thead>
				<tbody>
					{results.map((result) => {
						const first = result.runs[0];
						const last = result.runs[result.runs.length - 1];
						return (
							<tr key={result.config.id}>
								<td>{sequenceLabel(result)}</td>
								<td>{result.runs.length}</td>
								<td>{last?.cumulativeTotal.toLocaleString()}</td>
								<td>
									{last?.cumulativeUnique.toLocaleString()}
								</td>
								<td>
									{last?.cumulativeUniqueValid.toLocaleString()}
								</td>
								<td>
									{first
										? (first.discoveryRate * 100).toFixed(1)
										: "—"}
								</td>
								<td>
									{last
										? (last.discoveryRate * 100).toFixed(1)
										: "—"}
								</td>
								<td>
									{first
										? (first.discoveryRateValidOnly * 100).toFixed(1)
										: "—"}
								</td>
								<td>
									{last
										? (last.discoveryRateValidOnly * 100).toFixed(1)
										: "—"}
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
