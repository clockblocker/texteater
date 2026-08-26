import { pointerIntersection } from "@dnd-kit/collision";
import {
	DragDropProvider,
	DragOverlay,
	useDraggable,
	useDroppable,
} from "@dnd-kit/react";
import {
	GripHorizontalIcon,
	LockIcon,
	LockOpenIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import {
	createContext,
	Fragment,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	useState,
} from "react";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import {
	type CardCandidate,
	type CardLayer,
	dismissCardLayer,
	reconcileCardLayers,
	removeLayerCard,
	replaceCardLayer,
} from "./card-layers";
import {
	type Pane,
	type PaneId,
	type Sheet,
	type SheetWorkspace,
	type SheetWorkspaceCommand,
	transitionSheetWorkspace,
	type WorkspacePresentation,
	type WorkspaceSubject,
} from "./sheet-workspace";
import "./card-sheet-workspace.css";

const DEFAULT_NAVIGATION_ANCHOR = <DefaultNavigationAnchor />;
const MINIMUM_DRAG_DISTANCE = 4;
const NESTED_DROP_ZONE_COLLISION_PRIORITY = 4;

export type CardSheetWorkspaceProps = {
	readonly initialWorkspace: SheetWorkspace;
	readonly renderSubject: (
		subject: WorkspaceSubject,
		presentation: WorkspacePresentation,
	) => ReactNode;
	readonly renderCardTail: (subject: WorkspaceSubject) => ReactNode;
	readonly navigationAnchor?: ReactNode;
};

type SubjectInteraction = {
	readonly requestCardLayer: (cards: readonly CardCandidate[]) => void;
};

const SubjectInteractionContext = createContext<SubjectInteraction | null>(
	null,
);

/** Available to subject presentation code without exposing Pane geometry. */
export function useCardLayerRequest(): SubjectInteraction["requestCardLayer"] {
	const interaction = useContext(SubjectInteractionContext);
	if (!interaction) {
		throw new Error(
			"useCardLayerRequest must be used inside a CardSheetWorkspace subject.",
		);
	}
	return interaction.requestCardLayer;
}

type WorkspaceState = {
	readonly workspace: SheetWorkspace;
	readonly cardLayers: readonly CardLayer[];
	readonly nextSheetSequence: number;
	readonly announcement: string;
};

type WorkspaceAction =
	| { readonly type: "Command"; readonly command: SheetWorkspaceCommand }
	| {
			readonly type: "OpenCardLayer";
			readonly paneId: PaneId;
			readonly originSheetId: string;
			readonly cards: readonly CardCandidate[];
	  }
	| { readonly type: "DismissCardLayer"; readonly paneId: PaneId }
	| { readonly type: "DismissAllCardLayers" }
	| {
			readonly type: "PlaceCard";
			readonly sourcePaneId: PaneId;
			readonly destinationPaneId: PaneId;
			readonly cardId: string;
	  }
	| {
			readonly type: "ReturnCard";
			readonly paneId: PaneId;
			readonly cardId: string;
	  };

type SheetDragData = {
	readonly kind: "Sheet";
	readonly sourcePaneId: PaneId;
	readonly sheet: Sheet;
};

type LayerCardDragData = {
	readonly kind: "LayerCard";
	readonly sourcePaneId: PaneId;
	readonly cardId: string;
	readonly subject: WorkspaceSubject;
};

type WorkspaceDragData = SheetDragData | LayerCardDragData;

type PaneDropData = {
	readonly kind: "Pane";
	readonly paneId: PaneId;
};

type CardLayerDropData = {
	readonly kind: "CardLayer";
	readonly paneId: PaneId;
};

type SheetRemovalDropData = {
	readonly kind: "SheetRemoval";
	readonly paneId: PaneId;
};

type WorkspaceDropData =
	| PaneDropData
	| CardLayerDropData
	| SheetRemovalDropData;

export function CardSheetWorkspace({
	initialWorkspace,
	renderSubject,
	renderCardTail,
	navigationAnchor = DEFAULT_NAVIGATION_ANCHOR,
}: CardSheetWorkspaceProps) {
	const [state, dispatch] = useReducer(workspaceReducer, {
		workspace: initialWorkspace,
		cardLayers: [],
		nextSheetSequence: 1,
		announcement: "Card and Sheet workspace ready.",
	});
	const [activeDrag, setActiveDrag] = useState<WorkspaceDragData | null>(
		null,
	);

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || activeDrag) return;
			if (state.cardLayers.length === 0) return;
			event.preventDefault();
			dispatch({ type: "DismissAllCardLayers" });
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [activeDrag, state.cardLayers.length]);

	const focusSheet = useCallback((sheetId: string) => {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				document
					.querySelector<HTMLElement>(
						`[data-sheet-id="${CSS.escape(sheetId)}"] [data-sheet-handle="top"]`,
					)
					?.focus();
			});
		});
	}, []);

	return (
		<DragDropProvider
			onDragStart={({ operation }) => {
				setActiveDrag(
					(operation.source?.data as WorkspaceDragData | undefined) ??
						null,
				);
			}}
			onDragEnd={({ operation, canceled }) => {
				const source = operation.source?.data as
					| WorkspaceDragData
					| undefined;
				const target = operation.target?.data as
					| WorkspaceDropData
					| undefined;
				setActiveDrag(null);
				const moved = Math.hypot(
					operation.transform.x,
					operation.transform.y,
				);
				if (
					canceled ||
					moved < MINIMUM_DRAG_DISTANCE ||
					!source ||
					!target
				)
					return;
				if (
					source.kind === "LayerCard" &&
					target.kind === "CardLayer" &&
					target.paneId === source.sourcePaneId
				) {
					dispatch({
						type: "ReturnCard",
						paneId: source.sourcePaneId,
						cardId: source.cardId,
					});
					return;
				}
				if (source.kind === "Sheet" && target.kind === "SheetRemoval") {
					dispatch({
						type: "Command",
						command: {
							type: "RemoveSheet",
							sheetId: source.sheet.instanceId,
						},
					});
					return;
				}
				if (target.kind !== "Pane") return;
				if (source.kind === "LayerCard") {
					dispatch({
						type: "PlaceCard",
						sourcePaneId: source.sourcePaneId,
						destinationPaneId: target.paneId,
						cardId: source.cardId,
					});
					return;
				}
				dispatch({
					type: "Command",
					command: {
						type: "MoveTopSheet",
						sourcePaneId: source.sourcePaneId,
						destinationPaneId: target.paneId,
						sheetId: source.sheet.instanceId,
					},
				});
				focusSheet(source.sheet.instanceId);
			}}
		>
			<ResizablePanelGroup
				className="card-sheet-workspace"
				orientation="horizontal"
			>
				{state.workspace.panes.map((pane, index) => (
					<Fragment key={pane.id}>
						<ResizablePanel
							defaultSize={String(
								100 / state.workspace.panes.length,
							)}
							id={`card-sheet-workspace-panel-${pane.id}`}
							minSize={96}
						>
							<WorkspacePane
								activeDrag={activeDrag}
								cardLayer={state.cardLayers.find(
									(layer) => layer.paneId === pane.id,
								)}
								dispatch={dispatch}
								navigationAnchor={navigationAnchor}
								pane={pane}
								renderCardTail={renderCardTail}
								renderSubject={renderSubject}
								workspace={state.workspace}
							/>
						</ResizablePanel>
						{index < state.workspace.panes.length - 1 ? (
							<ResizableHandle
								aria-label={`Resize ${pane.id} Pane`}
								className="card-sheet-workspace__resize-handle"
								withHandle
							/>
						) : null}
					</Fragment>
				))}
			</ResizablePanelGroup>

			<DragOverlay
				className="card-sheet-workspace__drag-overlay"
				dropAnimation={{
					duration: 220,
					easing: "cubic-bezier(.2,.8,.2,1)",
				}}
			>
				{(source) => {
					const data =
						(source?.data as WorkspaceDragData | undefined) ??
						activeDrag;
					const subject =
						data?.kind === "Sheet"
							? data.sheet.subject
							: data?.subject;
					return subject ? (
						<SubjectCard
							subject={subject}
							renderSubject={renderSubject}
						/>
					) : null;
				}}
			</DragOverlay>

			<div className="sr-only" aria-live="polite">
				{state.announcement}
			</div>
		</DragDropProvider>
	);
}

