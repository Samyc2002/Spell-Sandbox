sigils = [
    "Air",
    "Water",
    "Earth",
    "Fire",
    "Light"
]

signs = [
    "Column",
    "Dispersion",
    "Levitation",
    "Pull",
    "Crush",
    "Float",
    "Direction",
    "Convergence",
    "Collection",
    "Radial",
    "Bolt",
    "Billowing",
    "Repetition",
    "Weave",
    "Enlarge",
    "Rain",
    "Bird",
]

print("Sigils:")
for i, sigil in enumerate(sigils):
    print(f"\t{i+1}. [{sigil}](Assets\Sigils\{sigil}.webp)")

print("Signs:")
for i, sign in enumerate(signs):
    print(f"\t{i+1}. [{sign}](Assets\Signs\{sign}.webp)")