import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { useDeckMotion } from "@/workspace/motion/runtime-config";
import type { Lift } from "./gesture";

/**
 * The hold to lift a Rooted Ground: its Pane bar pressed about a second,
 * `GROUND_PRESS_MS`, without moving past the click slop (tf-demo ADR 0008).
 */
export function useBarHold() {
	const { GROUND_PRESS_MS, CLICK_SLOP } = useDeckMotion();
	const hold = useRef<(Lift & { readonly timer: number }) | null>(null);
	/** The Pane whose bar is being held, for the bar's own feedback. */
	const [holding, setHolding] = useState<string | null>(null);
	function stop() {
		if (hold.current) window.clearTimeout(hold.current.timer);
		hold.current = null;
		setHolding(null);
	}
	useEffect(() => stop, []);
	return {
		holding,
		/** Whether a hold is under way, so a second press does not start one. */
		active: () => hold.current !== null,
		/** Start the hold on `paneId`'s bar; held out, `onLift` runs. */
		start(paneId: string, lift: Lift, onLift: () => void) {
			setHolding(paneId);
			hold.current = {
				...lift,
				timer: window.setTimeout(() => {
					hold.current = null;
					setHolding(null);
					onLift();
				}, GROUND_PRESS_MS),
			};
		},
		/** A pointer moving past the slop is not holding still: the hold is off. */
		move(event: ReactPointerEvent<HTMLElement>) {
			const current = hold.current;
			if (!current || current.pointerId !== event.pointerId) return;
			if (
				Math.hypot(
					event.clientX - current.x,
					event.clientY - current.y,
				) > CLICK_SLOP
			)
				stop();
		},
		stop,
	};
}
