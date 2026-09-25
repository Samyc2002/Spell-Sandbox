"use client";

import type { DiscoverySequenceResult } from "@/lib/discovery";
import { sequenceLabel } from "@/lib/discovery";

const PALETTE = [
	"#f5a65b",
	"#58c8b0",
	"#e56b8a",
	"#8c7cf4",
	"#e8d36b",
	"#5ba8f5",
	"#c084fc",
	"#4ade80",
	"#fb923c",
];

const WIDTH = 640;
const HEIGHT = 260;
const PADDING = 32;

// A small dependency-free multi-series line chart. This app doesn't
// actually use recharts anywhere despite it being a dependency (see
// metrics-workspace.tsx / bars.tsx, which are hand-rolled CSS/SVG), so this
// follows the same convention rather than introducing a new charting
// pattern for one page.
export function DiscoveryLineChart({
	results,
	valueOf,
	yLabel,
	yFormat = (value) => value.toFixed(0),
}: {
	results: DiscoverySequenceResult[];
	valueOf: (run: DiscoverySequenceResult["runs"][number]) => number;
	yLabel: string;
	yFormat?: (value: number) => string;
}) {
	if (results.length === 0) return null;

	const maxRunIndex = Math.max(
		...results.map((result) => result.runs.length),
	);
	const allValues = results.flatMap((result) => result.runs.map(valueOf));
	const maxValue = Math.max(...allValues, 1);
	const minValue = Math.min(...allValues, 0);

	const plotWidth = WIDTH - PADDING * 2;
	const plotHeight = HEIGHT - PADDING * 2;

	const xFor = (runIndex: number) =>
		PADDING +
		(maxRunIndex > 1
			? ((runIndex - 1) / (maxRunIndex - 1)) * plotWidth
			: plotWidth / 2);
	const yFor = (value: number) =>
		PADDING +
		plotHeight -
		((value - minValue) / (maxValue - minValue || 1)) * plotHeight;

	return (
		<div className="discovery-chart">
			<svg
				viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
				role="img"
				aria-label={yLabel}
			>
				<line
					x1={PADDING}
					y1={PADDING}
					x2={PADDING}
					y2={HEIGHT - PADDING}
					stroke="var(--line)"
				/>
				<line
					x1={PADDING}
					y1={HEIGHT - PADDING}
					x2={WIDTH - PADDING}
					y2={HEIGHT - PADDING}
					stroke="var(--line)"
				/>
				<text x={4} y={PADDING} className="chart-axis-label">
					{yFormat(maxValue)}
				</text>
				<text
					x={4}
					y={HEIGHT - PADDING}
					className="chart-axis-label"
				>
					{yFormat(minValue)}
				</text>
				{results.map((result, index) => {
					const color = PALETTE[index % PALETTE.length];
					const points = result.runs
						.map((run) => `${xFor(run.runIndex)},${yFor(valueOf(run))}`)
						.join(" ");
					return (
						<g key={result.config.id}>
							<polyline
								points={points}
								fill="none"
								stroke={color}
								strokeWidth={2}
								opacity={0.9}
							/>
							{result.runs.map((run) => (
								<circle
									key={run.runIndex}
									cx={xFor(run.runIndex)}
									cy={yFor(valueOf(run))}
									r={2.5}
									fill={color}
								/>
							))}
						</g>
					);
				})}
			</svg>
			<div className="discovery-chart-legend">
				{results.map((result, index) => (
					<span key={result.config.id}>
						<i
							className="dot"
							style={{
								background: PALETTE[index % PALETTE.length],
							}}
						/>
						{sequenceLabel(result)}
					</span>
				))}
			</div>
		</div>
	);
}
