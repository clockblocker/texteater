import { useId } from "react";
import {
	getWorkspaceStateLabel,
	selectWorkspaceTransitionDescriptors,
	WORKSPACE_TRANSITIONS,
	type WorkspaceState,
} from "react-resizable-panels/workspace";

export type TransitionRecord = { from: string; command: string; to: string };
const nodes = [
	{ id: "UnderlyingSheet", lines: ["Underlying", "Sheet"], x: 14, y: 18 },
	{ id: "CardLayerOpen", lines: ["Card Layer", "open"], x: 192, y: 18 },
	{
		id: "HoldingPresentation",
		lines: ["Holding", "Presentation"],
		x: 192,
		y: 180,
	},
	{ id: "SheetExpanded", lines: ["Sheet", "expanded"], x: 14, y: 180 },
];
const title = (value: string) => value.replace(/([a-z])([A-Z])/g, "$1 $2");

export function WorkspaceStateInspector<S>({
	state,
	history,
	onClose,
}: {
	state: WorkspaceState<S>;
	history: TransitionRecord[];
	onClose(): void;
}) {
	const arrowId = useId();
	const current = getWorkspaceStateLabel(state);
	const transitions = [
		...WORKSPACE_TRANSITIONS,
		...selectWorkspaceTransitionDescriptors(state).filter(
			(transition) => transition.command === "CancelGesture",
		),
	];
	return (
		<aside
			className="workspace-state-inspector"
			aria-label="Workspace state machine"
		>
			<header>
				<h2>State machine</h2>
				<button
					type="button"
					onClick={onClose}
					aria-label="Hide state machine"
				>
					×
				</button>
			</header>
			<p className="workspace-state-inspector__current" role="status">
				{title(current)}
			</p>
			<svg
				viewBox="0 0 320 255"
				role="img"
				aria-label={`Workspace transitions. Current state: ${title(current)}`}
			>
				<defs>
					<marker
						id={arrowId}
						viewBox="0 0 10 10"
						refX="9"
						refY="5"
						markerWidth="5"
						markerHeight="5"
						orient="auto-start-reverse"
					>
						<path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
					</marker>
				</defs>
				{transitions.map((transition, index) => {
					const from = nodes.find(
						(node) => node.id === transition.from,
					);
					const to = nodes.find((node) => node.id === transition.to);
					if (!from || !to) return null;
					const fx = from.x + 56,
						fy = from.y + 28,
						tx = to.x + 56,
						ty = to.y + 28;
					const dx = tx - fx,
						dy = ty - fy,
						length = Math.hypot(dx, dy);
					const inset = Math.abs(dx) > Math.abs(dy) ? 64 : 38;
					const x1 = fx + (dx / length) * inset,
						y1 = fy + (dy / length) * inset,
						x2 = tx - (dx / length) * inset,
						y2 = ty - (dy / length) * inset;
					const bend =
						transition.command === "CancelGesture" ? 30 : 12;
					return (
						<path
							key={`${transition.command}-${index}`}
							d={`M ${x1} ${y1} Q ${(x1 + x2) / 2 - (dy / length) * bend} ${(y1 + y2) / 2 + (dx / length) * bend} ${x2} ${y2}`}
							fill="none"
							markerEnd={`url(#${arrowId})`}
							data-current={transition.from === current}
							data-cancel={transition.command === "CancelGesture"}
						>
							<title>{transition.label}</title>
						</path>
					);
				})}
				{nodes.map((node) => (
					<g key={node.id} data-current={node.id === current}>
						<rect
							x={node.x}
							y={node.y}
							width="112"
							height="56"
							rx="8"
						/>
						{node.lines.map((line, index) => (
							<text
								key={line}
								x={node.x + 56}
								y={node.y + 24 + index * 16}
								textAnchor="middle"
							>
								{line}
							</text>
						))}
					</g>
				))}
			</svg>
			<ol
				className="workspace-state-inspector__arrows"
				aria-label="State transitions"
			>
				{transitions.map((transition, index) => (
					<li
						key={`${transition.command}-${index}`}
						data-current={transition.from === current}
					>
						<span>{transition.label}</span>
						<small>
							{title(transition.from)} → {title(transition.to)}
						</small>
					</li>
				))}
			</ol>
			<details>
				<summary>Recent transitions</summary>
				<ol>
					{history.map((transition, index) => (
						<li key={`${index}-${transition.command}`}>
							{transition.command}: {title(transition.from)} →{" "}
							{title(transition.to)}
						</li>
					))}
				</ol>
			</details>
			<details>
				<summary>Inspect state</summary>
				<pre>{JSON.stringify(state, null, 2)}</pre>
			</details>
		</aside>
	);
}
