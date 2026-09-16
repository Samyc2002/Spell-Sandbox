export function DashboardHeader({
	amount,
	isLoading,
	onAmountChange,
	onSubmit,
}: {
	amount: string;
	isLoading: boolean;
	onAmountChange: (amount: string) => void;
	onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
	return (
		<header className="topbar">
			<div>
				<p className="eyebrow">SPELLBOX / RESEARCH CONSOLE</p>
				<h1>
					Bulk metrics <span>plotter</span>
				</h1>
				<p className="lede">
					Generate a sample, then inspect the shape of the spell space
					it reveals.
				</p>
			</div>
			<form onSubmit={onSubmit} className="generator">
				<label htmlFor="amount">SPELLS TO GENERATE</label>
				<div>
					<input
						id="amount"
						type="number"
						min="1"
						max="124406"
						value={amount}
						onChange={(event) => onAmountChange(event.target.value)}
					/>
					<button type="submit" disabled={isLoading}>
						{isLoading ? "Processing..." : "Run analysis"}{" "}
						<span>↗</span>
					</button>
				</div>
			</form>
		</header>
	);
}
