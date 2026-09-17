import {
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

/**
 * The clock owns `t` and nothing else. Every specimen evaluates its frame
 * at that `t`, so scrub, step, pause and play show the same frame for the
 * same timestamp, and a knob redraws the frozen frame at once.
 */

export const FRAME_MS = 1000 / 60;

export const SPEEDS: readonly {
	readonly label: string;
	readonly value: number;
}[] = [
	{ label: "1×", value: 1 },
	{ label: "½×", value: 0.5 },
	{ label: "¼×", value: 0.25 },
	{ label: "⅛×", value: 0.125 },
];

/** A loop interval, in ms. */
export type Range = { readonly from: number; readonly to: number };

type State = {
	readonly t: number;
	readonly playing: boolean;
	readonly speed: number;
	readonly loop: boolean;
	readonly range: Range | null;
};

/**
 * Advances `t` by real elapsed time × speed while playing, and stops (or
 * wraps) at the end of the loop interval, or of the whole timeline. Time
 * is the only thing it touches.
 */
export function useClock(length: number) {
	const [clock, setClock] = useState<State>({
		t: 0,
		playing: false,
		speed: 1,
		loop: false,
		range: null,
	});
	const lengthRef = useRef(length);
	lengthRef.current = length;

	const clampT = (next: number) =>
		Math.max(0, Math.min(lengthRef.current, next));

	useEffect(() => {
		if (!clock.playing) return;
		// The first frame's timestamp can predate `performance.now()` read
		// here, so the first tick only sets the baseline.
		let last: number | null = null;
		let handle = requestAnimationFrame(function tick(now) {
			const dt =
				last === null ? 0 : Math.max(0, now - last) * clock.speed;
			last = now;
			setClock((current) => {
				if (!current.playing) return current;
				const max = Math.min(
					lengthRef.current,
					current.range?.to ?? lengthRef.current,
				);
				const min = Math.min(current.range?.from ?? 0, max);
				const next = current.t + dt;
				if (next < max) return { ...current, t: next };
				if (current.loop && max > min) {
					return {
						...current,
						t: min + ((next - min) % (max - min)),
					};
				}
				return { ...current, t: max, playing: false };
			});
			handle = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(handle);
	}, [clock.playing, clock.speed]);

	const t = Math.min(clock.t, length);
	const range = clock.range
		? {
				from: Math.min(clock.range.from, length),
				to: Math.min(clock.range.to, length),
			}
		: null;
	const end = range?.to ?? length;
	return {
		t,
		playing: clock.playing,
		speed: clock.speed,
		loop: clock.loop,
		range,
		atEnd: t >= length,
		seek: (next: number) =>
			setClock((c) => ({ ...c, t: clampT(next), playing: false })),
		play: () =>
			setClock((c) => ({
				...c,
				// Play from the start of the interval when it is already
				// spent, so Play after a stop is never a no-op.
				t: c.t >= end ? (range?.from ?? 0) : c.t,
				playing: true,
			})),
		pause: () => setClock((c) => ({ ...c, playing: false })),
		restart: () =>
			setClock((c) => ({ ...c, t: range?.from ?? 0, playing: true })),
		step: (frames: number) =>
			setClock((c) => ({
				...c,
				t: clampT(c.t + frames * FRAME_MS),
				playing: false,
			})),
		setSpeed: (speed: number) => setClock((c) => ({ ...c, speed })),
		setLoop: (loop: boolean) => setClock((c) => ({ ...c, loop })),
		setRange: (next: Range | null) =>
			setClock((c) => ({
				...c,
				range:
					next && next.to > next.from
						? { from: clampT(next.from), to: clampT(next.to) }
						: null,
			})),
	} as const;
}

export type Shortcuts = {
	readonly toggle: () => void;
	readonly step: (frames: number) => void;
	readonly go: (step: number) => void;
	readonly back: () => void;
};

/**
 * Space plays and pauses, the arrow keys step a frame, brackets walk the
 * catalog and Escape leaves for the index. Not while typing.
 */
export function useShortcuts(handlers: Shortcuts) {
	const ref = useRef(handlers);
	ref.current = handlers;
	useEffect(() => {
		function onKey(event: KeyboardEvent) {
			if (event.metaKey || event.ctrlKey || event.altKey) return;
			const target =
				event.target instanceof HTMLElement ? event.target : null;
			// Typing takes every key. Space and the arrows also belong to
			// whatever control has focus, since that control acts on them;
			// leaving and walking the catalog belong to the page throughout.
			const typing = target?.closest(
				'input, select, textarea, [contenteditable="true"]',
			);
			const acting = typing ?? target?.closest('button, [role="button"]');
			if (typing) return;
			if (event.key === "]") {
				event.preventDefault();
				ref.current.go(1);
				return;
			}
			if (event.key === "[") {
				event.preventDefault();
				ref.current.go(-1);
				return;
			}
			if (event.key === "Escape") {
				ref.current.back();
				return;
			}
			if (acting) return;
			if (event.key === " ") {
				event.preventDefault();
				ref.current.toggle();
			} else if (event.key === "ArrowRight") {
				event.preventDefault();
				ref.current.step(event.shiftKey ? 10 : 1);
			} else if (event.key === "ArrowLeft") {
				event.preventDefault();
				ref.current.step(event.shiftKey ? -10 : -1);
			}
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);
}

/** One rem in px, read once. Layouts in `motion.ts` are stated in rem. */
export function useRemPx(): number {
	const [px] = useState(() =>
		Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
	);
	return px;
}

/**
 * How much a specimen is scaled to fill its stage, up to `max`. The
 * workbench shows one animation at a time, so it may as well be as big as
 * the room allows — and on a narrow screen it comes down rather than spill
 * over the edge. `offsetWidth`/`offsetHeight` are layout sizes, which a
 * transform does not change, so measuring never chases its own scale.
 */
export function useFit(
	box: RefObject<HTMLElement | null>,
	specimen: RefObject<HTMLElement | null>,
	max: number,
): number {
	const [scale, setScale] = useState(1);
	useLayoutEffect(() => {
		const outer = box.current;
		const inner = specimen.current;
		if (!outer || !inner) return;
		const measure = () => {
			const room = outer.getBoundingClientRect();
			const width = inner.offsetWidth;
			const height = inner.offsetHeight;
			if (width <= 0 || height <= 0) return;
			const next = Math.min(
				max,
				room.width / width,
				room.height / height,
			);
			setScale((current) =>
				Math.abs(current - next) < 0.01 ? current : next,
			);
		};
		const observer = new ResizeObserver(measure);
		observer.observe(outer);
		observer.observe(inner);
		measure();
		return () => observer.disconnect();
	});
	return scale;
}
