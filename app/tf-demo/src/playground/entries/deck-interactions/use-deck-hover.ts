import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { fanSlots } from "./layout";
import type { MotionContext } from "./motion-kit";
import type { Deck } from "./use-deck";

/**
 * The hover's knobs, with the first build's values: the Deck fans 4° per
 * Card around its foot, the hovered Card rises 6 px, both on a spring of
 * response 0.3 s and ζ 0.8. Reduced, both are scaled by `hoverReduced`
 * and play as the page's short tween, so they never overshoot.
 */
export const HOVER_DEFAULTS = {
	fanDeg: 4,
	hoverLift: 6,
	hoverStiffness: 438,
	hoverDamping: 34,
	hoverReduced: 0.5,
};
export type HoverKnobs = typeof HOVER_DEFAULTS;

/** The hover's inspector controls, to spread into a variant's knobs. */
export const HOVER_KNOBS = [
	knob("fanDeg", "Hover fan", 0, 15, 0.5, "°"),
	knob("hoverLift", "Hover lift", 0, 24, 1, "px"),
	knob("hoverStiffness", "Hover stiffness", 50, 1500, 10),
	knob("hoverDamping", "Hover damping", 1, 120, 1),
	knob("hoverReduced", "Hover share, reduced", 0, 1, 0.05),
] as const;

function knob<K extends keyof HoverKnobs>(
	key: K,
	label: string,
	min: number,
	max: number,
	step: number,
	unit?: string,
) {
	return { kind: "number" as const, key, label, min, max, step, unit };
}

const FINE_HOVER = "(hover: hover) and (pointer: fine)";

function subscribeFine(onChange: () => void) {
	const query = window.matchMedia(FINE_HOVER);
	query.addEventListener("change", onChange);
	return () => query.removeEventListener("change", onChange);
}

const fineHover = () => window.matchMedia(FINE_HOVER).matches;

type CardHandler = (id: string, event: ReactPointerEvent<HTMLElement>) => void;

/**
 * A hovered Deck opens slightly: every Card turns `fanDeg` from the next
 * around the Deck's foot, the hovered one rising `hoverLift`. Only a
 * mouse or pen hovers, on a device that has hover. While a Card is
 * pressed the rest of the Deck settles back and the pressed Card stays
 * where the hover left it, so the pick-up starts from there; while one
 * is carried, the carry owns the Deck. Every move is an interruptible
 * spring (or, reduced, the page's short tween).
 *
 * Pass `holding`, the Card pressed or carried, or null. Spread `onEnter`
 * and `onLeave` onto `DeckCards`; call `clear` when a Card leaves the
 * hand's hover, as at pick-up.
 */
export function useDeckHover({
	deck,
	motion,
	knobs,
	holding,
}: {
	readonly deck: Deck;
	readonly motion: MotionContext;
	readonly knobs: HoverKnobs;
	readonly holding: string | null;
}) {
	const [hovered, setHovered] = useState<string | null>(null);
	/* a Card entered while one is in hand is not hovered: the hand is carrying */
	const held = useRef(holding);
	held.current = holding;
	const fine = useSyncExternalStore(subscribeFine, fineHover, () => false);
	const { order, slots, status, expanded, place, isBusy } = deck;

	useEffect(() => {
		if (status !== "dealt" || expanded) return;
		if (holding && isBusy(holding)) return;
		const open = fine && hovered !== null && holding === null;
		const share = motion.reduce ? knobs.hoverReduced : 1;
		const shown = open ? fanSlots(slots, knobs.fanDeg * share) : slots;
		const spring = {
			stiffness: knobs.hoverStiffness,
			damping: knobs.hoverDamping,
		};
		order.forEach((id, index) => {
			const slot = shown[index];
			if (!slot || id === holding || isBusy(id)) return;
			const lift = open && id === hovered ? knobs.hoverLift * share : 0;
			void place(id, { ...slot, v: slot.v - lift }, spring);
		});
	}, [
		fine,
		hovered,
		holding,
		status,
		expanded,
		order,
		slots,
		place,
		isBusy,
		motion.reduce,
		knobs.fanDeg,
		knobs.hoverLift,
		knobs.hoverStiffness,
		knobs.hoverDamping,
		knobs.hoverReduced,
	]);

	const onEnter = useCallback<CardHandler>((id, event) => {
		if (event.pointerType !== "touch" && held.current === null)
			setHovered(id);
	}, []);
	const onLeave = useCallback<CardHandler>((id) => {
		setHovered((current) => (current === id ? null : current));
	}, []);
	const clear = useCallback(() => setHovered(null), []);

	return { hovered, onEnter, onLeave, clear };
}
