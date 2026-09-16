"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { MetricsWorkspace } from "@/components/metrics-workspace";
import { RulesPane } from "@/components/rules-pane";
import { metricsFromGenerated, type Metrics } from "@/lib/metrics";
import { generateBulkMetrics } from "spellbox/src/core/bulkMetricsGenerator";

export default function Home() {
	const [amount, setAmount] = useState("10000");
	const [metrics, setMetrics] = useState<Metrics | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	return (
		<main className="dashboard-shell">
			<div className="workspace-layout">
				<div>
					<DashboardHeader
						amount={amount}
						isLoading={isLoading}
						onAmountChange={setAmount}
						onSubmit={(event) => {
							event.preventDefault();
							setIsLoading(true);
							window.setTimeout(() => {
								setMetrics(
									metricsFromGenerated(
										generateBulkMetrics(
											Number(amount) || 1,
										),
									),
								);
								setIsLoading(false);
							}, 0);
						}}
					/>
					<div className="analysis-column">
						<MetricsWorkspace
							metrics={metrics}
							isLoading={isLoading}
						/>
					</div>
				</div>
				<RulesPane />
			</div>
		</main>
	);
}
