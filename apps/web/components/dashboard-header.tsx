"use client";

export function DashboardHeader({
	title = (
		<>
			Bulk metrics <span>plotter</span>
		</>
	),
	lede = "Generate a sample, then inspect the shape of the spell space it reveals.",
}: {
	title?: React.ReactNode;
	lede?: React.ReactNode;
}) {

	return (
		<header className="topbar">
			<div className="brand-block">
				<div>
					<p className="eyebrow">SPELLBOX / RESEARCH CONSOLE</p>
					<h1>{title}</h1>
					<p className="lede">{lede}</p>
				</div>
			</div>
		</header>
	);
}
