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
	XIcon,
} from "lucide-react";
import {
	Fragment,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useMemo,
	useRef,
	useState,
} from "react";

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import { cardLayerTopBelowAnchor } from "./card-layer-placement";
import { type CardLayer, deckSizeFor } from "./card-layers";
import {
	type Pane,
	type PaneId,
	type Sheet,
	type SheetWorkspace,
	type WorkspacePresentation,
	type WorkspaceSubject,
	workspaceSubjectFor,
	workspaceSubjectKey,
} from "./sheet-workspace";
import {
	cardCandidatesFor,
	PASSIVE_WORKSPACE_INTERACTION,
	useWorkspaceRuntime,
	type WorkspaceInteraction,
	WorkspaceInteractionProvider,
} from "./workspace-controller";
import {
	acceptsCardLayerReturn,
	acceptsSheetRemoval,
	createWorkspaceSheetId,
	type PaneDragProjection,
	type SheetPlacementPreview,
	useWorkspacePresentationInteraction,
	type WorkspaceDragSource,
	type WorkspaceDragTarget,
	type WorkspaceSessionAction,
} from "./workspace-presentation-interaction";
import "./card-sheet-workspace.css";

const DEFAULT_NAVIGATION_ANCHOR = <DefaultNavigationAnchor />;
const NESTED_DROP_ZONE_COLLISION_PRIORITY = 4;

/**
 * Subject renderers for the content-independent workspace shell. Presentation
 * is limited to `Card | Sheet`; workspace dimensions and linguistic layout do
 * not cross this boundary.
 */
export type CardSheetWorkspaceProps = {
	readonly renderSubject: (
		subject: WorkspaceSubject,
		presentation: WorkspacePresentation,
	) => ReactNode;
	readonly renderCardTail: (subject: WorkspaceSubject) => ReactNode;
	readonly navigationAnchor?: ReactNode;
};