function WorkspacePane({
	workspace,
	pane,
	cardLayer,
	activeDrag,
	dispatch,
	renderSubject,
	renderCardTail,
	navigationAnchor,
}: {
	readonly workspace: SheetWorkspace;
	readonly pane: Pane;
	readonly cardLayer: CardLayer | undefined;
	readonly activeDrag: WorkspaceDragData | null;
	readonly dispatch: React.Dispatch<WorkspaceAction>;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
	readonly renderCardTail: CardSheetWorkspaceProps["renderCardTail"];
	readonly navigationAnchor: ReactNode;
}) {
	const { ref, isDropTarget } = useDroppable<PaneDropData>({
		id: `workspace-pane-${pane.id}`,
		data: { kind: "Pane", paneId: pane.id },
	});
	const topSheet = pane.sheets.at(-1);
	const dismissOnUnoccupiedClick = (
		event: ReactPointerEvent<HTMLElement>,
	) => {
		if (!cardLayer) return;
		const target = event.target;
		if (
			!(target instanceof Element) ||
			target.closest(
				"button, a, input, textarea, select, [data-card-layer]",
			)
		)
			return;
		dispatch({ type: "DismissCardLayer", paneId: pane.id });
	};
	return (
		<section
			aria-label={`${pane.id} Pane`}
			className="card-sheet-workspace__pane"
			data-accepts-drop={activeDrag ? "true" : undefined}
			data-active={
				workspace.activePaneId === pane.id ? "true" : undefined
			}
			data-drop-target={isDropTarget ? "true" : undefined}
			data-workspace-pane={pane.id}
			onPointerUp={dismissOnUnoccupiedClick}
			onFocusCapture={() =>
				dispatch({
					type: "Command",
					command: {
						type: "ActivatePane",
						paneId: pane.id,
						cause: "focus",
					},
				})
			}
			onPointerDown={() =>
				dispatch({
					type: "Command",
					command: {
						type: "ActivatePane",
						paneId: pane.id,
						cause: "pointer",
					},
				})
			}
			ref={ref}
		>
			<div className="card-sheet-workspace__stack">
				{pane.sheets.length === 0 ? (
					pane.id === workspace.centralPaneId ? (
						navigationAnchor
					) : (
						<div className="card-sheet-workspace__empty-base">
							Drop a Card or Sheet
						</div>
					)
				) : (
					pane.sheets.map((sheet, index) => (
						<WorkspaceSheet
							dispatch={dispatch}
							isTop={sheet.instanceId === topSheet?.instanceId}
							key={sheet.instanceId}
							pane={pane}
							renderSubject={renderSubject}
							sheet={sheet}
							stackIndex={index}
						/>
					))
				)}
			</div>
			{cardLayer ? (
				<CardLayerView
					layer={cardLayer}
					dispatch={dispatch}
					renderCardTail={renderCardTail}
					renderSubject={renderSubject}
				/>
			) : null}
			{activeDrag?.kind === "Sheet" ? (
				<SheetRemovalDropZone paneId={pane.id} />
			) : null}
		</section>
	);
}

