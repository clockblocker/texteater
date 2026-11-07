import { useEffect, useRef } from "react";
import { LONG_PRESS_MS } from "./turn-gesture";

type Pressing = { readonly id: string; timer: number | null; fired: boolean };

/**
 * A press held still for `LONG_PRESS_MS` calls `onLongPress`. A lift past
 * the slop or a release before then cancels it, and the tap that ends a
 * long press is swallowed, so it doesn't also open the Card.
 */
export function useLongPress(onLongPress: (id: string) => void) {
	const pressing = useRef<Pressing | null>(null);
	const latest = useRef(onLongPress);
	latest.current = onLongPress;
	const stop = () => {
		const current = pressing.current;
		if (current?.timer != null) window.clearTimeout(current.timer);
		if (current) current.timer = null;
	};
	useEffect(() => stop, []);
	return {
		/** A press on `id` began. */
		start: (id: string) => {
			stop();
			const current: Pressing = { id, timer: null, fired: false };
			current.timer = window.setTimeout(() => {
				current.timer = null;
				current.fired = true;
				latest.current(id);
			}, LONG_PRESS_MS);
			pressing.current = current;
			window.addEventListener("pointerup", stop, { once: true });
			window.addEventListener("pointercancel", stop, { once: true });
		},
		/** The press became a lift: no long press. */
		cancel: stop,
		/** Whether the tap on `id` ends a long press, which then swallows it. */
		swallow: (id: string) => {
			const current = pressing.current;
			pressing.current = null;
			return current?.id === id && current.fired;
		},
	};
}
