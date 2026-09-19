export function LogoMark({ className = "" }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 120 120"
			aria-label="Spellbox logo"
			role="img"
			className={className}
		>
			<defs>
				<linearGradient
					id="spellbox-mark-gradient"
					x1="0%"
					x2="100%"
					y1="0%"
					y2="100%"
				>
					<stop offset="0%" stopColor="#58c8b0" />
					<stop offset="55%" stopColor="#9adfcb" />
					<stop offset="100%" stopColor="#f5a65b" />
				</linearGradient>
			</defs>
			<circle
				cx="60"
				cy="60"
				r="52"
				fill="rgba(88,200,176,0.08)"
				stroke="rgba(255,255,255,0.18)"
			/>
			<circle
				cx="60"
				cy="60"
				r="38"
				fill="none"
				stroke="url(#spellbox-mark-gradient)"
				strokeWidth="2.5"
			/>
			<path
				d="M60 18 L78 47 L60 102 L42 47 Z"
				fill="none"
				stroke="url(#spellbox-mark-gradient)"
				strokeWidth="2.5"
				strokeLinejoin="round"
			/>
			<path
				d="M18 60 L47 42 L102 60 L47 78 Z"
				fill="none"
				stroke="url(#spellbox-mark-gradient)"
				strokeWidth="2.5"
				strokeLinejoin="round"
			/>
			<path
				d="M60 16 L60 104 M16 60 L104 60"
				stroke="rgba(255,255,255,0.62)"
				strokeWidth="1.2"
				strokeLinecap="round"
			/>
			<circle
				cx="60"
				cy="60"
				r="7"
				fill="#f5a65b"
				stroke="#0b0d10"
				strokeWidth="2"
			/>
			<circle cx="30" cy="60" r="4" fill="#58c8b0" />
			<circle cx="90" cy="60" r="4" fill="#58c8b0" />
			<circle cx="60" cy="30" r="4" fill="#f5a65b" />
			<circle cx="60" cy="90" r="4" fill="#f5a65b" />
		</svg>
	);
}
