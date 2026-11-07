/**
 * A pointer gesture's raw facts, read from window listeners from a press
 * to its release: where the pointer is and how fast it is going, in client
 * px and px/s over the last stretch of samples. Ported from the
 * playground's `deck-interactions/pointer.ts`.
 */
export type Drag = {
	readonly dx: number;
	readonly dy: number;
	/** px/s. */
	readonly vx: number;
	readonly vy: number;
	readonly clientX: number;
	readonly clientY: number;
	/** Since the press, in ms. */
	readonly elapsed: number;
};

type Sample = { readonly t: number; readonly x: number; readonly y: number };

/** Velocity is read over this window, and is 0 once the hand has stopped this long. */
const VELOCITY_WINDOW_MS = 80;
const STOPPED_MS = 60;

function velocityOf(samples: readonly Sample[], now: number) {
	const last = samples.at(-1);
	if (!last || now - last.t > STOPPED_MS) return { x: 0, y: 0 };
	const first =
		samples.find((sample) => last.t - sample.t <= VELOCITY_WINDOW_MS) ??
		last;
	const dt = last.t - first.t;
	if (dt <= 0) return { x: 0, y: 0 };
	return {
		x: ((last.x - first.x) / dt) * 1000,
		y: ((last.y - first.y) / dt) * 1000,
	};
}

type Handlers = {
	readonly move?: (drag: Drag) => void;
	readonly up?: (drag: Drag) => void;
	readonly cancel?: () => void;
};

/**
 * Follows the pointer that pressed in `down` until it lifts or cancels.
 * Returns a function that stops listening early.
 */
export function trackPointer(
	down: {
		readonly pointerId: number;
		readonly clientX: number;
		readonly clientY: number;
	},
	handlers: Handlers,
): () => void {
	const start = performance.now();
	const samples: Sample[] = [{ t: start, x: down.clientX, y: down.clientY }];
	const read = (event: PointerEvent): Drag => {
		const now = performance.now();
		const velocity = velocityOf(samples, now);
		return {
			dx: event.clientX - down.clientX,
			dy: event.clientY - down.clientY,
			vx: velocity.x,
			vy: velocity.y,
			clientX: event.clientX,
			clientY: event.clientY,
			elapsed: now - start,
		};
	};
	const onMove = (event: PointerEvent) => {
		if (event.pointerId !== down.pointerId) return;
		const t = performance.now();
		samples.push({ t, x: event.clientX, y: event.clientY });
		while (samples.length > 2 && t - (samples[0]?.t ?? t) > 200)
			samples.shift();
		handlers.move?.(read(event));
	};
	const onUp = (event: PointerEvent) => {
		if (event.pointerId !== down.pointerId) return;
		stop();
		handlers.up?.(read(event));
	};
	const onCancel = (event: PointerEvent) => {
		if (event.pointerId !== down.pointerId) return;
		stop();
		handlers.cancel?.();
	};
	function stop() {
		window.removeEventListener("pointermove", onMove);
		window.removeEventListener("pointerup", onUp);
		window.removeEventListener("pointercancel", onCancel);
	}
	window.addEventListener("pointermove", onMove);
	window.addEventListener("pointerup", onUp);
	window.addEventListener("pointercancel", onCancel);
	return stop;
}

/** The pick-up slop: under this, a press is still a tap. */
export const SLOP_PX = 6;
