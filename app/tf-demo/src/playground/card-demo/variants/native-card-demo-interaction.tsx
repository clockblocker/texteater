import {
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useRef,
	useState,
} from "react";

import {
	CARD_DEMO_GEOMETRY,
	CARD_DEMO_KEYBOARD_ORDER,
	type CardDemoNoteKind,
	isInsideCardDemoCancelZone,
} from "../card-demo-contract";
import type { CardDemoInteractionProps } from "../card-demo-interaction";
import {
	CardDemoCardView,
	CardDemoStackFrame,
} from "../card-demo-presentation";

export const NATIVE_CARD_DEMO_DOUBLE_TAP_WINDOW_MS = 300;

type PointerSession = {
	readonly pointerId: number;
	readonly pointerType: string;
	readonly kind: CardDemoNoteKind;
	readonly originX: number;
	readonly originY: number;
	active: boolean;
	moved: boolean;
	outside: boolean;
};

type DragPresentation = {
	readonly kind: CardDemoNoteKind;
	readonly deltaX: number;
	readonly deltaY: number;
	readonly outside: boolean;
};

type LastTouchTap = {
	readonly kind: CardDemoNoteKind;
	readonly at: number;
};

export function isNativeCardDemoDragActive(
	deltaX: number,
	deltaY: number,
): boolean {
	return (
		Math.hypot(deltaX, deltaY) >= CARD_DEMO_GEOMETRY.dragActivationDistance
	);
}

export function isNativeCardDemoDoubleTap(
	lastTap: LastTouchTap | null,
	kind: CardDemoNoteKind,
	now: number,
): boolean {
	return (
		lastTap?.kind === kind &&
		now - lastTap.at >= 0 &&
		now - lastTap.at <= NATIVE_CARD_DEMO_DOUBLE_TAP_WINDOW_MS
	);
}

export function NativeCardDemoInteraction({
	cards,
	selectedSegment,
	onOpenNote,
}: CardDemoInteractionProps) {
	const stackRef = useRef<HTMLDivElement>(null);
	const pointerSession = useRef<PointerSession | null>(null);
	const lastTouchTap = useRef<LastTouchTap | null>(null);
	const [drag, setDrag] = useState<DragPresentation | null>(null);

	const resetPointerSession = () => {
		pointerSession.current = null;
		setDrag(null);
	};

	const handlePointerDown = (
		event: ReactPointerEvent<HTMLButtonElement>,
		kind: CardDemoNoteKind,
	) => {
		if (!event.isPrimary || event.button !== 0 || pointerSession.current) {
			return;
		}
		event.currentTarget.setPointerCapture(event.pointerId);
		pointerSession.current = {
			pointerId: event.pointerId,
			pointerType: event.pointerType,
			kind,
			originX: event.clientX,
			originY: event.clientY,
			active: false,
			moved: false,
			outside: false,
		};
	};

	const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
		const session = pointerSession.current;
		if (!session || session.pointerId !== event.pointerId) return;

		const deltaX = event.clientX - session.originX;
		const deltaY = event.clientY - session.originY;
		const active =
			session.active || isNativeCardDemoDragActive(deltaX, deltaY);
		session.active = active;
		session.moved = session.moved || active;
		if (!active) return;

		event.preventDefault();
		const cancelZone = stackRef.current?.getBoundingClientRect();
		const outside = cancelZone
			? !isInsideCardDemoCancelZone(
					{ x: event.clientX, y: event.clientY },
					cancelZone,
				)
			: false;
		session.outside = outside;
		setDrag({ kind: session.kind, deltaX, deltaY, outside });
	};

	const handleTouchTap = (kind: CardDemoNoteKind) => {
		const now = performance.now();
		if (isNativeCardDemoDoubleTap(lastTouchTap.current, kind, now)) {
			lastTouchTap.current = null;
			onOpenNote(kind);
			return;
		}
		lastTouchTap.current = { kind, at: now };
	};

	const finishPointer = (
		event: ReactPointerEvent<HTMLButtonElement>,
		cancelled: boolean,
	) => {
		const session = pointerSession.current;
		if (!session || session.pointerId !== event.pointerId) return;
		pointerSession.current = null;
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		setDrag(null);
		const cancelZone = stackRef.current?.getBoundingClientRect();
		const releasedOutside = cancelZone
			? !isInsideCardDemoCancelZone(
					{ x: event.clientX, y: event.clientY },
					cancelZone,
				)
			: session.outside;

		if (!cancelled && session.active && releasedOutside) {
			lastTouchTap.current = null;
			onOpenNote(session.kind);
			return;
		}
		if (!cancelled && !session.moved && session.pointerType === "touch") {
			handleTouchTap(session.kind);
		}
	};

	const handleKeyDown = (
		event: ReactKeyboardEvent<HTMLButtonElement>,
		kind: CardDemoNoteKind,
	) => {
		if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
		event.preventDefault();
		resetPointerSession();
		onOpenNote(kind);
	};

	return (
		<CardDemoStackFrame ref={stackRef}>
			{CARD_DEMO_KEYBOARD_ORDER.map((kind) =>
				cards.find((card) => card.kind === kind),
			).map((card) => {
				if (!card) return null;
				const activeDrag = drag?.kind === card.kind ? drag : null;
				return (
					<CardDemoCardView
						card={card}
						data-drag-active={activeDrag ? "true" : undefined}
						data-outside-cancel-zone={
							activeDrag?.outside ? "true" : undefined
						}
						key={card.kind}
						onKeyDown={(event) => handleKeyDown(event, card.kind)}
						onLostPointerCapture={(event) =>
							finishPointer(event, true)
						}
						onPointerCancel={(event) => finishPointer(event, true)}
						onPointerDown={(event) =>
							handlePointerDown(event, card.kind)
						}
						onPointerMove={handlePointerMove}
						onPointerUp={(event) => finishPointer(event, false)}
						segment={selectedSegment}
						style={{
							transform: `translate3d(${activeDrag?.deltaX ?? 0}px, ${(activeDrag?.deltaY ?? 0) + card.presentationLayer * CARD_DEMO_GEOMETRY.layerOffset}px, 0)`,
							zIndex: activeDrag
								? cards.length + 1
								: card.presentationLayer + 1,
						}}
					/>
				);
			})}
		</CardDemoStackFrame>
	);
}
