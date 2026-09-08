"use client";

import {
	type CSSProperties,
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { Group, Panel, Separator } from "react-resizable-panels";
import {
	selectCardLayersForPane,
	selectLayout,
	selectLiftedPresentation,
	selectVisibleCards,
	selectVisibleSheets,
	type WorkspaceCardLayer,
	type WorkspaceCommand,
	type WorkspaceLayout,
	type WorkspacePresentation,
	type WorkspaceState,
} from "./model";

/** The narrowest useful canvas for a Sheet and its Card counterpart. */
const MINIMUM_SHEET_WIDTH = 416;

type Edge = "left" | "right" | "bottom";
type Destination = { paneId: string; edge: Edge | "inside" | "return" };
type PointerPosition = { x: number; y: number };
type PanePointer = {
	pointerId: number;
	paneId: string;
	start: PointerPosition;
	moved: boolean;
	scrolled: boolean;
};

const DISMISS_EXEMPT_SELECTOR = [
	"button",
	"a",
	"input",
	"textarea",
	"select",
	"option",
	"summary",
	"[contenteditable]",
	"[role=button]",
	"[role=link]",
	"[role=tab]",
	"[role=checkbox]",
	"[role=radio]",
	"[data-workspace-keep-layer]",
].join(", ");

export type WorkspaceRenderContext<S> = {
	presentationId: string;
	presentation: "Card" | "Sheet";
	subject: S;
	/**
	 * Marks the segment associated with the Card Layer without moving its content.
	 */
	selectAnchor(anchor: HTMLElement): void;
};

export type WorkspaceProps<S> = {
	state: WorkspaceState<S>;
	dispatch(command: WorkspaceCommand<S>): void;
	renderSubject(subject: S, context: WorkspaceRenderContext<S>): ReactNode;
	labelSubject(subject: S): string;
	className?: string;
};

function minimumWidth(node: WorkspaceLayout): number {
	if (node.kind === "Pane") return MINIMUM_SHEET_WIDTH;
	const [first, second] = node.children.map(minimumWidth);
	return node.axis === "horizontal"
		? first + second + 1
		: Math.max(first, second);
}

function destinationAt(
	root: HTMLDivElement | null,
	x: number,
	y: number,
): Destination | null {
	for (const layer of root?.querySelectorAll<HTMLElement>(
		"[data-return-zone]",
	) ?? []) {
		const rect = layer.getBoundingClientRect();
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)
			continue;
		const pane = layer.closest<HTMLElement>("[data-workspace-pane]");
		if (pane?.dataset.workspacePane)
			return { paneId: pane.dataset.workspacePane, edge: "return" };
	}
	for (const element of root?.querySelectorAll<HTMLElement>(
		"[data-workspace-pane]",
	) ?? []) {
		const rect = element.getBoundingClientRect();
		if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)
			continue;
		const distances = [
			{
				edge: "left" as const,
				value: (x - rect.left) / Math.min(80, rect.width * 0.23),
			},
			{
				edge: "right" as const,
				value: (rect.right - x) / Math.min(80, rect.width * 0.23),
			},
			{
				edge: "bottom" as const,
				value: (rect.bottom - y) / Math.min(80, rect.height * 0.23),
			},
		].sort((a, b) => a.value - b.value);
		const closest = distances[0];
		return {
			paneId: element.dataset.workspacePane ?? "",
			edge: closest && closest.value < 1 ? closest.edge : "inside",
		};
	}
	return null;
}

/**
 * Generic visual shell for the workspace algebra. It only knows Presentation
 * identity and form; callers own how a Subject reads as a Card or Sheet.
 * Covered Sheets remain mounted, but a Presentation changing between Card and
 * Sheet form remounts its content. Keep any content state outside the renderer,
 * keyed by `presentationId`, when it must survive that form change or a move.
 */
