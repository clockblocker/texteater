import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
} from "react";
import { type Drag, SLOP_PX, trackPointer } from "./pointer";
import type { TableHandle } from "./table";

/** A gesture's end: where the pointer let go and how fast it was going. */
export type Letting = {
	readonly id: string;
	readonly point: { readonly x: number; readonly y: number };
	/** px/s. */
	readonly velocity: { readonly x: number; readonly y: number };
	readonly drag: Drag;
};

export type HandCallbacks = {
	/** A press that never left the slop, on a Body at rest. */
	readonly onTap?: (id: string) => void;
	/** The Body came off its rest into the hand. */
	readonly onLift?: (id: string) => void;
	readonly onMove?: (letting: Letting) => void;
	/**
	 * The hand let go of a held Body. Call `table.release` (or `leave`) with
	 * its new rest; a Body left held stays in the hand.
	 */
	readonly onRelease: (letting: Letting) => void;
};

function letting(id: string, drag: Drag): Letting {
	return {
		id,
		point: { x: drag.clientX, y: drag.clientY },
		velocity: { x: drag.vx, y: drag.vy },
		drag,
	};
}

/**
 * The hand: a press on a Body that moves past the slop lifts it, and it
 * follows the pointer 1:1 until the release. A press on a Body in flight
 * catches it at once, from where it shows. Returns the handler a Body's
 * `onPointerDown` calls with its id.
 */
export function useHand(
	table: TableHandle,
	callbacks: HandCallbacks,
): (id: string, event: ReactPointerEvent<HTMLElement>) => void {
	const latest = useRef(callbacks);
	latest.current = callbacks;
	const stop = useRef<(() => void) | null>(null);
	useEffect(() => () => stop.current?.(), []);
	return (id, event) => {
		if (event.button !== 0 || stop.current) return;
		const press = { x: event.clientX, y: event.clientY };
		let held = table.moving(id);
		if (held) {
			table.hold(id, press);
			latest.current.onLift?.(id);
		}
		stop.current = trackPointer(event, {
			move: (drag) => {
				if (!held && Math.hypot(drag.dx, drag.dy) > SLOP_PX) {
					held = true;
					table.hold(id, press);
					latest.current.onLift?.(id);
				}
				if (!held) return;
				table.carry(id, { x: drag.clientX, y: drag.clientY });
				latest.current.onMove?.(letting(id, drag));
			},
			up: (drag) => {
				stop.current = null;
				if (held) latest.current.onRelease(letting(id, drag));
				else latest.current.onTap?.(id);
			},
			cancel: () => {
				stop.current = null;
				if (held) table.release(id, { x: 0, y: 0 });
			},
		});
	};
}
