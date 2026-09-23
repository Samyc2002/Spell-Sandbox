"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { MetricsWorkspace } from "@/components/metrics-workspace";
import { RulesPane } from "@/components/rules-pane";
import { metricsFromGenerated, type Metrics } from "@/lib/metrics";
import { generateBulkMetrics } from "spellbox/src/core/bulkMetricsGenerator";
import { InputForm } from "@/components/input-form";
import { NORMALIZATION_TYPES } from "spellbox/src/constants";

export default function Home() {
	const [amount, setAmount] = useState("10000");
	const [nestingOrLinksType, setNestingOrLinksType] = useState("nesting");
	const [nestingOrLinks, setNestingOrLinks] = useState("4");
	const [seed, setSeed] = useState("12345");
	const [normalization, setNormalization] = useState(
		NORMALIZATION_TYPES.EXPONENTIAL,
	);
	const [metrics, setMetrics] = useState<Metrics | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	return (
		<main className="dashboard-shell">
			<div className="workspace-layout">
				<div>
					<DashboardHeader />
					<div className="analysis-column">
						<MetricsWorkspace
							metrics={metrics}
							isLoading={isLoading}
						/>
					</div>
				</div>
				<div className="rules-pane">
					<InputForm
						isLoading={isLoading}
						amount={amount}
						nestingOrLinks={nestingOrLinks}
						nestingOrLinksType={nestingOrLinksType}
						seed={seed}
						normalization={normalization}
						onAmountChange={setAmount}
						onNestingOrLinksChange={setNestingOrLinks}
						onNestingOrLinksTypeChange={setNestingOrLinksType}
						onSeedChange={setSeed}
						onNormalizationChange={setNormalization}
						onReportUpload={(report) => {
							setMetrics(report);
							setAmount(report.total.toString());
							if (report.maxNesting > 0) {
								setNestingOrLinksType("nesting");
								setNestingOrLinks(report.maxNesting.toString());
							}
							if (report.maxLinks > 0) {
								setNestingOrLinksType("links");
								setNestingOrLinks(report.maxLinks.toString());
							}
							setNormalization(report.normalization);
							setSeed(report.seed.toString());
						}}
						onSubmit={(event) => {
							event.preventDefault();
							setIsLoading(true);
							window.setTimeout(() => {
								setMetrics(
									metricsFromGenerated(
										generateBulkMetrics(
											Number(amount) || 1,
											nestingOrLinksType === "nesting"
												? Number(nestingOrLinks)
												: 0,
											nestingOrLinksType === "links"
												? Number(nestingOrLinks)
												: 0,
											normalization,
											Number(seed),
										),
									),
								);
								setIsLoading(false);
							}, 0);
						}}
					/>
					<hr />
					<RulesPane />
				</div>
			</div>
		</main>
	);
}
