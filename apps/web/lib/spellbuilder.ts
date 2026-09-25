import type {
	BasicSpell,
	CentralSymbol,
	Composition,
	Control,
	Manifestation,
	Sigil,
	Sign,
	Transformation,
} from "spellbox/src/models/spell";

export const SIGILS: readonly Sigil[] = ["Air", "Water", "Earth", "Fire", "Light"];
export const CONTROL_SIGNS: readonly Control[] = [
	"Levitation",
	"Float",
	"Pull",
	"Collection",
	"Convergence",
];
export const MANIFESTATION_SIGNS: readonly Manifestation[] = [
	"Column",
	"Dispersion",
	"Bolt",
	"Rain",
	"Bird",
];
export const TRANSFORMATION_SIGNS: readonly Transformation[] = [
	"Crush",
	"Billowing",
	"Repetition",
	"Weave",
	"Enlarge",
];
export const COMPOSITIONS: readonly Composition[] = ["Radial"];

export type SignCategory = "control" | "manifestation" | "transformation";

export function signCategoryOf(sign: Sign): SignCategory {
	if ((CONTROL_SIGNS as readonly string[]).includes(sign)) return "control";
	if ((MANIFESTATION_SIGNS as readonly string[]).includes(sign))
		return "manifestation";
	return "transformation";
}

/** Icon path for a sign name, served from apps/web/public/assets/signs. */
export function signIconPath(sign: Sign | Composition): string {
	return `/assets/signs/${sign}.webp`;
}

/** Icon path for a sigil name, served from apps/web/public/assets/sigils. */
export function sigilIconPath(sigil: Sigil): string {
	return `/assets/sigils/${sigil}.webp`;
}

export function isCompositionSymbol(
	symbol: CentralSymbol,
): symbol is { composition: Composition; sigils: [Sigil, Sigil] } {
	return typeof symbol === "object" && symbol !== null;
}

export function emptyBasicSpell(): BasicSpell {
	return {
		symbol: "Air",
		sign: [{ sign: "Levitation" }],
	};
}

/**
 * Every BasicSpell node in the tree gets a stable canvas id so it can be
 * dragged around freely without its identity shifting when siblings change.
 * Ids are generated once when a node is created and carried in a side-table
 * (NodeId -> BasicSpell path) rather than on the BasicSpell itself, since
 * BasicSpell's shape is owned by the spellbox package and must stay pure.
 */
export type NodeId = string;

let idCounter = 0;
export function newNodeId(): NodeId {
	idCounter += 1;
	return `node-${idCounter}-${Date.now().toString(36)}`;
}

export interface CanvasPoint {
	x: number;
	y: number;
}

/**
 * A BasicSpell node plus the bookkeeping the canvas needs: a stable id
 * (survives edits to sibling nodes) and its own free-form position.
 * `children` mirrors `spell.spell`: undefined = leaf, one entry = nested,
 * many entries = linked branches (order matches the underlying array).
 */
export interface CanvasNode {
	id: NodeId;
	spell: BasicSpell;
	position: CanvasPoint;
	children?: CanvasNode[];
	linked: boolean;
}

export function createCanvasNode(
	spell: BasicSpell,
	position: CanvasPoint,
): CanvasNode {
	let children: CanvasNode[] | undefined;
	let linked = false;
	if (Array.isArray(spell.spell)) {
		linked = true;
		children = spell.spell.map((child, i) =>
			createCanvasNode(child, {
				x: position.x + 220,
				y: position.y + i * 160,
			}),
		);
	} else if (spell.spell) {
		children = [
			createCanvasNode(spell.spell, { x: position.x + 220, y: position.y }),
		];
	}
	return { id: newNodeId(), spell, position, children, linked };
}

/** Rebuilds the plain BasicSpell tree (for validation/scoring) from a CanvasNode tree. */
export function canvasNodeToSpell(node: CanvasNode): BasicSpell {
	const base: BasicSpell = { symbol: node.spell.symbol, sign: node.spell.sign };
	if (!node.children || node.children.length === 0) {
		return base;
	}
	if (node.linked) {
		base.spell = node.children.map(canvasNodeToSpell);
	} else {
		base.spell = canvasNodeToSpell(node.children[0]);
	}
	return base;
}

export function findCanvasNode(root: CanvasNode, id: NodeId): CanvasNode | null {
	if (root.id === id) return root;
	for (const child of root.children ?? []) {
		const found = findCanvasNode(child, id);
		if (found) return found;
	}
	return null;
}

/** Returns a new tree with `updater` applied to the node matching `id`. */
export function updateCanvasNode(
	root: CanvasNode,
	id: NodeId,
	updater: (node: CanvasNode) => CanvasNode,
): CanvasNode {
	if (root.id === id) return updater(root);
	if (!root.children) return root;
	return {
		...root,
		children: root.children.map((child) => updateCanvasNode(child, id, updater)),
	};
}

/** Removes the node matching `id` from anywhere in the tree (no-op for the root). */
export function removeCanvasNode(root: CanvasNode, id: NodeId): CanvasNode {
	if (!root.children) return root;
	const remaining = root.children.filter((child) => child.id !== id);
	const children = remaining.map((child) => removeCanvasNode(child, id));
	if (children.length === 0) {
		return { ...root, children: undefined, linked: false };
	}
	return { ...root, children };
}

export function addNestedChild(root: CanvasNode, parentId: NodeId): CanvasNode {
	return updateCanvasNode(root, parentId, (node) => {
		if (node.children && node.children.length > 0) return node;
		const child = createCanvasNode(emptyBasicSpell(), {
			x: node.position.x + 220,
			y: node.position.y,
		});
		return { ...node, children: [child], linked: false };
	});
}

export function addLinkedBranch(root: CanvasNode, parentId: NodeId): CanvasNode {
	return updateCanvasNode(root, parentId, (node) => {
		if (node.children && !node.linked) return node;
		const existing = node.children ?? [];
		const child = createCanvasNode(emptyBasicSpell(), {
			x: node.position.x + 220,
			y: node.position.y + existing.length * 160,
		});
		return { ...node, children: [...existing, child], linked: true };
	});
}

/** True if this node sits anywhere inside a linked branch (its children can't be nested/linked further). */
export function isInsideLinkedBranch(
	root: CanvasNode,
	id: NodeId,
	ancestorLinked = false,
): boolean | null {
	if (root.id === id) return ancestorLinked;
	for (const child of root.children ?? []) {
		const result = isInsideLinkedBranch(child, id, root.linked);
		if (result !== null) return result;
	}
	return null;
}