export function CardSheetWorkspace({
	renderSubject,
	renderCardTail,
	navigationAnchor = DEFAULT_NAVIGATION_ANCHOR,
}: CardSheetWorkspaceProps) {
	const { session: state, dispatch } = useWorkspaceRuntime();
	const interaction = useWorkspacePresentationInteraction(state, dispatch);

	return (
		<DragDropProvider {...interaction.dragEvents}>
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
							<WorkspacePaneDropTarget
								cardLayer={state.cardLayers.find(
									(layer) => layer.paneId === pane.id,
								)}
								dragProjection={paneProjection(
									interaction.projection.panes,
									pane.id,
								)}
								dispatch={dispatch}
								navigationAnchor={navigationAnchor}
								pane={pane}
								renderCardTail={renderCardTail}
								renderSubject={renderSubject}
								settlingSheetId={interaction.settlingSheetId}
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
				dropAnimation={interaction.dropAnimation}
			>
				{(source) => {
					const overlay = interaction.overlayFor(source?.data);
					return overlay ? (
						<SubjectCard
							className={cn(
								overlay.geometry.kind === "SheetMove" &&
									"card-sheet-workspace__sheet-move-card",
							)}
							sheetDragEdge={
								overlay.geometry.kind === "SheetMove"
									? overlay.geometry.edge
									: undefined
							}
							subject={overlay.subject}
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

type WorkspacePaneProps = {
	readonly workspace: SheetWorkspace;
	readonly pane: Pane;
	readonly cardLayer: CardLayer | undefined;
	readonly dragProjection: PaneDragProjection;
	readonly dispatch: React.Dispatch<WorkspaceSessionAction>;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
	readonly renderCardTail: CardSheetWorkspaceProps["renderCardTail"];
	readonly navigationAnchor: ReactNode;
	readonly settlingSheetId: string | null;
};

function WorkspacePaneDropTarget(props: WorkspacePaneProps) {
	const { ref } = useDroppable<WorkspaceDragTarget>({
		id: `workspace-pane-${props.pane.id}`,
		data: { kind: "Pane", paneId: props.pane.id },
	});
	return <WorkspacePane {...props} dropRef={ref} />;
}

function WorkspacePane({
	workspace,
	pane,
	cardLayer,
	dragProjection,
	dispatch,
	renderSubject,
	renderCardTail,
	navigationAnchor,
	settlingSheetId,
	dropRef,
}: WorkspacePaneProps & {
	readonly dropRef: (element: Element | null) => void;
}) {
	const paneElementRef = useRef<HTMLElement | null>(null);
	const [cardLayerTop, setCardLayerTop] = useState<number | null>(null);
	const anchorCardLayer = useCallback(
		(anchor: Element | null | undefined, cardCount: number) => {
			setCardLayerTop(
				cardLayerTopBelowAnchor(
					anchor,
					paneElementRef.current,
					deckSizeFor(cardCount),
				),
			);
		},
		[],
	);
	const topSheet = pane.sheets.at(-1);
	const revealedSheetId =
		dragProjection.sourceReveal?.kind === "Sheet"
			? dragProjection.sourceReveal.sheetId
			: undefined;
	const isBaseCovered =
		pane.sheets.length > 0 && dragProjection.sourceReveal?.kind !== "Base";
	const isPlacementCovered = dragProjection.sheetPlacementPreview !== null;
	const navigationInteraction = useMemo<WorkspaceInteraction>(
		() => ({
			...PASSIVE_WORKSPACE_INTERACTION,
			follow: (target) => {
				dispatch({
					type: "Command",
					command: {
						type: "OpenSheet",
						sheet: {
							instanceId: createWorkspaceSheetId(),
							subject: workspaceSubjectFor(target),
						},
						origin: { kind: "NavigationAnchor" },
					},
				});
			},
		}),
		[dispatch],
	);
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
			data-accepts-drop={
				dragProjection.acceptsSheetPlacement ? "true" : undefined
			}
			data-active={
				workspace.activePaneId === pane.id ? "true" : undefined
			}
			data-drop-target={
				dragProjection.isPaneDropTarget ? "true" : undefined
			}
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
			ref={(element) => {
				paneElementRef.current = element;
				dropRef(element);
			}}
		>
			<div className="card-sheet-workspace__stack">
				<div
					aria-hidden={isBaseCovered}
					className="card-sheet-workspace__stack-base"
					data-covered={isBaseCovered ? "true" : undefined}
					inert={isBaseCovered}
				>
					{pane.id === workspace.centralPaneId ? (
						<WorkspaceInteractionProvider
							interaction={navigationInteraction}
						>
							{navigationAnchor}
						</WorkspaceInteractionProvider>
					) : (
						<div className="card-sheet-workspace__empty-base">
							Drop a Card or Sheet
						</div>
					)}
				</div>
				{pane.sheets.map((sheet, index) => (
					<WorkspaceSheet
						anchorCardLayer={anchorCardLayer}
						dispatch={dispatch}
						isPlacementCovered={isPlacementCovered}
						isSettling={sheet.instanceId === settlingSheetId}
						isTop={sheet.instanceId === topSheet?.instanceId}
						isRevealed={sheet.instanceId === revealedSheetId}
						key={sheet.instanceId}
						pane={pane}
						renderSubject={renderSubject}
						sheet={sheet}
						stackIndex={index}
					/>
				))}
				{dragProjection.sheetPlacementPreview ? (
					<SheetPlacementPreviewView
						preview={dragProjection.sheetPlacementPreview}
						renderSubject={renderSubject}
					/>
				) : null}
			</div>
			{cardLayer ? (
				<CardLayerView
					isDropTarget={dragProjection.isCardLayerDropTarget}
					layer={cardLayer}
					dispatch={dispatch}
					renderCardTail={renderCardTail}
					renderSubject={renderSubject}
					top={cardLayerTop}
				/>
			) : null}
			{dragProjection.sheetRemoval.visible ? (
				<SheetRemovalDropZone
					isDropTarget={dragProjection.sheetRemoval.isDropTarget}
					paneId={pane.id}
				/>
			) : null}
		</section>
	);
}

function SheetRemovalDropZone({
	paneId,
	isDropTarget,
}: {
	readonly paneId: PaneId;
	readonly isDropTarget: boolean;
}) {
	const { ref } = useDroppable<WorkspaceDragTarget>({
		id: `sheet-removal:${paneId}`,
		data: { kind: "SheetRemoval", paneId },
		accept: (source) => acceptsSheetRemoval(source.data),
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
		/>
	);
}

function WorkspaceSheet({
	pane,
	sheet,
	isTop,
	isRevealed,
	isPlacementCovered,
	isSettling,
	stackIndex,
	dispatch,
	renderSubject,
	anchorCardLayer,
}: {
	readonly pane: Pane;
	readonly sheet: Sheet;
	readonly isTop: boolean;
	readonly isRevealed: boolean;
	readonly isPlacementCovered: boolean;
	readonly isSettling: boolean;
	readonly stackIndex: number;
	readonly dispatch: React.Dispatch<WorkspaceSessionAction>;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
	readonly anchorCardLayer: (
		anchor: Element | null | undefined,
		cardCount: number,
	) => void;
}) {
	const sheetElement = useRef<HTMLElement>(null);
	const topDrag = useDraggable<WorkspaceDragSource>({
		id: `sheet:${sheet.instanceId}:top`,
		data: {
			kind: "Sheet",
			id: sheet.instanceId,
			paneId: pane.id,
			subject: sheet.subject,
			edge: "top",
		},
		disabled: !isTop,
		element: sheetElement,
	});
	const bottomDrag = useDraggable<WorkspaceDragSource>({
		id: `sheet:${sheet.instanceId}:bottom`,
		data: {
			kind: "Sheet",
			id: sheet.instanceId,
			paneId: pane.id,
			subject: sheet.subject,
			edge: "bottom",
		},
		disabled: !isTop,
		element: sheetElement,
	});
	const isDragging = topDrag.isDragging || bottomDrag.isDragging;
	const isDropping = topDrag.isDropping || bottomDrag.isDropping;
	const interaction = useMemo<WorkspaceInteraction>(
		() => ({
			follow: (target) => {
				if (!isTop) return;
				dispatch({
					type: "Command",
					command: {
						type: "OpenSheet",
						sheet: {
							instanceId: createWorkspaceSheetId(),
							subject: workspaceSubjectFor(target),
						},
						origin: { kind: "Sheet", sheetId: sheet.instanceId },
					},
				});
			},
			presentCards: (cards, options) => {
				if (!isTop) return;
				anchorCardLayer(options?.anchor, cards.length);
				dispatch({
					type: "OpenCardLayer",
					paneId: pane.id,
					originSheetId: sheet.instanceId,
					cards: cardCandidatesFor(cards),
				});
			},
			reconcile: (target) => {
				dispatch({
					type: "ReplaceSubject",
					location: { kind: "Sheet", sheetId: sheet.instanceId },
					subject: workspaceSubjectFor(target),
				});
			},
		}),
		[anchorCardLayer, dispatch, isTop, pane.id, sheet.instanceId],
	);
	return (
		<article
			aria-hidden={!isTop || isPlacementCovered}
			className={cn(
				"card-sheet-workspace__sheet",
				isDragging && "card-sheet-workspace__sheet--dragging",
				isDropping && "card-sheet-workspace__sheet--dropping",
			)}
			data-dragging={isDragging ? "true" : undefined}
			data-sheet-id={sheet.instanceId}
			data-sheet-placement-covered={
				isPlacementCovered ? "true" : undefined
			}
			data-sheet-settling={isSettling ? "true" : undefined}
			data-sheet-stack-index={stackIndex}
			data-sheet-top={isTop ? "true" : undefined}
			data-sheet-revealed={isRevealed ? "true" : undefined}
			inert={!isTop || isPlacementCovered}
			ref={sheetElement}
		>
			<WorkspaceInteractionProvider interaction={interaction}>
				<div
					className="card-sheet-workspace__subject"
					data-subject-id={subjectIdentity(sheet.subject)}
					data-subject-kind={sheet.subject.kind}
					data-workspace-subject=""
				>
					{renderSubject(sheet.subject, "Sheet")}
				</div>
			</WorkspaceInteractionProvider>
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

function SheetPlacementPreviewView({
	preview,
	renderSubject,
}: {
	readonly preview: SheetPlacementPreview;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
}) {
	return (
		<article
			aria-hidden
			className="card-sheet-workspace__sheet-drop-preview"
			data-sheet-drop-preview={preview.sourceId}
			inert
		>
			<WorkspaceInteractionProvider
				interaction={PASSIVE_WORKSPACE_INTERACTION}
			>
				<div
					className="card-sheet-workspace__subject"
					data-subject-id={subjectIdentity(preview.subject)}
					data-subject-kind={preview.subject.kind}
					data-subject-presentation="Sheet"
				>
					{renderSubject(preview.subject, "Sheet")}
				</div>
			</WorkspaceInteractionProvider>
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
	isDropTarget,
	dispatch,
	renderSubject,
	renderCardTail,
	top,
}: {
	readonly layer: CardLayer;
	readonly isDropTarget: boolean;
	readonly dispatch: React.Dispatch<WorkspaceSessionAction>;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
	readonly renderCardTail: CardSheetWorkspaceProps["renderCardTail"];
	readonly top: number | null;
}) {
	const { ref } = useDroppable<WorkspaceDragTarget>({
		id: `card-layer:${layer.paneId}`,
		data: { kind: "CardLayer", paneId: layer.paneId },
		accept: (source) => acceptsCardLayerReturn(source.data, layer.paneId),
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
			data-card-layer-anchored={top === null ? undefined : "true"}
			data-drop-target={isDropTarget ? "true" : undefined}
			style={
				{
					"--card-layer-top": top === null ? undefined : `${top}px`,
					"--deck-size": deckSizeFor(layer.cards.length),
				} as React.CSSProperties
			}
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
						dispatch={dispatch}
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
	dispatch,
	renderSubject,
	renderCardTail,
}: {
	readonly layer: CardLayer;
	readonly card: CardLayer["cards"][number];
	readonly index: number;
	readonly dispatch: React.Dispatch<WorkspaceSessionAction>;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
	readonly renderCardTail: CardSheetWorkspaceProps["renderCardTail"];
}) {
	const foremost = index === 0;
	const drag = useDraggable<WorkspaceDragSource>({
		id: `card:${card.id}`,
		data: {
			kind: "LayerCard",
			paneId: layer.paneId,
			id: card.id,
			subject: card.subject,
		},
	});
	const interaction = useMemo<WorkspaceInteraction>(
		() => ({
			...PASSIVE_WORKSPACE_INTERACTION,
			presentCards: (cards) => {
				dispatch({
					type: "OpenCardLayer",
					paneId: layer.paneId,
					originSheetId: layer.originSheetId,
					cards: cardCandidatesFor(cards),
				});
			},
			reconcile: (target) => {
				dispatch({
					type: "ReplaceSubject",
					location: {
						kind: "Card",
						paneId: layer.paneId,
						cardId: card.id,
					},
					subject: workspaceSubjectFor(target),
				});
			},
		}),
		[card.id, dispatch, layer.originSheetId, layer.paneId],
	);
	return (
		<article
			aria-label={`${subjectLabel(card.subject)} Card`}
			className={cn(
				"card-sheet-workspace__card",
				drag.isDragging && "card-sheet-workspace__card--dragging",
				drag.isDropping && "card-sheet-workspace__card--dropping",
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
					interaction={interaction}
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
	className,
	sheetDragEdge,
	interaction = PASSIVE_WORKSPACE_INTERACTION,
}: {
	readonly subject: WorkspaceSubject;
	readonly renderSubject: CardSheetWorkspaceProps["renderSubject"];
	readonly className?: string;
	readonly sheetDragEdge?: "top" | "bottom";
	readonly interaction?: WorkspaceInteraction;
}) {
	return (
		<WorkspaceInteractionProvider interaction={interaction}>
			<div
				className={className}
				data-subject-id={subjectIdentity(subject)}
				data-subject-kind={subject.kind}
				data-subject-presentation="Card"
				data-sheet-drag-edge={sheetDragEdge}
				inert
			>
				{renderSubject(subject, "Card")}
			</div>
		</WorkspaceInteractionProvider>
	);
}

function paneProjection(
	projections: readonly PaneDragProjection[],
	paneId: PaneId,
): PaneDragProjection {
	const projection = projections.find(
		(candidate) => candidate.paneId === paneId,
	);
	if (!projection) {
		throw new Error(`Missing drag projection for ${paneId} Pane.`);
	}
	return projection;
}

function subjectLabel(subject: WorkspaceSubject): string {
	return subject.kind === "Text" ? "Text" : "Note";
}

function subjectIdentity(subject: WorkspaceSubject): string {
	return workspaceSubjectKey(subject);
}

function DefaultNavigationAnchor() {
	return (
		<div className="card-sheet-workspace__navigation-anchor">
			<strong>Library</strong>
			<span>Navigation Anchor</span>
		</div>
	);
}
