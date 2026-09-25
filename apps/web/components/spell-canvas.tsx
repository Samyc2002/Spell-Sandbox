"use client";

import { useCallback, useRef } from "react";
import { X, GripVertical, Link2 } from "lucide-react";
import { MagicCircle } from "@/components/magic-circle";
import {
	addLinkedBranch,
	addNestedChild,
	canvasNodeToSpell,
	removeCanvasNode,
	updateCanvasNode,
	type CanvasNode,
	type CanvasPoint,
	type NodeId,
} from "@/lib/spellbuilder";
import type { BasicSpell } from "spellbox/src/models/spell";

const CIRCLE_SIZE = 220;

/**
 * Only the root and linked branches get their own canvas position — nested
 * (non-linked) children draw as a smaller concentric ring inside their
 * parent's own MagicCircle, so they never appear here or get a connector.
 */
function positionedNodes(
	node: CanvasNode,
	relation: "root" | "linked" = "root",
): { node: CanvasNode; relation: "root" | "linked" }[] {
	if (!node.children || node.children.length === 0 || !node.linked) {
		return [{ node, relation }];
	}
	return [
		{ node, relation },
		...node.children.flatMap((child) => positionedNodes(child, "linked")),
	];
}

function connectorLines(node: CanvasNode): { from: CanvasPoint; to: CanvasPoint }[] {
	if (!node.children || node.children.length === 0 || !node.linked) return [];
	const lines = node.children.map((child) => ({
		from: { x: node.position.x + CIRCLE_SIZE / 2, y: node.position.y + CIRCLE_SIZE / 2 },
		to: { x: child.position.x + CIRCLE_SIZE / 2, y: child.position.y + CIRCLE_SIZE / 2 },
	}));
	return [...lines, ...node.children.flatMap(connectorLines)];
}

export function SpellCanvas({
	root,
	onChangeRoot,
}: {
	root: CanvasNode;
	onChangeRoot: (root: CanvasNode) => void;
	onChangeSpell?: (spell: BasicSpell) => void;
}) {
	const canvasRef = useRef<HTMLDivElement>(null);
	const dragState = useRef<{ id: NodeId; offsetX: number; offsetY: number } | null>(null);

	const beginNodeDrag = useCallback(
		(nodeId: NodeId, node: CanvasNode) => (e: React.PointerEvent) => {
			const canvasRect = canvasRef.current?.getBoundingClientRect();
			if (!canvasRect) return;
			dragState.current = {
				id: nodeId,
				offsetX: e.clientX - canvasRect.left - node.position.x,
				offsetY: e.clientY - canvasRect.top - node.position.y,
			};

			const handleMove = (moveEvent: PointerEvent) => {
				if (!dragState.current || !canvasRef.current) return;
				const rect = canvasRef.current.getBoundingClientRect();
				const x = Math.max(0, moveEvent.clientX - rect.left - dragState.current.offsetX);
				const y = Math.max(0, moveEvent.clientY - rect.top - dragState.current.offsetY);
				onChangeRoot(
					updateCanvasNode(root, dragState.current.id, (n) => ({ ...n, position: { x, y } })),
				);
			};

			const handleUp = () => {
				dragState.current = null;
				window.removeEventListener("pointermove", handleMove);
				window.removeEventListener("pointerup", handleUp);
			};

			window.addEventListener("pointermove", handleMove);
			window.addEventListener("pointerup", handleUp);
		},
		[root, onChangeRoot],
	);

	const allNodes = positionedNodes(root);
	const lines = connectorLines(root);

	return (
		<div className="canvas-layout">
			<div className="canvas-tray">
				<p className="field-caption">How to edit</p>
				<p className="hint-text">
					Click the center of a circle to set its sigil, transformation, or Radial
					composition. Click the empty core to add a sign; click a placed sign to
					reverse or remove it.
				</p>

				<p className="field-caption">Structure</p>
				<div className="tray-grid tray-grid-stack">
					{allNodes.map(({ node, relation }) => (
						<button
							key={`nest-${node.id}`}
							className="structure-action"
							onClick={() => onChangeRoot(addNestedChild(root, node.id))}
						>
							Nest inside {relation === "root" ? "root" : "branch"}
						</button>
					))}
					{allNodes.map(({ node, relation }) => (
						<button
							key={`link-${node.id}`}
							className="structure-action"
							onClick={() => onChangeRoot(addLinkedBranch(root, node.id))}
						>
							<Link2 size={12} /> Link from {relation === "root" ? "root" : "branch"}
						</button>
					))}
				</div>

				<div className="relation-legend">
					<span>
						<i className="legend-swatch legend-swatch-nested" /> Nested — smaller
						ring inside the center, resolves first
					</span>
					<span>
						<i className="legend-swatch legend-swatch-linked" /> Linked — separate
						circle, dashed connector, fires as a sibling
					</span>
				</div>
			</div>

			<div className="canvas-surface" ref={canvasRef}>
				<svg className="canvas-connectors">
					{lines.map((line, i) => (
						<line
							key={i}
							x1={line.from.x}
							y1={line.from.y}
							x2={line.to.x}
							y2={line.to.y}
							className="connector-linked"
						/>
					))}
				</svg>

				{allNodes.map(({ node, relation }) => (
					<div
						key={node.id}
						className="circle-mount"
						style={{ left: node.position.x, top: node.position.y, width: CIRCLE_SIZE }}
					>
						<div className="circle-mount-heading">
							<button
								type="button"
								className="icon-btn drag-handle"
								onPointerDown={beginNodeDrag(node.id, node)}
								aria-label="Move spell"
							>
								<GripVertical size={14} />
							</button>
							<span
								className={`relation-badge ${
									relation === "root" ? "relation-badge-root" : "relation-badge-linked"
								}`}
							>
								{relation === "root" ? "Root spell" : "Linked branch"}
							</span>
							{relation !== "root" && (
								<button
									type="button"
									className="icon-btn"
									onClick={() => onChangeRoot(removeCanvasNode(root, node.id))}
									aria-label="Remove spell"
								>
									<X size={12} />
								</button>
							)}
						</div>
						<MagicCircle
							node={node}
							size={CIRCLE_SIZE}
							onChangeNode={(next) => onChangeRoot(updateCanvasNode(root, node.id, () => next))}
						/>
					</div>
				))}
			</div>
		</div>
	);
}

export { canvasNodeToSpell };
