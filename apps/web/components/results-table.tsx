"use client";

import { Button } from "./ui/button";
import { Download } from "lucide-react";
import {
	type BatchResult,
	downloadJsonReport,
	downloadJsonReportsZip,
	downloadTextFile,
	highestTier,
	resultsToMarkdownTable,
	uniquenessRatio,
	validityPercent,
} from "@/lib/batch";

function capitalize(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

export function ResultsTable({ results }: { results: BatchResult[] }) {
	if (results.length === 0) return null;

	return (
		<div className="config-table-wrap">
			<div className="config-table-actions">
				<p className="batch-summary-note">
					{results.length} run{results.length === 1 ? "" : "s"}{" "}
					completed. Table mirrors the &quot;Varying Amount of
					Spells&quot; section of compiled-analysis.md.
				</p>
				<div className="flex gap-2">
					<Button
						variant="outline"
						size="sm"
						className="rounded-2xl"
						onClick={() =>
							downloadTextFile(
								"compiled-analysis-table.md",
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
						onClick={() => void downloadJsonReportsZip(results)}
					>
						<Download size={14} /> Export all reports (.zip)
					</Button>
				</div>
			</div>
			<table className="report-table">
				<thead>
					<tr>
						<th>Run</th>
						<th>Amount of Spells</th>
						<th>Validity %</th>
						<th>Avg Uniqueness Ratio</th>
						<th>Avg Complexity Score</th>
						<th>Avg Raw Score</th>
						<th>Highest Tier</th>
						<th>Normalization</th>
						<th>Max Nesting</th>
						<th>Max Linking</th>
						<th>Report</th>
					</tr>
				</thead>
				<tbody>
					{results.map((result, index) => (
						<tr key={result.config.id}>
							<td>{index + 1}</td>
							<td>{result.metrics.total.toLocaleString()}</td>
							<td>{validityPercent(result.metrics)}</td>
							<td>
								{uniquenessRatio(result.metrics).toFixed(2)}
							</td>
							<td>{result.metrics.avgScore.toFixed(2)}</td>
							<td>{result.metrics.avgRawScore.toFixed(2)}</td>
							<td>
								<span className="tier-pill">
									{highestTier(result.metrics)}
								</span>
							</td>
							<td>{capitalize(result.config.normalization)}</td>
							<td>{result.metrics.maxNesting}</td>
							<td>{result.metrics.maxLinks}</td>
							<td>
								<button
									type="button"
									className="link-btn"
									onClick={() =>
										downloadJsonReport(result, index)
									}
								>
									Download
								</button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
