import { Bars } from "@/components/bars";
import { Panel } from "@/components/panel";
import { palette, type Metrics } from "@/lib/metrics";

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

	return (
		<>
			<div className="run-meta">
				<span>
					LAST RUN {new Date(metrics.generatedAt).toTimeString()}
				</span>
				<span>
					GENERATED <strong>{metrics.total.toLocaleString()}</strong>
				</span>
				<span>
					STRUCTURALLY DISTINCT{" "}
					<strong>{metrics.unique.toLocaleString()}</strong>
				</span>
				<span>
					AVG SCORE <strong>{metrics.average.toFixed(3)}</strong>
				</span>
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
				<Panel title="Score distribution" note="As generated">
					<Bars
						values={metrics.scoreHist.counts}
						labels={metrics.scoreHist.labels}
						color="#f5a65b"
					/>
				</Panel>
				<Panel title="Raw score distribution">
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
					note="Cumulative distinct count as more spells are generated"
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
					note="Distinct structures / total spells at each depth"
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