export function Workspace<S>({
	state,
	dispatch,
	renderSubject,
	labelSubject,
	className,
}: WorkspaceProps<S>) {
	const root = useRef<HTMLDivElement>(null);
	const [pointer, setPointer] = useState<PointerPosition | null>(null);
	const liftStartRef = useRef<PointerPosition | null>(null);
	const liftPointerIdRef = useRef<number | null>(null);
	const liftMovedRef = useRef(false);
	const lastHandleTapRef = useRef<{
		id: string;
		time: number;
		x: number;
		y: number;
	} | null>(null);
	const panePointerRef = useRef<PanePointer | null>(null);
	const dismissOnClickRef = useRef(false);
	const suppressNextClickRef = useRef(false);
	const suppressClickTimeoutRef = useRef<number | null>(null);
	const selectedRevealAnchorsRef = useRef(new Map<string, HTMLElement>());
	const [liftAnchor, setLiftAnchor] = useState<"top" | "bottom">("top");
	const [destination, setDestination] = useState<Destination | null>(null);
	const layout = selectLayout(state);
	const lifted = selectLiftedPresentation(state);

	function suppressPostGestureClick() {
		suppressNextClickRef.current = true;
		if (suppressClickTimeoutRef.current !== null)
			window.clearTimeout(suppressClickTimeoutRef.current);
		suppressClickTimeoutRef.current = window.setTimeout(() => {
			suppressNextClickRef.current = false;
			suppressClickTimeoutRef.current = null;
		}, 0);
	}

	function selectAnchor(presentationId: string, anchor: HTMLElement) {
		const previous = selectedRevealAnchorsRef.current.get(presentationId);
		if (previous && previous !== anchor)
			delete previous.dataset.workspaceSelected;
		anchor.dataset.workspaceSelected = "true";
		selectedRevealAnchorsRef.current.set(presentationId, anchor);
	}

	useEffect(() => {
		for (const [
			presentationId,
			anchor,
		] of selectedRevealAnchorsRef.current) {
			if (
				Object.values(state.layers).some(
					(layer) => layer.originPresentationId === presentationId,
				)
			)
				continue;
			delete anchor.dataset.workspaceSelected;
			selectedRevealAnchorsRef.current.delete(presentationId);
		}
	}, [state.layers]);

	useEffect(
		() => () => {
			if (suppressClickTimeoutRef.current !== null)
				window.clearTimeout(suppressClickTimeoutRef.current);
		},
		[],
	);

	function updatePointer(next: PointerPosition | null) {
		setPointer(next);
	}
	function updateDestination(next: Destination | null) {
		setDestination(next);
	}
	function cancelGesture() {
		if (lifted) dispatch({ type: "CancelGesture" });
		if (lifted) suppressPostGestureClick();
		updatePointer(null);
		updateDestination(null);
		liftStartRef.current = null;
		liftPointerIdRef.current = null;
	}

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			if (lifted) {
				cancelGesture();
				return;
			}
			const activeLayer = selectCardLayersForPane(
				state,
				state.activePaneId,
			).at(-1);
			if (activeLayer)
				dispatch({ type: "CloseLayer", layerId: activeLayer.id });
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, [dispatch, lifted, state]);

	function beginLift(
		event: ReactPointerEvent<HTMLButtonElement>,
		presentation: WorkspacePresentation<S>,
		anchor: "top" | "bottom",
	) {
		if (event.button !== 0) return;
		event.preventDefault();
		root.current?.setPointerCapture(event.pointerId);
		dispatch({ type: "Lift", presentationId: presentation.id });
		updatePointer({ x: event.clientX, y: event.clientY });
		liftStartRef.current = { x: event.clientX, y: event.clientY };
		liftPointerIdRef.current = event.pointerId;
		liftMovedRef.current = false;
		setLiftAnchor(anchor);
		updateDestination(null);
	}
	function moveLift(event: ReactPointerEvent<HTMLElement>) {
		if (liftPointerIdRef.current !== event.pointerId) return;
		if (
			liftStartRef.current &&
			Math.hypot(
				event.clientX - liftStartRef.current.x,
				event.clientY - liftStartRef.current.y,
			) > 4
		) {
			liftMovedRef.current = true;
			lastHandleTapRef.current = null;
		}
		updatePointer({ x: event.clientX, y: event.clientY });
		updateDestination(
			destinationAt(root.current, event.clientX, event.clientY),
		);
	}
	function finishLift(event: ReactPointerEvent<HTMLElement>) {
		if (liftPointerIdRef.current !== event.pointerId) return;
		if (!lifted || !liftStartRef.current) return;
		suppressPostGestureClick();
		const moved =
			liftMovedRef.current ||
			Math.hypot(
				event.clientX - liftStartRef.current.x,
				event.clientY - liftStartRef.current.y,
			) > 4;
		const target = destinationAt(
			root.current,
			event.clientX,
			event.clientY,
		);
		if (!moved) {
			// Lifting temporarily unmounts the handle, so recognize the pair of
			// stationary releases here instead of relying on DOM dblclick.
			const previous = lastHandleTapRef.current;
			const doubleTap =
				previous !== null &&
				previous.id === lifted.presentation.id &&
				event.timeStamp - previous.time < 500 &&
				Math.hypot(
					event.clientX - previous.x,
					event.clientY - previous.y,
				) < 8;
			lastHandleTapRef.current = !doubleTap
				? {
						id: lifted.presentation.id,
						time: event.timeStamp,
						x: event.clientX,
						y: event.clientY,
					}
				: null;
			if (!doubleTap) {
				cancelGesture();
				return;
			}
			dispatch(
				lifted.sourceForm === "Card"
					? { type: "Expand", paneId: state.activePaneId }
					: { type: "ReturnToLayer" },
			);
			updatePointer(null);
			updateDestination(null);
			liftStartRef.current = null;
			liftPointerIdRef.current = null;
			return;
		}
		lastHandleTapRef.current = null;
		if (!target) {
			cancelGesture();
			return;
		}
		if (target.edge === "return") {
			dispatch({ type: "ReturnToLayer" });
		} else {
			dispatch({
				type: "Expand",
				paneId: target.paneId,
				edge: target.edge,
			});
		}
		updatePointer(null);
		updateDestination(null);
		liftStartRef.current = null;
		liftPointerIdRef.current = null;
	}
	function beginPanePointer(
		event: ReactPointerEvent<HTMLElement>,
		paneId: string,
	) {
		dispatch({ type: "ActivatePane", paneId });
		if (event.button !== 0) return;
		panePointerRef.current = {
			pointerId: event.pointerId,
			paneId,
			start: { x: event.clientX, y: event.clientY },
			moved: false,
			scrolled: false,
		};
		dismissOnClickRef.current = false;
	}
	function trackPanePointer(event: ReactPointerEvent<HTMLElement>) {
		const pointer = panePointerRef.current;
		if (!pointer || pointer.pointerId !== event.pointerId) return;
		pointer.moved ||=
			Math.hypot(
				event.clientX - pointer.start.x,
				event.clientY - pointer.start.y,
			) > 4;
	}
	function finishPanePointer(event: ReactPointerEvent<HTMLElement>) {
		const pointer = panePointerRef.current;
		if (!pointer || pointer.pointerId !== event.pointerId) return;
		trackPanePointer(event);
		const selection = window.getSelection();
		dismissOnClickRef.current =
			!pointer.moved &&
			!pointer.scrolled &&
			selection?.isCollapsed !== false;
		panePointerRef.current = null;
		window.setTimeout(() => {
			dismissOnClickRef.current = false;
		}, 0);
	}
	function notePaneScroll() {
		if (panePointerRef.current) panePointerRef.current.scrolled = true;
	}
	function dismissLayerFromPane(
		event: ReactMouseEvent<HTMLElement>,
		cardLayers: WorkspaceCardLayer[],
	) {
		if (suppressNextClickRef.current) {
			suppressNextClickRef.current = false;
			return;
		}
		if (!dismissOnClickRef.current || !cardLayers.length) return;
		const target = event.target as HTMLElement;
		if (
			target.closest(".workspace__card") ||
			target.closest(DISMISS_EXEMPT_SELECTOR)
		)
			return;
		const layer = cardLayers.at(-1);
		if (layer) dispatch({ type: "CloseLayer", layerId: layer.id });
	}
	function liftHandlers(presentation: WorkspacePresentation<S>) {
		return {
			onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) =>
				beginLift(event, presentation, "bottom"),
		};
	}

	function renderLiftHandle(
		presentation: WorkspacePresentation<S>,
		edge: "top" | "bottom",
	) {
		return (
			<button
				type="button"
				className="workspace__lift"
				data-edge={edge}
				aria-label={`Lift ${labelSubject(presentation.subject)} ${presentation.form} from ${edge} edge`}
				onPointerDown={(event) => beginLift(event, presentation, edge)}
			>
				<span />
			</button>
		);
	}

	function toggleBody(
		event: ReactMouseEvent<HTMLElement>,
		presentation: WorkspacePresentation<S>,
		paneId: string,
	) {
		if (
			presentation.locked ||
			state.gesture ||
			!(event.target instanceof Element) ||
			event.target.closest(
				'a, button, input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="button"], [role="link"]',
			)
		)
			return;
		event.preventDefault();
		event.stopPropagation();
		window.getSelection()?.removeAllRanges();
		lastHandleTapRef.current = null;
		if (presentation.form === "Sheet") {
			dispatch({ type: "Collapse", presentationId: presentation.id });
		} else {
			dispatch({ type: "Lift", presentationId: presentation.id });
			dispatch({ type: "Expand", paneId });
		}
	}

	function renderPane(paneId: string) {
		const sheets = selectVisibleSheets(state, paneId);
		const top = sheets.at(-1);
		const cardLayers = selectCardLayersForPane(state, paneId);
		const isTarget = destination?.paneId === paneId ? destination : null;
		return (
			<section
				key={paneId}
				className="workspace__pane"
				data-workspace-pane={paneId}
				data-has-card-layer={cardLayers.length ? "true" : undefined}
				onPointerDownCapture={(event) =>
					beginPanePointer(event, paneId)
				}
				onPointerMoveCapture={trackPanePointer}
				onPointerUpCapture={finishPanePointer}
				onScrollCapture={notePaneScroll}
				onClickCapture={(event) =>
					dismissLayerFromPane(event, cardLayers)
				}
			>
				<div className="workspace__content">
					{sheets.map((sheet, index) => {
						const covered = index !== sheets.length - 1;
						return (
							// biome-ignore lint/a11y/noStaticElementInteractions: Optional surface shortcut; embedded controls retain their own semantics.
							<div
								key={sheet.id}
								className="workspace__sheet"
								onDoubleClick={(event) =>
									toggleBody(event, sheet, paneId)
								}
								data-presentation-id={sheet.id}
								data-presentation-form="Sheet"
								data-covered={covered ? "true" : undefined}
								data-sheet-underlay={
									sheets.length > 1 && !covered
										? "true"
										: undefined
								}
								data-has-card-layer={
									Object.values(state.layers).some(
										(layer) =>
											layer.originPresentationId ===
											sheet.id,
									)
										? "true"
										: undefined
								}
								inert={covered}
							>
								{renderSubject(sheet.subject, {
									presentationId: sheet.id,
									presentation: "Sheet",
									subject: sheet.subject,
									selectAnchor: (anchor) =>
										selectAnchor(sheet.id, anchor),
								})}
							</div>
						);
					})}
				</div>
				{top ? (
					<>
						{renderLiftHandle(top, "top")}
						{renderLiftHandle(top, "bottom")}
					</>
				) : null}
				{lifted
					? (["left", "right", "bottom"] as const).map((edge) => (
							<div
								key={edge}
								className="workspace__edge-hint"
								data-edge={edge}
								aria-hidden="true"
							/>
						))
					: null}
				<div className="workspace__pane-actions">
					<span>
						{sheets.length} Sheet{sheets.length === 1 ? "" : "s"}
					</span>
					{top && !top.locked ? (
						<button
							type="button"
							aria-label={`Close ${labelSubject(top.subject)}`}
							onClick={() =>
								dispatch({
									type: "ClosePresentation",
									presentationId: top.id,
								})
							}
						>
							×
						</button>
					) : null}
				</div>
				{cardLayers.map((layer) => {
					const cards = selectVisibleCards(state, layer.id);
					const holdsMember =
						lifted?.presentation.layerId === layer.id;
					if (!cards.length && !holdsMember) return null;
					return (
						<div
							key={layer.id}
							className="workspace__cards"
							data-card-layer={layer.id}
							data-return-layer={
								holdsMember ? layer.id : undefined
							}
							data-return-target={
								destination?.edge === "return"
									? "true"
									: undefined
							}
						>
							{holdsMember ? (
								<div
									className="workspace__return-zone"
									data-return-zone=""
									aria-hidden="true"
								/>
							) : null}
							{cards.map((card) => {
								const index = layer.memberIds.indexOf(card.id);
								const total = layer.memberIds.length;
								return (
									<article
										key={card.id}
										className="workspace__card"
										onDoubleClick={(event) =>
											toggleBody(event, card, paneId)
										}
										data-presentation-id={card.id}
										data-presentation-form="Card"
										style={{
											top: `calc(${index} * var(--workspace-card-step))`,
											zIndex: total - index,
											height: `calc(100% - ${total - 1} * var(--workspace-card-step))`,
										}}
									>
										<div
											className="workspace__card-content"
											inert={index !== 0}
										>
											{renderSubject(card.subject, {
												presentationId: card.id,
												presentation: "Card",
												subject: card.subject,
												selectAnchor: (anchor) =>
													selectAnchor(
														card.id,
														anchor,
													),
											})}
										</div>
										{index === 0
											? renderLiftHandle(card, "top")
											: null}
										<button
											type="button"
											className="workspace__card-tail"
											aria-label={`Lift ${labelSubject(card.subject)} Card`}
											{...liftHandlers(card)}
										>
											{labelSubject(card.subject)}
										</button>
									</article>
								);
							})}
						</div>
					);
				})}
				{isTarget && isTarget.edge !== "return" ? (
					<div
						className="workspace__drop"
						data-edge={isTarget.edge}
						aria-label={`Drop as ${isTarget.edge === "inside" ? "a sheet in this pane" : `a sheet at the ${isTarget.edge} edge`}`}
						role="status"
					>
						<span className="workspace__drop-label">
							{isTarget.edge === "inside"
								? "Drop in pane"
								: `Drop at ${isTarget.edge} edge`}
						</span>
					</div>
				) : null}
			</section>
		);
	}

	function renderLayout(node: WorkspaceLayout): ReactNode {
		if (node.kind === "Pane") return renderPane(node.id);
		return (
			<Group
				key={node.id}
				id={node.id}
				orientation={node.axis}
				className="workspace__group"
			>
				<Panel
					id={node.children[0].id}
					minSize={
						node.axis === "horizontal"
							? minimumWidth(node.children[0])
							: 120
					}
				>
					{renderLayout(node.children[0])}
				</Panel>
				<Separator
					className="workspace__separator"
					aria-label={`Resize ${node.axis} split`}
				/>
				<Panel
					id={node.children[1].id}
					minSize={
						node.axis === "horizontal"
							? minimumWidth(node.children[1])
							: 120
					}
				>
					{renderLayout(node.children[1])}
				</Panel>
			</Group>
		);
	}

	const dragStyle: CSSProperties | undefined = pointer
		? { left: pointer.x, top: pointer.y }
		: undefined;
	return (
		<div
			className={["workspace", className].filter(Boolean).join(" ")}
			onPointerMove={moveLift}
			onPointerUp={finishLift}
			onPointerCancel={cancelGesture}
		>
			<div
				ref={root}
				className="workspace__canvas"
				style={{
					minWidth:
						layout.kind === "Pane"
							? "min(100%, 416px)"
							: minimumWidth(layout),
				}}
			>
				{renderLayout(layout)}
			</div>
			{lifted && pointer
				? createPortal(
						<div
							className="workspace__drag"
							data-lifted-presentation={lifted.presentation.id}
							data-source-form={lifted.sourceForm}
							data-anchor={liftAnchor}
							style={dragStyle}
							inert
						>
							{renderSubject(lifted.presentation.subject, {
								presentationId: lifted.presentation.id,
								presentation: "Card",
								subject: lifted.presentation.subject,
								selectAnchor: (anchor) =>
									selectAnchor(
										lifted.presentation.id,
										anchor,
									),
							})}
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}
