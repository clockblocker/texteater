import { animated, useReducedMotion, useSpring } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import {
	type KeyboardEvent as ReactKeyboardEvent,
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
	cardDemoRestingOffset,
	isInsideCardDemoCancelZone,
} from "../card-demo-contract";
import type {
	CardDemoInteractionProps,
	CardDemoOpenOrigin,
} from "../card-demo-interaction";
import {
	CardDemoCardView,
	CardDemoStackFrame,
} from "../card-demo-presentation";

const DOUBLE_TAP_WINDOW_MS = 300;
const RETURN_SPRING = { tension: 420, friction: 34 } as const;
const AnimatedCardDemoCardView = animated(CardDemoCardView);

type PendingTap = {
	readonly kind: CardDemoNoteKind;
	readonly timeout: ReturnType<typeof setTimeout>;
};

type GestureSpringCardProps = {
	readonly card: CardDemoResolutionCard;
	readonly selectedSegment: CardDemoInteractionProps["selectedSegment"];
	readonly stackRef: React.RefObject<HTMLDivElement | null>;
	readonly reducedMotion: boolean;
	readonly cancelPendingTap: () => void;
	readonly registerTap: (kind: CardDemoNoteKind) => boolean;
	readonly claimOpen: () => boolean;
	readonly onOpenNote: CardDemoInteractionProps["onOpenNote"];
};

export function GestureSpringCardDemoInteraction({
	cards,
	selectedSegment,
	onOpenNote,
}: CardDemoInteractionProps) {
	const stackRef = useRef<HTMLDivElement>(null);
	const pendingTapRef = useRef<PendingTap | null>(null);
	const openingRef = useRef(false);
	const reducedMotion = useReducedMotion() === true;

	const cancelPendingTap = useCallback(() => {
		const pendingTap = pendingTapRef.current;
		if (!pendingTap) return;
		clearTimeout(pendingTap.timeout);
		pendingTapRef.current = null;
	}, []);

	const registerTap = useCallback(
		(kind: CardDemoNoteKind) => {
			const pendingTap = pendingTapRef.current;
			if (pendingTap?.kind === kind) {
				cancelPendingTap();
				return true;
			}
			cancelPendingTap();
			pendingTapRef.current = {
				kind,
				timeout: setTimeout(() => {
					pendingTapRef.current = null;
				}, DOUBLE_TAP_WINDOW_MS),
			};
			return false;
		},
		[cancelPendingTap],
	);

	const claimOpen = useCallback(() => {
		if (openingRef.current) return false;
		openingRef.current = true;
		cancelPendingTap();
		return true;
	}, [cancelPendingTap]);

	useEffect(() => cancelPendingTap, [cancelPendingTap]);

	return (
		<div
			className="card-demo-pending"
			data-card-demo-engine="gesture-spring"
			data-reduced-motion={reducedMotion ? "true" : "false"}
		>
			<CardDemoStackFrame ref={stackRef}>
				{CARD_DEMO_KEYBOARD_ORDER.map((kind) =>
					cards.find((card) => card.kind === kind),
				).map((card) =>
					card ? (
						<GestureSpringCard
							cancelPendingTap={cancelPendingTap}
							card={card}
							claimOpen={claimOpen}
							key={card.kind}
							onOpenNote={onOpenNote}
							reducedMotion={reducedMotion}
							registerTap={registerTap}
							selectedSegment={selectedSegment}
							stackRef={stackRef}
						/>
					) : null,
				)}
			</CardDemoStackFrame>
		</div>
	);
}

function GestureSpringCard({
	card,
	selectedSegment,
	stackRef,
	reducedMotion,
	cancelPendingTap,
	registerTap,
	claimOpen,
	onOpenNote,
}: GestureSpringCardProps) {
	const baseY = cardDemoRestingOffset(card.presentationLayer);
	const dragIntentionalRef = useRef(false);
	const movedRef = useRef(false);
	const outsideRef = useRef(false);
	const [dragActive, setDragActive] = useState(false);
	const [outside, setOutside] = useState(false);
	const [springs, api] = useSpring(() => ({
		x: 0,
		y: baseY,
		scale: 1,
	}));

	useEffect(
		() => () => {
			api.stop();
		},
		[api],
	);

	const setOutsideState = useCallback((nextOutside: boolean) => {
		if (outsideRef.current === nextOutside) return;
		outsideRef.current = nextOutside;
		setOutside(nextOutside);
	}, []);

	const restore = useCallback(() => {
		dragIntentionalRef.current = false;
		setDragActive(false);
		setOutsideState(false);
		api.start({
			x: 0,
			y: baseY,
			scale: 1,
			immediate: reducedMotion,
			config: RETURN_SPRING,
		});
	}, [api, baseY, reducedMotion, setOutsideState]);

	const open = useCallback(
		(origin: CardDemoOpenOrigin) => {
			if (!claimOpen()) return;
			setDragActive(false);
			onOpenNote(card.kind, origin);
		},
		[card.kind, claimOpen, onOpenNote],
	);

	const bindDrag = useDrag(
		({ active, canceled, event, first, movement: [x, y], xy }) => {
			const distance = Math.hypot(x, y);
			const pointerType =
				"pointerType" in event
					? event.pointerType
					: event.type.startsWith("touch")
						? "touch"
						: "mouse";
			const interrupted =
				canceled ||
				event.type === "pointercancel" ||
				event.type === "lostpointercapture";

			if (first) {
				dragIntentionalRef.current = false;
				movedRef.current = false;
				setDragActive(false);
				setOutsideState(false);
			}

			if (interrupted) {
				restore();
				return;
			}

			if (active && distance > 0 && !movedRef.current) {
				movedRef.current = true;
				cancelPendingTap();
			}

			if (
				active &&
				!dragIntentionalRef.current &&
				distance >= CARD_DEMO_GEOMETRY.dragActivationDistance
			) {
				dragIntentionalRef.current = true;
				cancelPendingTap();
			}

			if (active && dragIntentionalRef.current) {
				const zone = stackRef.current?.getBoundingClientRect();
				const nextOutside = zone
					? !isInsideCardDemoCancelZone({ x: xy[0], y: xy[1] }, zone)
					: false;
				setDragActive(true);
				setOutsideState(nextOutside);
				api.start({
					x,
					y: baseY + y,
					scale: 1,
					immediate: true,
				});
				return;
			}

			if (active) return;
			if (dragIntentionalRef.current) {
				if (outsideRef.current) open("drop");
				else restore();
				return;
			}
			if (movedRef.current) {
				restore();
				return;
			}
			if (pointerType === "touch" && registerTap(card.kind))
				open("direct");
		},
		{
			threshold: 0,
			pointer: { capture: true, keys: false },
		},
	);

	const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
		if (
			event.repeat ||
			(event.key !== "Enter" &&
				event.key !== " " &&
				event.key !== "Space")
		)
			return;
		event.preventDefault();
		cancelPendingTap();
		open("direct");
	};

	return (
		<AnimatedCardDemoCardView
			{...bindDrag()}
			card={card}
			data-drag-active={dragActive ? "true" : "false"}
			data-outside-cancel-zone={outside ? "true" : "false"}
			onKeyDown={onKeyDown}
			segment={selectedSegment}
			style={{
				x: springs.x,
				y: springs.y,
				scale: springs.scale,
				zIndex: dragActive
					? CARD_DEMO_KEYBOARD_ORDER.length + 1
					: card.presentationLayer + 1,
			}}
		/>
	);
}
