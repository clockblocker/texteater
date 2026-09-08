"use client";

import {
	type CSSProperties,
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
	type WorkspaceCommand,
	type WorkspaceLayout,
	type WorkspacePresentation,
	type WorkspaceState,
} from "./model";

/** The narrowest useful canvas for a Sheet and its Card counterpart. */
const MINIMUM_SHEET_WIDTH = 416;

type Edge = "left" | "right" | "top" | "bottom";
type Destination = { paneId: string; edge: Edge | "inside" | "return" };
type PointerPosition = { x: number; y: number };

export type WorkspaceRenderContext<S> = {
	presentationId: string;
	presentation: "Card" | "Sheet";
	subject: S;
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
		"[data-return-layer]",
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
				edge: "top" as const,
				value: (y - rect.top) / Math.min(80, rect.height * 0.23),
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
	const [liftAnchor, setLiftAnchor] = useState<"top" | "bottom">("top");
	const [destination, setDestination] = useState<Destination | null>(null);
	const layout = selectLayout(state);
	const lifted = selectLiftedPresentation(state);

	function updatePointer(next: PointerPosition | null) {
		setPointer(next);
	}
	function updateDestination(next: Destination | null) {
		setDestination(next);
	}
	function cancelGesture() {
		if (lifted) dispatch({ type: "CancelGesture" });
		updatePointer(null);
		updateDestination(null);
		liftStartRef.current = null;
		liftPointerIdRef.current = null;
	}

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") cancelGesture();
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	});

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
		setLiftAnchor(anchor);
		updateDestination(null);
	}
	function moveLift(event: ReactPointerEvent<HTMLElement>) {
		if (liftPointerIdRef.current !== event.pointerId) return;
		updatePointer({ x: event.clientX, y: event.clientY });
		updateDestination(
			destinationAt(root.current, event.clientX, event.clientY),
		);
	}
	function finishLift(event: ReactPointerEvent<HTMLElement>) {
		if (liftPointerIdRef.current !== event.pointerId) return;
		if (!lifted || !liftStartRef.current) return;
		const moved =
			Math.hypot(
				event.clientX - liftStartRef.current.x,
				event.clientY - liftStartRef.current.y,
			) > 4;
		const target = destinationAt(
			root.current,
			event.clientX,
			event.clientY,
		);
		if (!moved || !target) {
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
				onPointerDownCapture={() =>
					dispatch({ type: "ActivatePane", paneId })
				}
			>
				<div className="workspace__content">
					{sheets.map((sheet, index) => {
						const covered = index !== sheets.length - 1;
						return (
							<div
								key={sheet.id}
								className="workspace__sheet"
								data-presentation-id={sheet.id}
								data-presentation-form="Sheet"
								data-covered={covered ? "true" : undefined}
								data-sheet-underlay={
									sheets.length > 1 && !covered
										? "true"
										: undefined
								}
								inert={covered}
							>
								{renderSubject(sheet.subject, {
									presentationId: sheet.id,
									presentation: "Sheet",
									subject: sheet.subject,
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
							<button
								className="workspace__close-cards"
								type="button"
								onClick={() =>
									dispatch({
										type: "CloseLayer",
										layerId: layer.id,
									})
								}
							>
								Close Cards
							</button>
							{cards.map((card) => {
								const index = layer.memberIds.indexOf(card.id);
								const total = layer.memberIds.length;
								return (
									<article
										key={card.id}
										className="workspace__card"
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
											inert
										>
											{renderSubject(card.subject, {
												presentationId: card.id,
												presentation: "Card",
												subject: card.subject,
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
					/>
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
				style={{ minWidth: minimumWidth(layout) }}
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
							})}
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}
