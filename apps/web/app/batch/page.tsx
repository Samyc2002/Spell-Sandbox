"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { MatrixBuilder } from "@/components/matrix-builder";
import { ConfigTable } from "@/components/config-table";
import { ResultsTable } from "@/components/results-table";
import { Button } from "@/components/ui/button";
import {
	createEmptyConfig,
	runConfig,
	type BatchConfig,
	type BatchResult,
} from "@/lib/batch";
import { Plus } from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function BatchPage() {
	const [configs, setConfigs] = useState<BatchConfig[]>([]);
	const [results, setResults] = useState<BatchResult[]>([]);
	const [isRunning, setIsRunning] = useState(false);

	const updateConfig = (id: string, patch: Partial<BatchConfig>) => {
		setConfigs((prev) =>
			prev.map((config) =>
				config.id === id ? { ...config, ...patch } : config,
			),
		);
	};

	const removeConfig = (id: string) => {
		setConfigs((prev) => prev.filter((config) => config.id !== id));
	};

	const runAll = () => {
		if (configs.length === 0) return;
		setIsRunning(true);
		setResults([]);
		window.setTimeout(() => {
			setResults(configs.map((config) => runConfig(config)));
			setIsRunning(false);
		}, 0);
		window.scrollTo(0, document.body.scrollHeight);
	};

	return (
		<main className="dashboard-shell">
			<Navbar />
			<div className="batch-shell">
				<DashboardHeader
					title={
						<>
							Batch <span>runs</span>
						</>
					}
					lede="Queue up multiple generator configs, run them together, and get the compiled-analysis tables without leaving the browser."
				/>

				<div className="batch-layout" style={{ marginTop: 32 }}>
					<div className="batch-main">
						<div className="panel">
							<div className="panel-heading">
								<h2>Matrix generator</h2>
								<p>
									Sweep a list of spell amounts across one or
									more normalizations, same shape as the
									&quot;Varying Amount of Spells&quot;
									experiment.
								</p>
							</div>
							<MatrixBuilder
								onGenerate={(newConfigs) =>
									setConfigs((prev) => [
										...prev,
										...newConfigs,
									])
								}
							/>
						</div>

						<div className="panel">
							<div className="panel-heading config-table-actions">
								<div>
									<h2>Queued configs</h2>
									<p>
										Edit any row, or add one manually. All
										queued rows run when you hit &quot;Run
										all&quot;.
									</p>
								</div>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										className="rounded-2xl"
										onClick={() =>
											setConfigs((prev) => [
												...prev,
												createEmptyConfig(),
											])
										}
									>
										<Plus size={14} /> Add row
									</Button>
									<Button
										size="sm"
										disabled={
											configs.length === 0 || isRunning
										}
										className="rounded-2xl bg-teal-500 hover:bg-teal-400 hover:shadow-md hover:shadow-teal-950 text-gray-950 cursor-pointer"
										onClick={runAll}
									>
										{isRunning
											? "Running..."
											: `Run all (${configs.length})`}{" "}
										↗
									</Button>
								</div>
							</div>
							<ConfigTable
								configs={configs}
								onChange={updateConfig}
								onRemove={removeConfig}
							/>
						</div>

						{isRunning && (
							<div className="empty-state loading-state">
								<div className="loader" aria-hidden="true" />
								<h2>Running batch</h2>
								<p>
									Generating {configs.length} configuration
									{configs.length === 1 ? "" : "s"}...
								</p>
							</div>
						)}

						{!isRunning && results.length > 0 && (
							<div className="panel">
								<div className="panel-heading">
									<h2>Results</h2>
									<p>
										Matches the Detailed Observations table
										in docs/reports/compiled-analysis.md.
									</p>
								</div>
								<ResultsTable results={results} />
							</div>
						)}
					</div>
				</div>
			</div>
		</main>
	);
}