function SheetRemovalDropZone({ paneId }: { readonly paneId: PaneId }) {
	const { ref, isDropTarget } = useDroppable<SheetRemovalDropData>({
		id: `sheet-removal:${paneId}`,
		data: { kind: "SheetRemoval", paneId },
		accept: (source) => {
			const data = source.data as WorkspaceDragData | undefined;
			return data?.kind === "Sheet";
		},
		collisionDetector: pointerIntersection,
		collisionPriority: NESTED_DROP_ZONE_COLLISION_PRIORITY,
	});
	return (
		<section
			aria-label={`Remove Sheet in ${paneId} Pane`}
			className="card-sheet-workspace__sheet-removal-zone"
			data-drop-target={isDropTarget ? "true" : undefined}
			data-sheet-removal-zone={paneId}
			ref={ref}
		>
			<Trash2Icon aria-hidden="true" />
			<span>{isDropTarget ? "Release to remove" : "Remove Sheet"}</span>
		</section>
	);
}

function WorkspaceSheet({
	pane,
	sheet,
	isTop,
	stackIndex,
	dispatch,
	renderSubject,
}: {
	readonly pane: Pane;
	readonly sheet: Sheet;
	readonly isTop: boolean;
	readonly stackIndex: number;
	readonly dispatch: React.Dispatch<WorkspaceAction>;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
}) {
	const sheetElement = useRef<HTMLElement>(null);
	const topDrag = useDraggable<SheetDragData>({
		id: `sheet:${sheet.instanceId}:top`,
		data: { kind: "Sheet", sourcePaneId: pane.id, sheet },
		disabled: !isTop,
		element: sheetElement,
	});
	const bottomDrag = useDraggable<SheetDragData>({
		id: `sheet:${sheet.instanceId}:bottom`,
		data: { kind: "Sheet", sourcePaneId: pane.id, sheet },
		disabled: !isTop,
		element: sheetElement,
	});
	const isDragging = topDrag.isDragging || bottomDrag.isDragging;
	const isDropping = topDrag.isDropping || bottomDrag.isDropping;
	const interaction = useMemo<SubjectInteraction>(
		() => ({
			requestCardLayer: (cards) => {
				if (!isTop) return;
				dispatch({
					type: "OpenCardLayer",
					paneId: pane.id,
					originSheetId: sheet.instanceId,
					cards,
				});
			},
		}),
		[dispatch, isTop, pane.id, sheet.instanceId],
	);
	return (
		<article
			aria-hidden={!isTop}
			className={cn(
				"card-sheet-workspace__sheet",
				isDragging && "card-sheet-workspace__sheet--dragging",
				isDropping && "card-sheet-workspace__sheet--dropping",
			)}
			data-dragging={isDragging ? "true" : undefined}
			data-sheet-id={sheet.instanceId}
			data-sheet-stack-index={stackIndex}
			data-sheet-top={isTop ? "true" : undefined}
			inert={!isTop}
			ref={sheetElement}
		>
			<SubjectInteractionContext.Provider value={interaction}>
				<div
					className="card-sheet-workspace__subject"
					data-subject-id={subjectIdentity(sheet.subject)}
					data-subject-kind={sheet.subject.kind}
					data-workspace-subject=""
				>
					{renderSubject(sheet.subject, "Sheet")}
				</div>
			</SubjectInteractionContext.Provider>
			{isTop ? (
				<>
					<div className="card-sheet-workspace__sheet-handles">
						<SheetHandle edge="top" dragRef={topDrag.handleRef} />
						<SheetHandle
							edge="bottom"
							dragRef={bottomDrag.handleRef}
						/>
					</div>
					<div className="card-sheet-workspace__sheet-actions">
						<button
							aria-label={`${sheet.locked ? "Unlock" : "Lock"} Sheet`}
							aria-pressed={sheet.locked}
							onClick={() =>
								dispatch({
									type: "Command",
									command: {
										type: "SetSheetLock",
										sheetId: sheet.instanceId,
										locked: !sheet.locked,
									},
								})
							}
							type="button"
						>
							{sheet.locked ? <LockIcon /> : <LockOpenIcon />}
						</button>
						<button
							aria-label="Collapse top Sheet"
							disabled={sheet.locked}
							onClick={() =>
								dispatch({
									type: "Command",
									command: {
										type: "Collapse",
										paneId: pane.id,
										extent: "top",
									},
								})
							}
							type="button"
						>
							Collapse
						</button>
						<button
							aria-label="Remove Sheet"
							onClick={() =>
								dispatch({
									type: "Command",
									command: {
										type: "RemoveSheet",
										sheetId: sheet.instanceId,
									},
								})
							}
							type="button"
						>
							<XIcon />
						</button>
					</div>
				</>
			) : null}
		</article>
	);
}

