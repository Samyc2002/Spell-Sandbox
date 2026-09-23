"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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
	const pathname = usePathname();

	return (
		<header className="topbar">
			<div className="brand-block">
				<div>
					<p className="eyebrow">SPELLBOX / RESEARCH CONSOLE</p>
					<h1>{title}</h1>
					<p className="lede">{lede}</p>
				</div>
			</div>
			<nav className="page-nav">
				<Link
					href="/"
					className={`page-nav-link ${pathname === "/" ? "active" : ""}`}
				>
					Single Run
				</Link>
				<Link
					href="/batch"
					className={`page-nav-link ${pathname === "/batch" ? "active" : ""}`}
				>
					Batch Runs
				</Link>
			</nav>
		</header>
	);
}
