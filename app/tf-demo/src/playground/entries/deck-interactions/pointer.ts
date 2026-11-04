/**
 * A pointer gesture's raw facts, read from window listeners from a press
 * to its release: how far it went, in physical and logical px, and how
 * fast it was going, in px/ms over the last stretch of samples.
 */
export type Drag = {
	readonly dx: number;
	readonly dy: number;
	/** Inline: `dx` mirrored in RTL. */
	readonly du: number;
	readonly vx: number;
	readonly vy: number;
	/** Inline velocity: `vx` mirrored in RTL. */
	readonly vu: number;
	/** Where the pointer is, in the client's px. */
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
	return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
}

export type Handlers = {
	readonly move?: (drag: Drag) => void;
	readonly up?: (drag: Drag) => void;
	readonly cancel?: () => void;
};

/**
 * Follows the pointer that pressed in `down` until it lifts or cancels.
 * Returns a function that stops listening early.
 */
export function trackPointer(
	down: { readonly pointerId: number; clientX: number; clientY: number },
	rtl: boolean,
	handlers: Handlers,
): () => void {
	const start = performance.now();
	const samples: Sample[] = [{ t: start, x: down.clientX, y: down.clientY }];
	const read = (event: PointerEvent): Drag => {
		const now = performance.now();
		const velocity = velocityOf(samples, now);
		const dx = event.clientX - down.clientX;
		const dy = event.clientY - down.clientY;
		return {
			dx,
			dy,
			du: rtl ? -dx : dx,
			vx: velocity.x,
			vy: velocity.y,
			vu: rtl ? -velocity.x : velocity.x,
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

/**
 * Counts taps: a second tap within 350 ms and 10 px of the first on the
 * same Card is a double-tap.
 */
export function createTapCounter(windowMs = 350, radius = 10) {
	let last: {
		readonly id: string;
		readonly x: number;
		readonly y: number;
		readonly t: number;
	} | null = null;
	return (id: string, x: number, y: number): 1 | 2 => {
		const t = performance.now();
		const double =
			last !== null &&
			last.id === id &&
			t - last.t <= windowMs &&
			Math.hypot(x - last.x, y - last.y) <= radius;
		last = double ? null : { id, x, y, t };
		return double ? 2 : 1;
	};
}

/** Where a pointer is in the Deck's frame, in logical px. */
export function framePoint(
	element: Element,
	clientX: number,
	clientY: number,
	rtl: boolean,
): { readonly u: number; readonly v: number } {
	const frame = element.closest("[data-deck-frame]") ?? element;
	const box = frame.getBoundingClientRect();
	return {
		u: rtl ? box.right - clientX : clientX - box.left,
		v: clientY - box.top,
	};
}