function SheetHandle({
	edge,
	dragRef,
}: {
	readonly edge: "top" | "bottom";
	readonly dragRef: (element: Element | null) => void;
}) {
	return (
		<button
			aria-label={`Move top Sheet from ${edge} handle`}
			className="card-sheet-workspace__sheet-handle"
			data-sheet-handle={edge}
			ref={dragRef}
			type="button"
		>
			<GripHorizontalIcon />
		</button>
	);
}

function CardLayerView({
	layer,
	dispatch,
	renderSubject,
	renderCardTail,
}: {
	readonly layer: CardLayer;
	readonly dispatch: React.Dispatch<WorkspaceAction>;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
	readonly renderCardTail: CardSheetWorkspaceProps["renderCardTail"];
}) {
	const { ref, isDropTarget } = useDroppable<CardLayerDropData>({
		id: `card-layer:${layer.paneId}`,
		data: { kind: "CardLayer", paneId: layer.paneId },
		accept: (source) => {
			const data = source.data as WorkspaceDragData | undefined;
			return (
				data?.kind === "LayerCard" && data.sourcePaneId === layer.paneId
			);
		},
		// The Card Layer sits inside a Pane, so it must win their overlapping
		// pointer collision when a Card is returned to its deck.
		collisionDetector: pointerIntersection,
		collisionPriority: NESTED_DROP_ZONE_COLLISION_PRIORITY,
	});
	return (
		<section
			aria-label={`Card Layer in ${layer.paneId} Pane`}
			className="card-sheet-workspace__card-layer"
			data-card-layer={layer.paneId}
			data-drop-target={isDropTarget ? "true" : undefined}
			ref={ref}
		>
			<button
				aria-label={`Close Card Layer in ${layer.paneId} Pane`}
				className="card-sheet-workspace__card-layer-close"
				onClick={() =>
					dispatch({
						type: "DismissCardLayer",
						paneId: layer.paneId,
					})
				}
				type="button"
			>
				<XIcon />
			</button>
			<div className="card-sheet-workspace__cards">
				{layer.cards.map((card, index) => (
					<LayerCardView
						card={card}
						index={index}
						key={card.id}
						layer={layer}
						renderCardTail={renderCardTail}
						renderSubject={renderSubject}
					/>
				))}
			</div>
		</section>
	);
}

