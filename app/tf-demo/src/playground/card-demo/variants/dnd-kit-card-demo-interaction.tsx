import {
	type CollisionDetection,
	DndContext,
	type DragEndEvent,
	type DraggableSyntheticListeners,
	type DragMoveEvent,
	DragOverlay,
	type DragStartEvent,
	getClientRect,
	PointerSensor,
	type ScreenReaderInstructions,
	useDraggable,
	useDroppable,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	type ComponentProps,
	type CSSProperties,
	type PointerEvent as ReactPointerEvent,
	type RefCallback,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import {
	CARD_DEMO_GEOMETRY,
	CARD_DEMO_KEYBOARD_ORDER,
	type CardDemoNoteKind,
	type CardDemoPoint,
	type CardDemoRect,
	type CardDemoResolutionCard,
	isInsideCardDemoCancelZone,
} from "../card-demo-contract";
import type { CardDemoInteractionProps } from "../card-demo-interaction";
import {
	CardDemoCardContent,
	CardDemoCardView,
	CardDemoStackFrame,
} from "../card-demo-presentation";

/**
 * One dnd-kit implementation of the shared card-demo behavior, mounted by the
 * already-frozen playground route at `/playground/card-demo/dnd-kit/text`.
 */

const CANCEL_ZONE_ID = "card-demo-dnd-kit-cancel-zone";
export const DND_KIT_DOUBLE_TAP_WINDOW_MS = 300;

/**
 * dnd-kit 6.3.1 activates only after strictly exceeding this value. The
 * immediately representable float below six keeps the shared boundary
 * inclusive without admitting any representable distance below it.
 */
export const DND_KIT_SENSOR_ACTIVATION_DISTANCE = 5.999999999999999;

type TapCandidate = {
	readonly kind: CardDemoNoteKind;
	readonly endedAt: number;
};

type PointerSession = {
	readonly kind: CardDemoNoteKind;
	readonly pointerId: number;
	readonly pointerType: string;
	readonly origin: CardDemoPoint;
	moved: boolean;
};

const screenReaderInstructions: ScreenReaderInstructions = {
	draggable:
		"Press Enter or Space to open this Note directly. Drag with a pointer outside the card stack to open it.",
};

export function isDndKitCardDemoOutsideCancelZone(
	point: CardDemoPoint,
	zone: CardDemoRect,
): boolean {
	return !isInsideCardDemoCancelZone(point, zone);
}

export function isDndKitCardDemoDirectOpenKey(
	key: string,
	repeated = false,
): boolean {
	return !repeated && (key === "Enter" || key === " ");
}

export function canStartDndKitCardDemoPointer(
	hasActiveSession: boolean,
	pointer: {
		readonly button: number;
		readonly isPrimary: boolean;
		readonly pointerType: string;
	},
): boolean {
	return (
		!hasActiveSession &&
		pointer.isPrimary &&
		(pointer.pointerType !== "mouse" || pointer.button === 0)
	);
}

export function isDndKitCardDemoDoubleTap(
	previous: TapCandidate | null,
	kind: CardDemoNoteKind,
	endedAt: number,
): boolean {
	return Boolean(
		previous &&
			previous.kind === kind &&
			endedAt - previous.endedAt >= 0 &&
			endedAt - previous.endedAt <= DND_KIT_DOUBLE_TAP_WINDOW_MS,
	);
}

const cancelZoneCollisionDetection: CollisionDetection = ({
	pointerCoordinates,
	droppableRects,
}) => {
	const zone = droppableRects.get(CANCEL_ZONE_ID);
	if (
		!pointerCoordinates ||
		!zone ||
		isDndKitCardDemoOutsideCancelZone(pointerCoordinates, zone)
	) {
		return [];
	}
	return [{ id: CANCEL_ZONE_ID, data: { value: 1 } }];
};

export function DndKitCardDemoInteraction({
	cards,
	selectedSegment,
	onOpenNote,
}: CardDemoInteractionProps) {
	const stackElementRef = useRef<HTMLDivElement | null>(null);
	const activeKindRef = useRef<CardDemoNoteKind | null>(null);
	const pointerSessionRef = useRef<PointerSession | null>(null);
	const lastPointerRef = useRef<{
		readonly kind: CardDemoNoteKind;
		readonly point: CardDemoPoint;
	} | null>(null);
	const lastTapRef = useRef<TapCandidate | null>(null);
	const tapWindowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	const [activeKind, setActiveKind] = useState<CardDemoNoteKind | null>(null);
	const [activeOutside, setActiveOutside] = useState(false);
	const reducedMotion = usePrefersReducedMotion();
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: DND_KIT_SENSOR_ACTIVATION_DISTANCE,
			},
		}),
	);
	const setStackRef = useCallback<RefCallback<HTMLDivElement>>((node) => {
		stackElementRef.current = node;
	}, []);

	const clearTapCandidate = useCallback(() => {
		lastTapRef.current = null;
		if (tapWindowTimerRef.current !== null) {
			clearTimeout(tapWindowTimerRef.current);
			tapWindowTimerRef.current = null;
		}
	}, []);

	const resetDrag = useCallback(() => {
		activeKindRef.current = null;
		pointerSessionRef.current = null;
		lastPointerRef.current = null;
		setActiveKind(null);
		setActiveOutside(false);
	}, []);

	const setOutsideFromPoint = useCallback(
		(kind: CardDemoNoteKind, point: CardDemoPoint): boolean => {
			lastPointerRef.current = { kind, point };
			const zone = stackElementRef.current?.getBoundingClientRect();
			const outside = zone
				? isDndKitCardDemoOutsideCancelZone(point, zone)
				: false;
			if (activeKindRef.current === kind) setActiveOutside(outside);
			return outside;
		},
		[],
	);

	const handleDragStart = useCallback(
		(event: DragStartEvent) => {
			const kind = noteKindFromId(event.active.id);
			if (!kind) return;
			clearTapCandidate();
			activeKindRef.current = kind;
			setActiveKind(kind);
			setActiveOutside(false);
		},
		[clearTapCandidate],
	);

	const handleDragMove = useCallback(
		(event: DragMoveEvent) => {
			const kind = noteKindFromId(event.active.id);
			if (!kind) return;
			const fallbackPoint = pointFromActivatorAndDelta(event);
			const latest = lastPointerRef.current;
			setOutsideFromPoint(
				kind,
				latest?.kind === kind ? latest.point : fallbackPoint,
			);
		},
		[setOutsideFromPoint],
	);

	const handleDragEnd = useCallback(
		(event: DragEndEvent) => {
			const kind = noteKindFromId(event.active.id);
			if (!kind || activeKindRef.current !== kind) {
				resetDrag();
				return;
			}
			const latest = lastPointerRef.current;
			const releasePoint =
				latest?.kind === kind
					? latest.point
					: pointFromActivatorAndDelta(event);
			const zone = stackElementRef.current?.getBoundingClientRect();
			const shouldOpen = zone
				? isDndKitCardDemoOutsideCancelZone(releasePoint, zone)
				: false;
			resetDrag();
			if (shouldOpen) onOpenNote(kind);
		},
		[onOpenNote, resetDrag],
	);

	const handlePointerDown = useCallback(
		(
			kind: CardDemoNoteKind,
			event: ReactPointerEvent<HTMLButtonElement>,
		): boolean => {
			if (
				!canStartDndKitCardDemoPointer(
					pointerSessionRef.current !== null,
					event,
				)
			) {
				return false;
			}
			pointerSessionRef.current = {
				kind,
				pointerId: event.pointerId,
				pointerType: event.pointerType,
				origin: { x: event.clientX, y: event.clientY },
				moved: false,
			};
			lastPointerRef.current = {
				kind,
				point: { x: event.clientX, y: event.clientY },
			};
			try {
				event.currentTarget.setPointerCapture(event.pointerId);
			} catch {
				// The document sensor still owns the stream when capture is unavailable.
			}
			return true;
		},
		[],
	);

	const handlePointerMove = useCallback(
		(
			kind: CardDemoNoteKind,
			event: ReactPointerEvent<HTMLButtonElement>,
		) => {
			const session = pointerSessionRef.current;
			if (
				!session ||
				session.kind !== kind ||
				session.pointerId !== event.pointerId
			) {
				return;
			}
			const point = { x: event.clientX, y: event.clientY };
			lastPointerRef.current = { kind, point };
			if (
				pointDistance(session.origin, point) >=
				CARD_DEMO_GEOMETRY.dragActivationDistance
			) {
				session.moved = true;
				clearTapCandidate();
			}
			if (activeKindRef.current === kind)
				setOutsideFromPoint(kind, point);
		},
		[clearTapCandidate, setOutsideFromPoint],
	);

	const handlePointerUp = useCallback(
		(
			kind: CardDemoNoteKind,
			event: ReactPointerEvent<HTMLButtonElement>,
		) => {
			const session = pointerSessionRef.current;
			lastPointerRef.current = {
				kind,
				point: { x: event.clientX, y: event.clientY },
			};
			if (
				!session ||
				session.kind !== kind ||
				session.pointerId !== event.pointerId
			) {
				return;
			}
			pointerSessionRef.current = null;
			if (session.pointerType !== "touch" || session.moved) {
				clearTapCandidate();
				return;
			}
			const endedAt = event.timeStamp;
			if (isDndKitCardDemoDoubleTap(lastTapRef.current, kind, endedAt)) {
				clearTapCandidate();
				onOpenNote(kind);
				return;
			}
			lastTapRef.current = { kind, endedAt };
			if (tapWindowTimerRef.current !== null)
				clearTimeout(tapWindowTimerRef.current);
			tapWindowTimerRef.current = setTimeout(() => {
				lastTapRef.current = null;
				tapWindowTimerRef.current = null;
			}, DND_KIT_DOUBLE_TAP_WINDOW_MS);
		},
		[clearTapCandidate, onOpenNote],
	);

	const handlePointerCancel = useCallback(
		(pointerId: number) => {
			if (pointerSessionRef.current?.pointerId === pointerId)
				pointerSessionRef.current = null;
			clearTapCandidate();
		},
		[clearTapCandidate],
	);

	const handleLostPointerCapture = useCallback(
		(pointerId: number) => {
			const session = pointerSessionRef.current;
			if (!session || session.pointerId !== pointerId) return;
			pointerSessionRef.current = null;
			clearTapCandidate();
			// dnd-kit has no lost-capture event, so translate it into the
			// PointerSensor's native cancellation event and let it detach itself.
			const cancellation =
				typeof PointerEvent === "undefined"
					? new Event("pointercancel", { bubbles: true })
					: new PointerEvent("pointercancel", {
							bubbles: true,
							pointerId,
						});
			document.dispatchEvent(cancellation);
		},
		[clearTapCandidate],
	);

	useEffect(
		() => () => {
			if (tapWindowTimerRef.current !== null)
				clearTimeout(tapWindowTimerRef.current);
		},
		[],
	);

	const activeCard = cards.find((card) => card.kind === activeKind) ?? null;
	return (
		<DndContext
			accessibility={{
				restoreFocus: true,
				screenReaderInstructions,
			}}
			autoScroll={false}
			collisionDetection={cancelZoneCollisionDetection}
			measuring={{ draggable: { measure: getClientRect } }}
			onDragCancel={resetDrag}
			onDragEnd={handleDragEnd}
			onDragMove={handleDragMove}
			onDragStart={handleDragStart}
			sensors={sensors}
		>
			<DndKitStackFrame
				data-card-demo-dnd-kit=""
				data-card-demo-reduced-motion={reducedMotion ? "true" : "false"}
				setStackElementRef={setStackRef}
			>
				{CARD_DEMO_KEYBOARD_ORDER.map((kind) =>
					cards.find((card) => card.kind === kind),
				).map((card) =>
					card ? (
						<DndKitCard
							activeOutside={
								activeKind === card.kind && activeOutside
							}
							card={card}
							key={card.kind}
							onDirectOpen={onOpenNote}
							onLostPointerCapture={handleLostPointerCapture}
							onPointerCancel={handlePointerCancel}
							onPointerDown={handlePointerDown}
							onPointerMove={handlePointerMove}
							onPointerUp={handlePointerUp}
							reducedMotion={reducedMotion}
							segment={selectedSegment}
						/>
					) : null,
				)}
			</DndKitStackFrame>
			<DragOverlay
				dropAnimation={
					reducedMotion || activeOutside ? null : undefined
				}
			>
				{activeCard ? (
					<div
						aria-hidden="true"
						className="card-demo-card"
						data-card-demo-drag-overlay={activeCard.kind}
						data-outside-cancel-zone={
							activeOutside ? "true" : undefined
						}
						style={
							{
								"--card-demo-layer":
									activeCard.presentationLayer,
								transition: reducedMotion ? "none" : undefined,
								zIndex: activeCard.presentationLayer + 1,
							} as CSSProperties
						}
					>
						<CardDemoCardContent
							card={activeCard}
							segment={selectedSegment}
						/>
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}

function DndKitStackFrame({
	children,
	setStackElementRef,
	...props
}: Omit<ComponentProps<typeof CardDemoStackFrame>, "ref"> & {
	readonly setStackElementRef: RefCallback<HTMLDivElement>;
}) {
	const { setNodeRef: setCancelZoneRef } = useDroppable({
		id: CANCEL_ZONE_ID,
	});
	const setStackRef = useCallback<RefCallback<HTMLDivElement>>(
		(node) => {
			setStackElementRef(node);
			setCancelZoneRef(node);
		},
		[setCancelZoneRef, setStackElementRef],
	);
	return (
		<CardDemoStackFrame {...props} ref={setStackRef}>
			{children}
		</CardDemoStackFrame>
	);
}

function DndKitCard({
	card,
	segment,
	activeOutside,
	reducedMotion,
	onDirectOpen,
	onPointerDown,
	onPointerMove,
	onPointerUp,
	onPointerCancel,
	onLostPointerCapture,
}: {
	readonly card: CardDemoResolutionCard;
	readonly segment: CardDemoInteractionProps["selectedSegment"];
	readonly activeOutside: boolean;
	readonly reducedMotion: boolean;
	readonly onDirectOpen: (kind: CardDemoNoteKind) => void;
	readonly onPointerDown: (
		kind: CardDemoNoteKind,
		event: ReactPointerEvent<HTMLButtonElement>,
	) => boolean;
	readonly onPointerMove: (
		kind: CardDemoNoteKind,
		event: ReactPointerEvent<HTMLButtonElement>,
	) => void;
	readonly onPointerUp: (
		kind: CardDemoNoteKind,
		event: ReactPointerEvent<HTMLButtonElement>,
	) => void;
	readonly onPointerCancel: (pointerId: number) => void;
	readonly onLostPointerCapture: (pointerId: number) => void;
}) {
	const {
		attributes,
		isDragging,
		listeners,
		setActivatorNodeRef,
		setNodeRef,
	} = useDraggable({
		id: card.kind,
		attributes: {
			role: "button",
			roleDescription: "Resolution Chain card",
			tabIndex: 0,
		},
	});
	const setCardRef = useCallback<RefCallback<HTMLButtonElement>>(
		(node) => {
			setNodeRef(node);
			setActivatorNodeRef(node);
		},
		[setActivatorNodeRef, setNodeRef],
	);

	return (
		<CardDemoCardView
			{...attributes}
			card={card}
			data-dnd-kit-dragging={isDragging ? "true" : "false"}
			data-outside-cancel-zone={activeOutside ? "true" : undefined}
			onKeyDown={(event) => {
				if (!isDndKitCardDemoDirectOpenKey(event.key, event.repeat))
					return;
				event.preventDefault();
				onDirectOpen(card.kind);
			}}
			onLostPointerCapture={(event) =>
				onLostPointerCapture(event.pointerId)
			}
			onPointerCancel={(event) => onPointerCancel(event.pointerId)}
			onPointerDown={(event) => {
				if (!onPointerDown(card.kind, event)) return;
				invokeDndKitPointerListener(listeners, "onPointerDown", event);
			}}
			onPointerMove={(event) => onPointerMove(card.kind, event)}
			onPointerUp={(event) => onPointerUp(card.kind, event)}
			ref={setCardRef}
			segment={segment}
			style={{
				opacity: isDragging ? 0 : 1,
				transform: `translateY(${card.presentationLayer * CARD_DEMO_GEOMETRY.layerOffset}px)`,
				transition: reducedMotion ? "none" : undefined,
				zIndex: card.presentationLayer + 1,
			}}
		/>
	);
}

function invokeDndKitPointerListener(
	listeners: DraggableSyntheticListeners,
	name: "onPointerDown",
	event: ReactPointerEvent<HTMLButtonElement>,
): void {
	listeners?.[name]?.(event);
}

function noteKindFromId(
	id: DragStartEvent["active"]["id"],
): CardDemoNoteKind | null {
	return CARD_DEMO_KEYBOARD_ORDER.find((kind) => kind === id) ?? null;
}

function pointFromActivatorAndDelta(
	event: Pick<DragMoveEvent, "activatorEvent" | "delta">,
): CardDemoPoint {
	const activator = event.activatorEvent;
	if ("clientX" in activator && "clientY" in activator) {
		return {
			x: Number(activator.clientX) + event.delta.x,
			y: Number(activator.clientY) + event.delta.y,
		};
	}
	return { x: event.delta.x, y: event.delta.y };
}

function pointDistance(from: CardDemoPoint, to: CardDemoPoint): number {
	return Math.hypot(to.x - from.x, to.y - from.y);
}

function usePrefersReducedMotion(): boolean {
	const [reduced, setReduced] = useState(
		() =>
			typeof window !== "undefined" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches,
	);
	useEffect(() => {
		const query = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setReduced(query.matches);
		update();
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, []);
	return reduced;
}
