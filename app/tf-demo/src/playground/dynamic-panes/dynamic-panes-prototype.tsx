// THROWAWAY: Can edge docking create and prune a split tree while preserving
// Cards and Sheet Stacks? In-memory playground adaptation of a logic prototype.
import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
	FIXTURE_TEXT_SUBJECT,
	renderFixtureSubject,
} from "@/playground/sheet-workspace/sheet-workspace-fixtures";
import {
	type WorkspaceSubject,
	workspaceSubjectFor,
} from "@/workspace/sheet-workspace";
import {
	PASSIVE_WORKSPACE_INTERACTION,
	WorkspaceInteractionProvider,
} from "@/workspace/workspace-controller";
import "./dynamic-panes-prototype.css";

type Sheet = { id: string; subject: WorkspaceSubject };
type Pane = { kind: "Pane"; id: string; sheets: Sheet[] };
type Split = {
	kind: "Split";
	id: string;
	axis: "horizontal" | "vertical";
	children: [Tree, Tree];
};
type Tree = Pane | Split;
type Edge = "left" | "right" | "top" | "bottom";
type Destination = { paneId: string; edge: Edge | "inside" };
type Drag = {
	kind: "Sheet" | "Card";
	sourcePaneId: string;
	sheet: Sheet;
	edge: "top" | "bottom";
	x: number;
	y: number;
	startX: number;
	startY: number;
	destination: Destination | null;
};
const initialTree = (): Pane => ({
	kind: "Pane",
	id: "pane-1",
	sheets: [{ id: "source-text", subject: FIXTURE_TEXT_SUBJECT }],
});
const freshId = () => crypto.randomUUID();
const panes = (tree: Tree): Pane[] =>
	tree.kind === "Pane" ? [tree] : tree.children.flatMap(panes);
function replacePane(
	tree: Tree,
	id: string,
	change: (pane: Pane) => Tree,
): Tree {
	return tree.kind === "Pane"
		? tree.id === id
			? change(tree)
			: tree
		: {
				...tree,
				children: tree.children.map((child) =>
					replacePane(child, id, change),
				) as [Tree, Tree],
			};
}
function prune(tree: Tree): Tree | null {
	if (tree.kind === "Pane") return tree.sheets.length ? tree : null;
	const left = prune(tree.children[0]);
	const right = prune(tree.children[1]);
	return left && right
		? { ...tree, children: [left, right] }
		: (left ?? right);
}
function place(tree: Tree, drag: Drag): Tree {
	const destination = drag.destination;
	if (!destination) return tree;
	if (
		drag.kind === "Sheet" &&
		destination.paneId === drag.sourcePaneId &&
		destination.edge === "inside"
	)
		return tree;
	const target = panes(tree).find((pane) => pane.id === destination.paneId);
	if (!target) return tree;
	// Splitting a lone Sheet against itself would only create an empty Pane.
	if (
		drag.kind === "Sheet" &&
		target.id === drag.sourcePaneId &&
		target.sheets.length === 1
	)
		return tree;
	let next =
		drag.kind === "Sheet"
			? replacePane(tree, drag.sourcePaneId, (pane) => ({
					...pane,
					sheets: pane.sheets.filter(
						(sheet) => sheet.id !== drag.sheet.id,
					),
				}))
			: tree;
	next = replacePane(next, destination.paneId, (pane) => {
		if (destination.edge === "inside")
			return { ...pane, sheets: [...pane.sheets, drag.sheet] };
		const added: Pane = {
			kind: "Pane",
			id: freshId(),
			sheets: [drag.sheet],
		};
		return {
			kind: "Split",
			id: freshId(),
			axis:
				destination.edge === "left" || destination.edge === "right"
					? "horizontal"
					: "vertical",
			children:
				destination.edge === "left" || destination.edge === "top"
					? [added, pane]
					: [pane, added],
		};
	});
	return prune(next) ?? initialTree();
}
function subjectLabel(subject: WorkspaceSubject) {
	return subject.kind === "Text"
		? "Source text"
		: subject.target.kind === "UnitReadingNote"
			? "Reading"
			: subject.target.kind === "RouteNote"
				? subject.target.routeKind
				: "Note";
}

