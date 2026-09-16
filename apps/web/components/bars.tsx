export function Bars({
	values,
	labels,
	color = "#58c8b0",
	horizontal = false,
}: {
	values: number[];
	labels: string[];
	color?: string;
	horizontal?: boolean;
}) {
	const max = Math.max(...values, 1);
	return (
		<div className={`bars ${horizontal ? "bars-horizontal" : ""}`}>
			{values.map((value, index) => (
				<div className="bar-row" key={`${labels[index]}-${index}`}>
					<span className="bar-label">{labels[index]}</span>
					<div className="bar-track">
						<i
							style={{
								[horizontal ? "width" : "height"]:
									`${(value / max) * 100}%`,
								background: color,
							}}
						/>
					</div>
					<b>{value}</b>
				</div>
			))}
		</div>
	);
}
