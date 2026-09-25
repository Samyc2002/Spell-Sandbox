"use client";

import { useRef, useState } from "react";
import { DashboardHeader } from "@/components/dashboard-header";
import { DiscoverySequenceBuilder } from "@/components/discovery-sequence-builder";
import { DiscoverySequenceTable } from "@/components/discovery-sequence-table";
import { DiscoveryResultsTable } from "@/components/discovery-results-table";
import { DiscoveryLineChart } from "@/components/discovery-line-chart";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import {
	createEmptySequence,
	downloadSequenceConfigs,
	parseSequencesFile,
	sequenceSpellCount,
	MAX_SEQUENCE_SPELLS,
	type DiscoverySequenceConfig,
	type DiscoverySequenceResult,
} from "@/lib/discovery";
import { Plus, Download, Upload, X } from "lucide-react";

export default function DiscoveryPage() {
	const [sequences, setSequences] = useState<DiscoverySequenceConfig[]>([]);
	const [results, setResults] = useState<DiscoverySequenceResult[]>([]);
	const [isRunning, setIsRunning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const totalSpells = sequences.reduce(
		(acc, config) => acc + sequenceSpellCount(config),
		0,
	);
	const overCap = totalSpells > MAX_SEQUENCE_SPELLS;

	const updateSequence = (
		id: string,
		patch: Partial<DiscoverySequenceConfig>,
	) => {
		setSequences((prev) =>
			prev.map((config) =>
				config.id === id ? { ...config, ...patch } : config,
			),
		);
	};

	const removeSequence = (id: string) => {
		setSequences((prev) => prev.filter((config) => config.id !== id));
	};

	const clearAll = () => {
		setSequences([]);
		setResults([]);
		setError(null);
	};

	const runAll = async () => {
		if (sequences.length === 0 || overCap) return;
		setIsRunning(true);
		setError(null);
		setResults([]);
		try {
			const response = await fetch("/api/discovery", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ configs: sequences }),
			});
			const body = await response.json();
			if (!response.ok) {
				throw new Error(body.error ?? "Discovery run failed.");
			}
			setResults(body.results);
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Discovery run failed unexpectedly.",
			);
		} finally {
			setIsRunning(false);
		}
	};

	const handleLoadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		event.target.value = "";
		if (!file) return;
		file
			.text()
			.then((contents) => {
				const loaded = parseSequencesFile(contents);
				setSequences((prev) => [...prev, ...loaded]);
				setError(null);
			})
			.catch(() => {
				setError("Couldn't load that file as discovery sequences.");
			});
	};

	return (
		<main className="dashboard-shell">
			<Navbar />
			<div className="batch-shell">
				<DashboardHeader
					title={
						<>
							Discovery <span>rate</span>
						</>
					}
					lede="Re-roll the same generation shape across many seeds and see how many new spells keep turning up, without leaving the browser or freezing the tab."
				/>

				<div className="batch-layout" style={{ marginTop: 32 }}>
					<div className="batch-main">
						<div className="panel">
							<div className="panel-heading">
								<h2>Sequence builder</h2>
								<p>
									A sequence re-rolls one generation shape
									(amount + nesting/linking depth) across a
									range of ascending seeds, tracking which
									spells are structurally new versus already
									seen earlier in that same sequence.
								</p>
							</div>
							<DiscoverySequenceBuilder
								onAdd={(config) =>
									setSequences((prev) => [...prev, config])
								}
							/>
						</div>

						<div className="panel">
							<div className="panel-heading config-table-actions">
								<div>
									<h2>Queued sequences</h2>
									<p>
										Edit any row, or add one manually. All
										queued sequences run when you hit
										&quot;Run all&quot;.
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
										disabled={sequences.length === 0}
										onClick={() =>
											downloadSequenceConfigs(sequences)
										}
									>
										<Download size={14} /> Save config
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="rounded-2xl"
										onClick={() =>
											setSequences((prev) => [
												...prev,
												createEmptySequence(),
											])
										}
									>
										<Plus size={14} /> Add row
									</Button>
									<Button
										variant="outline"
										size="sm"
										className="rounded-2xl"
										disabled={sequences.length === 0}
										onClick={clearAll}
									>
										<X size={14} /> Clear
									</Button>
									<Button
										size="sm"
										disabled={
											sequences.length === 0 ||
											isRunning ||
											overCap
										}
										className="rounded-2xl bg-teal-500 hover:bg-teal-400 hover:shadow-md hover:shadow-teal-950 text-gray-950 cursor-pointer"
										onClick={() => void runAll()}
									>
										{isRunning
											? "Running..."
											: `Run all (${sequences.length})`}{" "}
										↗
									</Button>
								</div>
							</div>
							{sequences.length > 0 && (
								<p className="batch-summary-note">
									{totalSpells.toLocaleString()} total spells
									will be generated across all queued
									sequences.
									{overCap &&
										` This is over the ${MAX_SEQUENCE_SPELLS.toLocaleString()} cap — trim amount, run count, or sequences before running.`}
								</p>
							)}
							{error && (
								<p className="batch-summary-note" role="alert">
									{error}
								</p>
							)}
							<DiscoverySequenceTable
								sequences={sequences}
								onChange={updateSequence}
								onRemove={removeSequence}
							/>
						</div>

						{isRunning && (
							<div className="empty-state loading-state">
								<div className="loader" aria-hidden="true" />
								<h2>Running discovery sequences</h2>
								<p>
									Generating and deduping{" "}
									{totalSpells.toLocaleString()} spells on
									the server...
								</p>
							</div>
						)}

						{!isRunning && results.length > 0 && (
							<>
								<Panel
									title="Discovery rate across repeated re-rolls"
									note="New spells / total spells that run, vs. run number, one line per sequence"
									wide
								>
									<DiscoveryLineChart
										results={results}
										valueOf={(run) => run.discoveryRate * 100}
										yLabel="Discovery rate %"
										yFormat={(v) => `${v.toFixed(0)}%`}
									/>
								</Panel>
								<Panel
									title="Discovery rate across repeated re-rolls (valid only)"
									note="New valid spells / valid spells that run, vs. run number, one line per sequence"
									wide
								>
									<DiscoveryLineChart
										results={results}
										valueOf={(run) => run.discoveryRateValidOnly * 100}
										yLabel="Discovery rate % (valid only)"
										yFormat={(v) => `${v.toFixed(0)}%`}
									/>
								</Panel>
								<Panel
									title="Cumulative unique discoveries"
									note="Distinct spells discovered so far, vs. run number, one line per sequence"
									wide
								>
									<DiscoveryLineChart
										results={results}
										valueOf={(run) => run.cumulativeUnique}
										yLabel="Cumulative unique discoveries"
										yFormat={(v) =>
											Math.round(v).toLocaleString()
										}
									/>
								</Panel>
								<Panel
									title="Cumulative unique discoveries (valid only)"
									note="Distinct valid spells discovered so far, vs. run number, one line per sequence"
									wide
								>
									<DiscoveryLineChart
										results={results}
										valueOf={(run) => run.cumulativeUniqueValid}
										yLabel="Cumulative unique discoveries (valid only)"
										yFormat={(v) =>
											Math.round(v).toLocaleString()
										}
									/>
								</Panel>
								<div className="panel">
									<div className="panel-heading">
										<h2>Results</h2>
										<p>
											Matches the &quot;Discovery
											Rate&quot; section in
											docs/reports/compiled-analysis.md.
										</p>
									</div>
									<DiscoveryResultsTable results={results} />
								</div>
							</>
						)}
					</div>
				</div>
			</div>
		</main>
	);
}
