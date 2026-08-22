import {
	animate,
	MotionConfig,
	motion,
	useMotionValue,
	useReducedMotion,
} from "motion/react";
import {
	type KeyboardEvent as ReactKeyboardEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";

import {
	CARD_DEMO_GEOMETRY,
	CARD_DEMO_KEYBOARD_ORDER,
	type CardDemoNoteKind,
	type CardDemoResolutionCard,
	isInsideCardDemoCancelZone,
} from "../card-demo-contract";
import type { CardDemoInteractionProps } from "../card-demo-interaction";
import {
	CardDemoCardView,
	CardDemoStackFrame,
} from "../card-demo-presentation";

/**
 * One Motion adapter on the existing shared card-demo route; the harness owns
 * every visual, fixture, route, and acceptance decision around this seam.
 */
export const MOTION_DOUBLE_TAP_WINDOW_MS = 300;

type TapCandidate = {
	readonly kind: CardDemoNoteKind;
	readonly startedAt: number;
	readonly timeout: number;
};

type PointerSession = {
	readonly pointerId: number;
	readonly pointerType: string;
	readonly originX: number;
	readonly originY: number;
	readonly target: HTMLButtonElement;
	dragging: boolean;
	moved: boolean;
	outside: boolean;
};

const MotionCardDemoCard = motion.create(CardDemoCardView);

export function motionPointerDistance(
	originX: number,
	originY: number,
	clientX: number,
	clientY: number,
): number {
	return Math.hypot(clientX - originX, clientY - originY);
}

export function MotionCardDemoInteraction({
	cards,
	selectedSegment,
	onOpenNote,
}: CardDemoInteractionProps) {
	const stackRef = useRef<HTMLDivElement>(null);
	const tapCandidateRef = useRef<TapCandidate | null>(null);
	const navigationLockedRef = useRef(false);
	const shouldReduceMotion = useReducedMotion();

	const clearTapCandidate = useCallback(() => {
		const candidate = tapCandidateRef.current;
		if (candidate) window.clearTimeout(candidate.timeout);
		tapCandidateRef.current = null;
	}, []);

	useEffect(() => clearTapCandidate, [clearTapCandidate]);

	const openNote = useCallback(
		(kind: CardDemoNoteKind) => {
			if (navigationLockedRef.current) return;
			navigationLockedRef.current = true;
			clearTapCandidate();
			onOpenNote(kind);
		},
		[clearTapCandidate, onOpenNote],
	);

	const registerTouchTap = useCallback(
		(kind: CardDemoNoteKind) => {
			const now = performance.now();
			const previous = tapCandidateRef.current;
			if (
				previous?.kind === kind &&
				now - previous.startedAt <= MOTION_DOUBLE_TAP_WINDOW_MS
			) {
				clearTapCandidate();
				openNote(kind);
				return;
			}

			clearTapCandidate();
			const timeout = window.setTimeout(() => {
				if (tapCandidateRef.current?.timeout === timeout)
					tapCandidateRef.current = null;
			}, MOTION_DOUBLE_TAP_WINDOW_MS);
			tapCandidateRef.current = { kind, startedAt: now, timeout };
		},
		[clearTapCandidate, openNote],
	);

	return (
		<MotionConfig reducedMotion="user">
			<CardDemoStackFrame
				data-motion-reduced={shouldReduceMotion ? "true" : "false"}
				data-motion-version="13.1.1"
				ref={stackRef}
			>
				{CARD_DEMO_KEYBOARD_ORDER.map((kind) =>
					cards.find((card) => card.kind === kind),
				).map((card) =>
					card ? (
						<MotionResolutionCard
							card={card}
							clearTapCandidate={clearTapCandidate}
							key={card.kind}
							onOpenNote={openNote}
							onTouchTap={registerTouchTap}
							selectedSegment={selectedSegment}
							stackRef={stackRef}
						/>
					) : null,
				)}
			</CardDemoStackFrame>
		</MotionConfig>
	);
}

function MotionResolutionCard({
	card,
	selectedSegment,
	stackRef,
	clearTapCandidate,
	onTouchTap,
	onOpenNote,
}: {
	readonly card: CardDemoResolutionCard;
	readonly selectedSegment: CardDemoInteractionProps["selectedSegment"];
	readonly stackRef: React.RefObject<HTMLDivElement | null>;
	readonly clearTapCandidate: () => void;
	readonly onTouchTap: (kind: CardDemoNoteKind) => void;
	readonly onOpenNote: (kind: CardDemoNoteKind) => void;
}) {
	const restingY = card.presentationLayer * CARD_DEMO_GEOMETRY.layerOffset;
	const x = useMotionValue(0);
	const y = useMotionValue(restingY);
	const shouldReduceMotion = useReducedMotion();
	const pointerSessionRef = useRef<PointerSession | null>(null);
	const [dragging, setDragging] = useState(false);
	const [outside, setOutside] = useState(false);

	const restoreCard = useCallback(() => {
		setDragging(false);
		setOutside(false);
		x.stop();
		y.stop();
		if (shouldReduceMotion) {
			x.set(0);
			y.set(restingY);
			return;
		}
		const spring = {
			type: "spring" as const,
			stiffness: 520,
			damping: 38,
			mass: 0.7,
		};
		animate(x, [x.get(), 0], spring);
		animate(y, [y.get(), restingY], spring);
	}, [restingY, shouldReduceMotion, x, y]);

	const releaseCapture = useCallback((session: PointerSession) => {
		if (!session.target.hasPointerCapture(session.pointerId)) return;
		try {
			session.target.releasePointerCapture(session.pointerId);
		} catch {
			// The browser can release capture immediately before dispatching loss.
		}
	}, []);

	const cancelPointerSession = useCallback(() => {
		const session = pointerSessionRef.current;
		if (!session) return;
		pointerSessionRef.current = null;
		releaseCapture(session);
		clearTapCandidate();
		restoreCard();
	}, [clearTapCandidate, releaseCapture, restoreCard]);

	useEffect(
		() => () => {
			const session = pointerSessionRef.current;
			pointerSessionRef.current = null;
			if (session) releaseCapture(session);
			x.stop();
			y.stop();
		},
		[releaseCapture, x, y],
	);

	const pointIsOutside = useCallback(
		(clientX: number, clientY: number) => {
			const rect = stackRef.current?.getBoundingClientRect();
			if (!rect) return false;
			return !isInsideCardDemoCancelZone(
				{ x: clientX, y: clientY },
				{
					left: rect.left,
					top: rect.top,
					right: rect.right,
					bottom: rect.bottom,
				},
			);
		},
		[stackRef],
	);

	const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
		if (
			pointerSessionRef.current ||
			!event.isPrimary ||
			(event.pointerType === "mouse" && event.button !== 0)
		)
			return;

		x.stop();
		y.stop();
		const target = event.currentTarget;
		pointerSessionRef.current = {
			pointerId: event.pointerId,
			pointerType: event.pointerType,
			originX: event.clientX,
			originY: event.clientY,
			target,
			dragging: false,
			moved: false,
			outside: false,
		};
		try {
			target.setPointerCapture(event.pointerId);
		} catch {
			// Pointer capture is opportunistic on older compatibility targets.
		}
	};

	const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
		const session = pointerSessionRef.current;
		if (!session || session.pointerId !== event.pointerId) return;

		const distance = motionPointerDistance(
			session.originX,
			session.originY,
			event.clientX,
			event.clientY,
		);
		if (distance > 0 && !session.moved) {
			session.moved = true;
			clearTapCandidate();
		}
		if (
			!session.dragging &&
			distance < CARD_DEMO_GEOMETRY.dragActivationDistance
		)
			return;

		if (!session.dragging) {
			session.dragging = true;
			setDragging(true);
		}
		x.set(event.clientX - session.originX);
		y.set(restingY + event.clientY - session.originY);
		const nextOutside = pointIsOutside(event.clientX, event.clientY);
		if (session.outside !== nextOutside) {
			session.outside = nextOutside;
			setOutside(nextOutside);
		}
	};

	const onPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
		const session = pointerSessionRef.current;
		if (!session || session.pointerId !== event.pointerId) return;
		pointerSessionRef.current = null;
		releaseCapture(session);

		if (session.dragging) {
			const releasedOutside = pointIsOutside(
				event.clientX,
				event.clientY,
			);
			if (releasedOutside) {
				onOpenNote(card.kind);
				return;
			}
			restoreCard();
			return;
		}

		restoreCard();
		if (session.pointerType === "touch" && !session.moved)
			onTouchTap(card.kind);
	};

	const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
		const activates =
			event.key === "Enter" ||
			event.key === " " ||
			event.key === "Spacebar" ||
			event.code === "Space";
		if (!activates || event.repeat) return;
		event.preventDefault();
		onOpenNote(card.kind);
	};

	return (
		<MotionCardDemoCard
			card={card}
			data-drag-active={dragging ? "true" : "false"}
			data-outside-cancel-zone={outside ? "true" : "false"}
			onKeyDown={onKeyDown}
			onLostPointerCapture={cancelPointerSession}
			onPointerCancel={cancelPointerSession}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			segment={selectedSegment}
			style={{
				x,
				y,
				zIndex: dragging
					? CARD_DEMO_KEYBOARD_ORDER.length + 1
					: card.presentationLayer + 1,
			}}
		/>
	);
}
