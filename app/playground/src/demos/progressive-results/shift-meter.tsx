import { type RefObject, useEffect, useState } from "react";

type Sample = { readonly t: number; readonly height: number };

export type Shifts = {
	/** Separate moves of the front Card's top edge since the run began. */
	readonly frontMoves: number;
	/** Separate changes of the stack's height since the run began. */
	readonly heightChanges: number;
	readonly trace: readonly Sample[];
};

const none: Shifts = { frontMoves: 0, heightChanges: 0, trace: [] };

/** A change counts as one move until the value rests this long. */
const restMs = 80;
const sampleMs = 30;
/** Stop watching this long after the last change. */
const watchMs = 12_000;

/** The front Card's top and the stack's height, as the eye sees them. */
function measure(box: HTMLElement): {
	readonly frontTop: number | null;
	readonly deckHeight: number;
} {
	const origin = box.getBoundingClientRect().top;
	const front = box.querySelector("[data-front]")?.getBoundingClientRect();
	const deck = box.querySelector("[data-deck]")?.getBoundingClientRect();
	return {
		frontTop: front ? front.top - origin : null,
		deckHeight: deck?.height ?? 0,
	};
}

/**
 * Splits a sampled value's changes into episodes: a stream of changes
 * with no rest of `restMs` between them is one episode.
 */
function episodes(): (
	value: number | null,
	now: number,
) => { readonly began: boolean; readonly moving: boolean } {
	let last: number | null = null;
	let moving = false;
	let changedAt = 0;
	return (value, now) => {
		const changed =
			value !== null && last !== null && Math.abs(value - last) > 0.5;
		if (value !== null) last = value;
		if (changed) {
			const began = !moving;
			moving = true;
			changedAt = now;
			return { began, moving };
		}
		if (now - changedAt > restMs) moving = false;
		return { began: false, moving: false };
	};
}

/**
 * Watches the stack inside `root` from `startedAt` on: the top edge of its
 * `[data-front]` element and the height of `[data-deck]`, both as the eye
 * sees them, transforms included. A stream of small changes during one
 * animation counts as one move.
 */
export function useShifts(
	root: RefObject<HTMLElement | null>,
	run: number,
	startedAt: number,
): Shifts {
	const [shifts, setShifts] = useState<Shifts>(none);

	useEffect(() => {
		setShifts(none);
		if (run === 0) return;
		const front = episodes();
		const height = episodes();
		let lastHeight: number | null = null;
		let lastChange = performance.now();
		let current = none;

		const timer = setInterval(() => {
			const now = performance.now();
			const box = root.current;
			if (!box || now - lastChange > watchMs) return;
			const { frontTop, deckHeight } = measure(box);
			const frontStep = front(frontTop, now);
			const heightStep = height(deckHeight, now);
			if (frontStep.moving || heightStep.moving) lastChange = now;
			let next = current;
			if (frontStep.began)
				next = { ...next, frontMoves: next.frontMoves + 1 };
			if (heightStep.began)
				next = { ...next, heightChanges: next.heightChanges + 1 };
			if (deckHeight !== lastHeight) {
				const sample = { t: now - startedAt, height: deckHeight };
				next = { ...next, trace: [...next.trace, sample] };
				lastHeight = deckHeight;
			}
			if (next !== current) {
				current = next;
				setShifts(next);
			}
		}, sampleMs);
		return () => clearInterval(timer);
	}, [root, run, startedAt]);

	return shifts;
}

/**
 * The stack's height over the run, as a step line. A flat line is a stack
 * that never jumped.
 */
export function HeightTrace({
	trace,
	until,
}: {
	readonly trace: readonly Sample[];
	/** The time the x axis ends at, in ms. */
	readonly until: number;
}) {
	const width = 120;
	const plot = 22;
	const max = Math.max(1, ...trace.map((sample) => sample.height));
	const end = Math.max(until, trace.at(-1)?.t ?? 0, 1);
	const x = (t: number) => (Math.max(0, t) / end) * width;
	const y = (h: number) => 1 + plot - (h / max) * plot;
	let path = "";
	for (const [index, sample] of trace.entries()) {
		path +=
			index === 0
				? `M0 ${y(sample.height)} H${x(sample.t)}`
				: ` H${x(sample.t)} V${y(sample.height)}`;
	}
	if (trace.length > 0) path += ` H${width}`;
	const last = trace.at(-1)?.height ?? 0;

	return (
		<svg
			role="img"
			aria-label={`Stack height over the run, ending at ${Math.round(last)} px`}
			viewBox={`0 0 ${width} ${plot + 2}`}
			className="h-6 w-[120px] shrink-0 overflow-visible rtl:-scale-x-100"
		>
			<title>Stack height: {Math.round(last)} px</title>
			<line
				x1={0}
				x2={width}
				y1={plot + 1}
				y2={plot + 1}
				className="stroke-line"
				strokeWidth={1}
			/>
			<path
				d={path}
				fill="none"
				className="stroke-link"
				strokeWidth={2}
				strokeLinejoin="round"
				strokeLinecap="round"
			/>
		</svg>
	);
}
