"use client";

import { useRef, useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { MatrixBuilder } from "@/components/matrix-builder";
import { ConfigTable } from "@/components/config-table";
import { ResultsTable } from "@/components/results-table";
import { Button } from "@/components/ui/button";
import {
	createEmptyConfig,
	downloadConfigs,
	parseConfigsFile,
	runConfig,
	type BatchConfig,
	type BatchResult,
} from "@/lib/batch";
import { Plus, Download, Upload, X } from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function BatchPage() {
	const [configs, setConfigs] = useState<BatchConfig[]>([]);
	const [results, setResults] = useState<BatchResult[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	const clearConfigs = () => {
		setConfigs([]);
		setResults([]);
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

	const handleLoadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		file.text()
			.then((contents) => {
				const loaded = parseConfigsFile(contents);
				setConfigs((prev) => [...prev, ...loaded]);
				setLoadError(null);
			})
			.catch(() => {
				setLoadError("Couldn't load that file as batch configs.");
			});
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
									<input
										ref={fileInputRef}
										type="file"
										accept="application/json"
										className="hidden"
										onChange={handleLoadFile}
									/>
									<Button
										variant="outline"
										size="sm"
										className="rounded-2xl"
										onClick={() =>
											fileInputRef.current?.click()
										}
									>
										<Upload size={14} /> Load config
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="rounded-2xl"
										disabled={configs.length === 0}
										onClick={() => downloadConfigs(configs)}
									>
										<Download size={14} /> Save config
									</Button>
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
										variant="outline"
										size="sm"
										className="rounded-2xl"
										disabled={configs.length === 0}
										onClick={clearConfigs}
									>
										<X size={14} /> Clear
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
							{loadError && (
								<p className="batch-summary-note" role="alert">
									{loadError}
								</p>
							)}
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