function LayerCardView({
	layer,
	card,
	index,
	renderSubject,
	renderCardTail,
}: {
	readonly layer: CardLayer;
	readonly card: CardLayer["cards"][number];
	readonly index: number;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
	readonly renderCardTail: CardSheetWorkspaceProps["renderCardTail"];
}) {
	const foremost = index === 0;
	const drag = useDraggable<LayerCardDragData>({
		id: `card:${card.id}`,
		data: {
			kind: "LayerCard",
			sourcePaneId: layer.paneId,
			cardId: card.id,
			subject: card.subject,
		},
	});
	return (
		<article
			aria-label={`${subjectLabel(card.subject)} Card`}
			className={cn(
				"card-sheet-workspace__card",
				drag.isDragging && "card-sheet-workspace__card--dragging",
			)}
			data-card-id={card.id}
			data-card-order={index}
			data-card-foremost={foremost ? "true" : undefined}
			ref={drag.ref}
			style={
				{
					"--card-layer-index": index,
					"--card-layer-count": layer.cards.length,
				} as React.CSSProperties
			}
		>
			<div className="card-sheet-workspace__card-content">
				<SubjectCard
					renderSubject={renderSubject}
					subject={card.subject}
				/>
			</div>
			{foremost ? null : (
				<button
					aria-label={`Move ${subjectLabel(card.subject)} Card from its Tail`}
					className="card-sheet-workspace__card-tail"
					data-card-tail={card.id}
					ref={drag.handleRef}
					type="button"
				>
					{renderCardTail(card.subject)}
				</button>
			)}
		</article>
	);
}

function SubjectCard({
	subject,
	renderSubject,
}: {
	readonly subject: WorkspaceSubject;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
}) {
	const interaction = useMemo<SubjectInteraction>(
		() => ({ requestCardLayer: () => {} }),
		[],
	);
	return (
		<SubjectInteractionContext.Provider value={interaction}>
			<div
				data-subject-id={subjectIdentity(subject)}
				data-subject-kind={subject.kind}
				data-subject-presentation="Card"
				inert
			>
				{renderSubject(subject, "Card")}
			</div>
		</SubjectInteractionContext.Provider>
	);
}

