import type { ReactNode } from "react";

export function Panel({
	title,
	note,
	children,
	wide = false,
}: {
	title: string;
	note?: string;
	children: ReactNode;
	wide?: boolean;
}) {
	return (
		<section className={`panel ${wide ? "wide" : ""}`}>
			<div className="panel-heading">
				<h2>{title}</h2>
				{note && <p>{note}</p>}
			</div>
			{children}
		</section>
	);
}
