import json

sigils = [
    "Air",
    "Water",
    "Earth",
    "Fire",
    "Light"
]

manifestation = [
    "Column",
    "Dispersion",
    "Bolt",
    "Rain",
    "Bird",
]

control = [
    "Direction",
    "Levitation",
    "Float",
    "Pull",
    "Collection",
    "Convergence",
]

transformation = [
    "Crush",
    "Billowing",
    "Repetition",
    "Weave",
    "Enlarge",
]

composition = [
    "Radial",
]

signs = manifestation + control + transformation + composition

types = ["Documentation", "Models", "Code", "Compatibility"]
print("What for?")
for i, type in enumerate(types):
    print(f"{i} - {type}")

tpe = int(input())


def stringify(inp):
    s = []
    for i in inp:
        s.append(f"\"{i}\"")

    return s


def arrayfy(inp):
    return f"[ {', '.join(stringify(inp))} ]"


if tpe == 0:
    # Print for Docs
    print("Sigils:")
    for i, sigil in enumerate(sigils):
        print(f"{i+1}. [{sigil}](Assets\\Sigils\\{sigil}.webp)")

    print("Signs:")
    for i, sign in enumerate(signs):
        print(f"{i+1}. [{sign}](Assets\\Signs\\{sign}.webp)")
elif tpe == 1:
    # Print for models
    print("type Sigil = " + " | ".join(stringify(sigils)))
    print("type Manifestation = " + " | ".join(stringify(manifestation)))
    print("type Control = " + " | ".join(stringify(control)))
    print("type Transformation = " + " | ".join(stringify(transformation)))
    print("type Composition = " + " | ".join(stringify(composition)))
elif tpe == 2:
    # Print for code
    print("const Sigil = " + arrayfy(sigils))
    print("const Manifestation = " + arrayfy(manifestation))
    print("const Control = " + arrayfy(control))
    print("const Transformation = " + arrayfy(transformation))
    print("const Composition = " + arrayfy(composition))
elif tpe == 3:
    compatibility_status = {}
    compatibility = {}
    for a in sigils:
        for b in sigils:
            status = "compatible" if a == b else "unspecified"
            if a != b and a == "Light" or b == "Light":
                status = "incompatible"
            elif a != b:
                status = "compatible"
            compatibility_status[f"{a}+{b}"] = status
            if status == "compatible":
                compatibility[f"{a}+{b}"] = "_T_"
    print(json.dumps(compatibility_status, indent=4))
    print(json.dumps(compatibility, indent=4))