function workspaceReducer(
	state: WorkspaceState,
	action: WorkspaceAction,
): WorkspaceState {
	switch (action.type) {
		case "OpenCardLayer":
			return {
				...state,
				cardLayers: replaceCardLayer(state.cardLayers, action),
				announcement: `Opened ${action.cards.length} Cards in ${action.paneId} Pane.`,
			};
		case "DismissCardLayer":
			return {
				...state,
				cardLayers: dismissCardLayer(state.cardLayers, action.paneId),
				announcement: `Dismissed Cards in ${action.paneId} Pane.`,
			};
		case "DismissAllCardLayers":
			return {
				...state,
				cardLayers: [],
				announcement: "Dismissed all Card Layers.",
			};
		case "PlaceCard": {
			const layer = state.cardLayers.find(
				(candidate) => candidate.paneId === action.sourcePaneId,
			);
			const card = layer?.cards.find(
				(candidate) => candidate.id === action.cardId,
			);
			if (!card) return state;
			const sheetId = `sheet-${state.nextSheetSequence}-${card.key}`;
			const command: SheetWorkspaceCommand = {
				type: "OpenSheet",
				sheet: { instanceId: sheetId, subject: card.subject },
				origin: { kind: "Placement", paneId: action.destinationPaneId },
			};
			const transition = transitionSheetWorkspace(
				state.workspace,
				command,
			);
			if (transition.status !== "committed") return state;
			const remaining = removeLayerCard(
				state.cardLayers,
				action.sourcePaneId,
				action.cardId,
			);
			return {
				workspace: transition.workspace,
				cardLayers: reconcileCardLayers(
					remaining,
					transition.workspace,
				),
				nextSheetSequence: state.nextSheetSequence + 1,
				announcement: `Placed ${subjectLabel(card.subject)} Card in ${action.destinationPaneId} Pane as a Sheet.`,
			};
		}
		case "ReturnCard": {
			const card = state.cardLayers
				.find((layer) => layer.paneId === action.paneId)
				?.cards.find((candidate) => candidate.id === action.cardId);
			if (!card) return state;
			return {
				...state,
				announcement: `Returned ${subjectLabel(card.subject)} Card to its Card Layer.`,
			};
		}
		case "Command": {
			const transition = transitionSheetWorkspace(
				state.workspace,
				action.command,
			);
			if (transition.status === "unchanged") return state;
			if (transition.status === "rejected") {
				return {
					...state,
					announcement: `Workspace command rejected: ${transition.rejection}.`,
				};
			}
			return {
				...state,
				workspace: transition.workspace,
				cardLayers: reconcileCardLayers(
					state.cardLayers,
					transition.workspace,
				),
				announcement: announcementFor(action.command),
			};
		}
	}
}

function announcementFor(command: SheetWorkspaceCommand): string {
	switch (command.type) {
		case "ActivatePane":
			return `${command.paneId} Pane is Active.`;
		case "OpenSheet":
			return `Opened Sheet ${command.sheet.instanceId}.`;
		case "MoveTopSheet":
			return `Moved Sheet ${command.sheetId} to ${command.destinationPaneId} Pane.`;
		case "Collapse":
			return `Collapsed ${command.extent} in ${command.paneId} Pane.`;
		case "RemoveSheet":
			return `Removed Sheet ${command.sheetId}.`;
		case "SetSheetLock":
			return `${command.locked ? "Locked" : "Unlocked"} Sheet ${command.sheetId}.`;
	}
}

function subjectLabel(subject: WorkspaceSubject): string {
	return subject.kind === "Text" ? "Text" : "Note";
}

function subjectIdentity(subject: WorkspaceSubject): string {
	return subject.kind === "Text" ? subject.textId : subject.noteId;
}

function DefaultNavigationAnchor() {
	return (
		<div className="card-sheet-workspace__navigation-anchor">
			<strong>Library</strong>
			<span>Navigation Anchor</span>
		</div>
	);
}
