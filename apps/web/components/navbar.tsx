"use client";

import Link from "next/dist/client/link";
import { usePathname } from "next/dist/client/components/navigation";

export function Navbar() {

	const pathname = usePathname();

	return (
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
	);
}
