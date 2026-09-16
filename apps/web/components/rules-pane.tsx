const ruleGroups = [
	{
		title: "Core construction",
		rules: [
			"Every spell needs a central symbol: an elemental sigil or a transformation sign.",
			"Control signs sit around the central symbol and govern position, movement, attraction, direction, distribution, or concentration.",
			"Manifestation signs are optional and define the shape, medium, or delivery pattern of the effect.",
			"A complete ring must enclose the central symbol and signs for the spell to activate.",
			"Composition signs combine multiple magical sources or effects and can take the place of the central symbol.",
		],
	},
	{
		title: "Sign families",
		rules: [
			"Manifestation: Column, Dispersion, Bolt, Rain, and Bird.",
			"Control: Levitation, Float, Pull, Collection, and Convergence.",
			"Transformation: Crush, Billowing, Repetition, Weave, and Enlarge.",
			"Composition: Radial combines compatible sigils into a single effect.",
		],
	},
	{
		title: "Advanced systems",
		rules: [
			"Linked spells activate at the same time while retaining independent effects.",
			"Reversed signs produce an opposite effect; matching normal and reversed spells can cancel each other.",
			"A spell can be toggled by completing or disconnecting its ring across two touching halves.",
			"Nested glyphs resolve from the innermost spell outward once the outermost ring closes.",
			"A spell can be nested or linked, but not both.",
		],
	},
	{
		title: "Design constraints",
		rules: [
			"Spells are represented as structured JSON shared by generated and user-created spells.",
			"The interpreter evaluates spell structures and computes their metrics.",
			"Transformation signs may initially be limited to object transformations where their elemental meaning is ambiguous.",
		],
	},
];

export function RulesPane() {
	return (
		<aside className="rules-pane">
			<div className="rules-heading">
				<p className="eyebrow">REFERENCE / 01</p>
				<h2>Spell rules</h2>
				<p>Structural constraints behind every generated glyph.</p>
			</div>
			<div className="rules-list">
				{ruleGroups.map((group, groupIndex) => (
					<section className="rule-group" key={group.title}>
						<div className="rule-group-heading">
							<span>0{groupIndex + 1}</span>
							<h3>{group.title}</h3>
						</div>
						<ul>
							{group.rules.map((rule) => (
								<li key={rule}>{rule}</li>
							))}
						</ul>
					</section>
				))}
			</div>
		</aside>
	);
}
