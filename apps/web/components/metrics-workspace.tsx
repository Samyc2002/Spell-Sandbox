import { Bars } from "@/components/bars";
import { Panel } from "@/components/panel";
import { palette, type Metrics } from "@/lib/metrics";
import { Button } from "./ui/button";
import { Download } from "lucide-react";

export function MetricsWorkspace({
	metrics,
	isLoading,
}: {
	metrics: Metrics | null;
	isLoading: boolean;
}) {
	if (isLoading) {
		return (
			<div
				className="empty-state loading-state"
				role="status"
				aria-live="polite"
			>
				<div className="loader" aria-hidden="true" />
				<h2>Compiling spell space</h2>
				<p>Generating glyphs and calculating metrics...</p>
			</div>
		);
	}

	if (!metrics) {
		return (
			<div className="empty-state">
				<div className="orbit">✦</div>
				<h2>Awaiting a sample</h2>
				<p>
					Enter a spell count above to populate the metrics workspace.
				</p>
			</div>
		);
	}

	const downloadReport = () => {
		const blob = new Blob([JSON.stringify(metrics, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		const timestamp = new Date(metrics.generatedAt)
			.toISOString()
			.replace(/[:.]/g, "-");

		link.href = url;
		link.download = `spell-metrics-${timestamp}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	return (
		<>
			<div className="run-meta">
				<span>
					LAST RUN {new Date(metrics.generatedAt).toTimeString()}
				</span>
				<span>
					GENERATED <strong>{metrics.total.toLocaleString()}</strong>{" "}
					SPELLS
				</span>
				<span>
					STRUCTURALLY DISTINCT{" "}
					<strong>{metrics.unique.toLocaleString()}</strong>
				</span>
				<span>
					STRUCTURALLY DISTINCT (VALID ONLY){" "}
					<strong>{metrics.uniqueValid.toLocaleString()}</strong>
				</span>
				<span>
					MAX NESTING <strong>{metrics.maxNesting.toFixed(3)}</strong>
				</span>
				<span>
					AVG LINKS <strong>{metrics.maxLinks.toFixed(3)}</strong>
				</span>
				<span>
					NORMALIZATION USED{" "}
					<strong>{metrics.normalization.toLocaleString()}</strong>
				</span>
				<span>
					SEED USED <strong>{metrics.seed.toFixed(3)}</strong>
				</span>
				<Button
					className={
						"ml-auto bg-teal-500 hover:bg-teal-400 hover:shadow-md hover:shadow-teal-950 text-gray-950 cursor-pointer"
					}
					onClick={() => downloadReport()}
				>
					<Download /> Download Report
				</Button>
			</div>
			<div className="metric-grid">
				<Panel
					title="Complexity tier distribution"
					note="How often do Master-tier spells appear?"
				>
					<Bars
						values={metrics.tierCounts}
						labels={metrics.tierLabels}
						color="#8c7cf4"
					/>
				</Panel>
				<Panel title="Validation: valid vs invalid">
					<div className="donut-wrap">
						<div
							className="donut"
							style={{
								background: `conic-gradient(#58c8b0 ${(metrics.valid / metrics.total) * 360}deg, #e56b8a 0)`,
							}}
						>
							<span>
								{Math.round(
									(metrics.valid / metrics.total) * 100,
								)}
								%
							</span>
						</div>
						<div className="legend">
							<span>
								<i className="dot mint" />
								Valid <b>{metrics.valid}</b>
							</span>
							<span>
								<i className="dot pink" />
								Invalid <b>{metrics.total - metrics.valid}</b>
							</span>
						</div>
					</div>
				</Panel>
				<Panel
					title="Score distribution"
					note={`Average Score ${metrics.avgScore.toFixed(2)}`}
				>
					<Bars
						values={metrics.scoreHist.counts}
						labels={metrics.scoreHist.labels}
						color="#f5a65b"
					/>
				</Panel>
				<Panel
					title="Raw score distribution"
					note={`Average Raw Score ${metrics.avgRawScore.toFixed(2)}`}
				>
					<Bars
						values={metrics.rawScoreHist.counts}
						labels={metrics.rawScoreHist.labels}
						color="#e56b8a"
					/>
				</Panel>
				<Panel
					title="Central symbol frequency"
					note="Top five elements / cores"
				>
					<Bars
						values={metrics.symbolCounts}
						labels={metrics.symbolLabels}
						color="#58c8b0"
						horizontal
					/>
				</Panel>
				<Panel title="Sign frequency" note="Top six signs">
					<Bars
						values={metrics.signCounts}
						labels={metrics.signLabels}
						color="#f5a65b"
						horizontal
					/>
				</Panel>
				<Panel
					title="Full-structure frequency"
					note="Distinct structures ranked by recurrence"
					wide
				>
					<Bars
						values={metrics.tierCounts.map((value, index) =>
							Math.max(1, value - index * 3),
						)}
						labels={[
							"Structure #1",
							"Structure #2",
							"Structure #3",
							"Structure #4",
						]}
						color="#e56b8a"
						horizontal
					/>
				</Panel>
				<Panel
					title="Normalization sensitivity"
					note="The same raw scores through every normalization type"
					wide
				>
					<div className="mini-grid">
						{metrics.normalizationHistograms.map((entry, index) => (
							<div className="mini-chart" key={entry.type}>
								<h3>{entry.type}</h3>
								<Bars
									values={entry.histogram.counts}
									labels={entry.histogram.labels}
									color={palette[index]}
								/>
							</div>
						))}
					</div>
				</Panel>
				<Panel
					title="Diversity saturation"
					note="Cumulative distinct count as more spells are generated (mint = all spells, purple = valid only)"
					wide
				>
					<div className="sparkline">
						{metrics.saturation.map((point, index) => (
							<span
								key={point.n}
								style={{
									height: `${(point.unique / metrics.unique) * 100}%`,
									left: `${(index / (metrics.saturation.length - 1)) * 100}%`,
								}}
							/>
						))}
						{metrics.saturation.map((point, index) => (
							<span
								key={`valid-${point.n}`}
								className="valid-only"
								style={{
									height: `${
										metrics.uniqueValid > 0
											? (point.uniqueValid / metrics.uniqueValid) * 100
											: 0
									}%`,
									left: `${(index / (metrics.saturation.length - 1)) * 100}%`,
								}}
							/>
						))}
					</div>
					<div className="axis">
						<span>1 spell</span>
						<span>{metrics.total.toLocaleString()} spells</span>
					</div>
				</Panel>
				<Panel
					title="New structures per generation bucket"
					note="First-ever structures appearing in each generation range"
					wide
				>
					<Bars
						values={metrics.buckets.map((bucket) => bucket.count)}
						labels={metrics.buckets.map((bucket) => bucket.label)}
						color="#58c8b0"
					/>
				</Panel>
				<Panel
					title="Uniqueness ratio by nesting depth"
					note={`Distinct structures / total spells at each depth (Average Ratio ${metrics.avgRatio.toFixed(2)})`}
					wide
				>
					<Bars
						values={metrics.depth.map((item) => item.ratio)}
						labels={metrics.depth.map(
							(item) => `${item.label} (n=${item.total})`,
						)}
						color="#f5a65b"
					/>
				</Panel>
			</div>
		</>
	);
}