export function DynamicPanesPrototype() {
	const [tree, setTree] = useState<Tree>(initialTree);
	const [active, setActive] = useState("pane-1");
	const [layers, setLayers] = useState<Record<string, Sheet[]>>({});
	const [drag, setDrag] = useState<Drag | null>(null);
	const dragRef = useRef<Drag | null>(null);
	const [sizes, setSizes] = useState<Record<string, Record<string, number>>>(
		{},
	);
	const [message, setMessage] = useState(
		"Select a word to open Cards. Drop at a Pane edge to split it.",
	);
	const [showState, setShowState] = useState(false);
	const root = useRef<HTMLDivElement>(null);
	function updateDrag(value: Drag | null) {
		dragRef.current = value;
		setDrag(value);
	}
	useEffect(() => {
		const cancel = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				updateDrag(null);
				setLayers({});
				setMessage("Cancelled. Placed Sheets unchanged.");
			}
		};
		window.addEventListener("keydown", cancel);
		return () => window.removeEventListener("keydown", cancel);
	}, []);
	function destinationAt(x: number, y: number): Destination | null {
		for (const element of root.current?.querySelectorAll<HTMLElement>(
			"[data-dynamic-pane]",
		) ?? []) {
			const r = element.getBoundingClientRect();
			if (x < r.left || x > r.right || y < r.top || y > r.bottom)
				continue;
			const candidates = [
				{
					edge: "left" as const,
					distance: (x - r.left) / Math.min(80, r.width * 0.23),
				},
				{
					edge: "right" as const,
					distance: (r.right - x) / Math.min(80, r.width * 0.23),
				},
				{
					edge: "top" as const,
					distance: (y - r.top) / Math.min(80, r.height * 0.23),
				},
				{
					edge: "bottom" as const,
					distance: (r.bottom - y) / Math.min(80, r.height * 0.23),
				},
			].sort((a, b) => a.distance - b.distance);
			const closest = candidates[0];
			return {
				paneId: element.dataset.dynamicPane!,
				edge: closest && closest.distance < 1 ? closest.edge : "inside",
			};
		}
		return null;
	}
	function begin(
		event: ReactPointerEvent<HTMLButtonElement>,
		paneId: string,
		sheet: Sheet,
		kind: Drag["kind"],
		edge: Drag["edge"],
	) {
		if (event.button !== 0) return;
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		setActive(paneId);
		updateDrag({
			kind,
			sourcePaneId: paneId,
			sheet,
			edge,
			x: event.clientX,
			y: event.clientY,
			startX: event.clientX,
			startY: event.clientY,
			destination: null,
		});
	}
	function move(event: ReactPointerEvent<HTMLButtonElement>) {
		const current = dragRef.current;
		if (current)
			updateDrag({
				...current,
				x: event.clientX,
				y: event.clientY,
				destination: destinationAt(event.clientX, event.clientY),
			});
	}
	function finish(event: ReactPointerEvent<HTMLButtonElement>) {
		const current = dragRef.current;
		if (!current) return;
		const completed = {
			...current,
			destination: destinationAt(event.clientX, event.clientY),
		};
		if (
			Math.hypot(
				event.clientX - current.startX,
				event.clientY - current.startY,
			) > 4
		) {
			const next = place(tree, completed);
			if (next !== tree) {
				setTree(next);
				const destinationPane = panes(next).find((pane) =>
					pane.sheets.some((sheet) => sheet.id === current.sheet.id),
				);
				setActive(destinationPane?.id ?? panes(next)[0]!.id);
				// A layer belongs to its source presentation; a move dismisses it.
				setLayers({});
				setMessage(
					`${current.kind} placed ${completed.destination?.edge === "inside" ? "on the Sheet Stack" : `in a new split (${completed.destination?.edge})`}. ${panes(next).length} Panes.`,
				);
			} else setMessage("No placement. The Sheet stays where it was.");
		}
		updateDrag(null);
	}
	function handle(
		pane: Pane,
		sheet: Sheet,
		kind: Drag["kind"],
		edge: Drag["edge"],
	) {
		return (
			<button
				type="button"
				className="dynamic-panes__lift"
				data-edge={edge}
				aria-label={`Lift ${subjectLabel(sheet.subject)} ${kind} from ${edge} edge`}
				onPointerDown={(event) =>
					begin(event, pane.id, sheet, kind, edge)
				}
				onPointerMove={move}
				onPointerUp={finish}
				onPointerCancel={() => updateDrag(null)}
				onLostPointerCapture={() => updateDrag(null)}
			>
				<span />
			</button>
		);
	}
	function removeTop(pane: Pane) {
		const next = prune(
			replacePane(tree, pane.id, (value) => ({
				...value,
				sheets: value.sheets.slice(0, -1),
			})),
		);
		const fallback: Pane = { kind: "Pane", id: "pane-1", sheets: [] };
		setTree(next ?? fallback);
		setLayers({});
		setActive(panes(next ?? fallback)[0]!.id);
		setMessage("Top Sheet removed. Empty splits reclaimed.");
	}
	function renderTree(node: Tree): React.ReactNode {
		if (node.kind === "Split")
			return (
				<ResizablePanelGroup
					key={node.id}
					id={node.id}
					orientation={node.axis}
					defaultLayout={sizes[node.id]}
					onLayoutChanged={(layout, meta) => {
						if (meta.isUserInteraction) {
							setSizes((current) => ({
								...current,
								[node.id]: layout,
							}));
							setMessage("Split resized.");
						}
					}}
				>
					<ResizablePanel id={node.children[0].id} minSize="120px">
						{renderTree(node.children[0])}
					</ResizablePanel>
					<ResizableHandle
						className="dynamic-panes__separator"
						aria-label={`Resize ${node.axis} split`}
					/>
					<ResizablePanel id={node.children[1].id} minSize="120px">
						{renderTree(node.children[1])}
					</ResizablePanel>
				</ResizablePanelGroup>
			);
		const top = node.sheets.at(-1);
		const cards = layers[node.id] ?? [];
		const destination =
			drag?.destination?.paneId === node.id ? drag.destination : null;
		return (
			<section
				key={node.id}
				className="dynamic-panes__pane"
				data-dynamic-pane={node.id}
				data-active={active === node.id}
				aria-label={`Pane ${panes(tree).findIndex((pane) => pane.id === node.id) + 1}`}
			>
				<div
					className="dynamic-panes__content"
					onPointerDownCapture={() => setActive(node.id)}
				>
					<WorkspaceInteractionProvider
						interaction={{
							...PASSIVE_WORKSPACE_INTERACTION,
							presentCards: (candidates) => {
								setLayers({
									[node.id]: candidates.map((candidate) => ({
										id: freshId(),
										subject: workspaceSubjectFor(
											candidate.target,
										),
									})),
								});
								setActive(node.id);
								setMessage(
									"Cards opened. Lift one to an edge to create a Pane, or inside a Pane to place a Sheet.",
								);
							},
						}}
					>
						{top ? (
							<div
								className="dynamic-panes__sheet"
								data-lifting={
									drag?.kind === "Sheet" &&
									drag.sheet.id === top.id
								}
							>
								{renderFixtureSubject(top.subject, "Sheet")}
							</div>
						) : (
							<div className="dynamic-panes__empty">
								<p>No Sheets</p>
								<button
									type="button"
									onClick={() =>
										setTree(
											replacePane(
												tree,
												node.id,
												(pane) => ({
													...pane,
													sheets: [
														{
															id: freshId(),
															subject:
																FIXTURE_TEXT_SUBJECT,
														},
													],
												}),
											),
										)
									}
								>
									Open source text
								</button>
							</div>
						)}
					</WorkspaceInteractionProvider>
				</div>
				{top ? (
					<>
						{handle(node, top, "Sheet", "top")}
						{handle(node, top, "Sheet", "bottom")}
					</>
				) : null}
				<div className="dynamic-panes__pane-actions">
					<span>
						{node.sheets.length} Sheet
						{node.sheets.length === 1 ? "" : "s"}
					</span>
					{top ? (
						<button
							type="button"
							onClick={() => removeTop(node)}
							aria-label="Remove top Sheet"
						>
							×
						</button>
					) : null}
				</div>
				{cards.length ? (
					<div className="dynamic-panes__cards">
						<button
							className="dynamic-panes__close-cards"
							type="button"
							onClick={() => setLayers({})}
						>
							Close Cards
						</button>
						{cards.map((card, index) => (
							<article
								key={card.id}
								className="dynamic-panes__card"
								style={{
									top: index * 28,
									zIndex: cards.length - index,
									height: `calc(100% - ${(cards.length - 1) * 28}px)`,
								}}
							>
								<div
									className="dynamic-panes__card-content"
									inert
								>
									{renderFixtureSubject(card.subject, "Card")}
								</div>
								{index === 0
									? handle(node, card, "Card", "top")
									: null}
								<button
									type="button"
									className="dynamic-panes__card-tail"
									aria-label={`Lift ${subjectLabel(card.subject)} Card`}
									onPointerDown={(event) =>
										begin(
											event,
											node.id,
											card,
											"Card",
											"bottom",
										)
									}
									onPointerMove={move}
									onPointerUp={finish}
									onPointerCancel={() => updateDrag(null)}
									onLostPointerCapture={() =>
										updateDrag(null)
									}
								>
									{subjectLabel(card.subject)}
								</button>
							</article>
						))}
					</div>
				) : null}
				{destination ? (
					<div
						className="dynamic-panes__drop"
						data-edge={destination.edge}
					>
						<span>
							{destination.edge === "inside"
								? "Place Sheet here"
								: `Split ${destination.edge}`}
						</span>
					</div>
				) : null}
			</section>
		);
	}
	return (
		<div className="dynamic-panes-prototype">
			<header className="dynamic-panes__toolbar">
				<div>
					<strong>Dynamic Panes · prototype</strong>
					<p>
						Can Cards create nested splits without tabs? Select a
						word, then lift a Card to an edge.
					</p>
				</div>
				<button
					type="button"
					onClick={() => setShowState((value) => !value)}
				>
					{showState ? "Hide" : "Show"} state
				</button>
			</header>
			<div ref={root} className="dynamic-panes__workspace">
				{renderTree(tree)}
			</div>
			<footer className="dynamic-panes__status" role="status">
				{message}
			</footer>
			{showState ? (
				<pre className="dynamic-panes__state">
					{JSON.stringify(
						{ tree, active, layers, sizes, drag },
						null,
						2,
					)}
				</pre>
			) : null}
			{drag
				? createPortal(
						<div
							className="dynamic-panes__drag"
							data-edge={drag.edge}
							style={{ left: drag.x, top: drag.y }}
							inert
						>
							<WorkspaceInteractionProvider
								interaction={PASSIVE_WORKSPACE_INTERACTION}
							>
								{renderFixtureSubject(
									drag.sheet.subject,
									"Card",
								)}
							</WorkspaceInteractionProvider>
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}
