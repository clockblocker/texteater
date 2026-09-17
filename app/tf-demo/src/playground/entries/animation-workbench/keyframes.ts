/**
 * KEYFRAMES — derived, never declared.
 *
 * A scene is a pure function of time, so its keyframes are a property of
 * that function: the instants at which some channel of the frame starts
 * moving, comes to rest, or turns around, and the instants at which a
 * discrete channel (an edge, a border colour, a label) changes. Nothing
 * here knows what the scene is about; it samples `frameAt` along the
 * timeline, flattens each frame into channels, and reads the events off
 * the samples. The values shown at a key are evaluated exactly at that
 * instant, not read from the samples.
 */

export type Sample = number | string;

export type ChannelKind = "number" | "discrete";

export type Channel = {
	/** The dotted path into the frame: `box.left`, `cards.2.scale`. */
	readonly path: string;
	readonly kind: ChannelKind;
};

export type HitEvent = "start" | "stop" | "peak" | "change";

export type Hit = {
	readonly path: string;
	readonly event: HitEvent;
};

export type Keyframe = {
	/** The instant, in ms. */
	readonly at: number;
	/** The channels that do something here, in channel order. */
	readonly hits: readonly Hit[];
	/** Every channel's value at this instant. */
	readonly values: Readonly<Record<string, Sample>>;
};

export type Keyframes = {
	/** The channels that move at all, in the order the frame lists them. */
	readonly channels: readonly Channel[];
	/** The keys, in time order; always at least the start and the end. */
	readonly keys: readonly Keyframe[];
};

/* -------------------------------------------------------------- flatten */

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

/**
 * A frame as a flat list of channels. Numbers are numeric channels;
 * strings, booleans and null are discrete. Objects and arrays are walked;
 * anything else (a function, a symbol) is ignored.
 */
export function flatten(
	frame: unknown,
	prefix = "",
	into: Map<string, Sample> = new Map(),
): Map<string, Sample> {
	if (typeof frame === "number") {
		into.set(prefix, Number.isFinite(frame) ? frame : "NaN");
	} else if (typeof frame === "string") {
		into.set(prefix, frame);
	} else if (typeof frame === "boolean") {
		into.set(prefix, frame ? "true" : "false");
	} else if (frame === null) {
		into.set(prefix, "null");
	} else if (Array.isArray(frame)) {
		frame.forEach((item, index) => {
			flatten(
				item,
				prefix ? `${prefix}.${index.toString()}` : index.toString(),
				into,
			);
		});
	} else if (isRecord(frame)) {
		for (const [key, value] of Object.entries(frame)) {
			flatten(value, prefix ? `${prefix}.${key}` : key, into);
		}
	}
	return into;
}

/* --------------------------------------------------------------- derive */

/** How many samples the timeline is cut into, at most. */
const MAX_SAMPLES = 600;

/**
 * A step smaller than this share of a channel's range is rest. Springs
 * ring at ever smaller amplitudes; this is where they count as settled.
 */
const REST_SHARE = 1e-4;

/**
 * A channel within this share of its range of a resting value has not
 * left it: Motion's own settle tolerance, scaled.
 */
const NEAR_SHARE = 1e-3;

/**
 * Stillness shorter than this is not a hold, and a channel that has not
 * perceptibly moved for less than this has not been delayed: an
 * ease-in-out creeps for its first 50 ms, and that is still its start.
 * Five frames at 60 Hz.
 */
const MIN_REST_MS = 80;

/**
 * A turn counts only when the channel travels this share of its range
 * on either side of it: the overshoot of a spring shows, its final
 * tremor does not.
 */
const PROMINENCE_SHARE = 0.01;

/**
 * Events closer together than this share of the timeline are one key:
 * two eases that end at the same instant reach rest a sample apart.
 */
const MERGE_SHARE = 0.015;

type Event = { readonly index: number; readonly hit: Hit };

/** The index of the largest (`sign` 1) or smallest value in `[from, to]`. */
function extremum(
	values: readonly number[],
	from: number,
	to: number,
	sign: number,
): number {
	let best = from;
	for (let i = from; i <= to; i += 1) {
		if (sign * ((values[i] ?? 0) - (values[best] ?? 0)) > 0) best = i;
	}
	return best;
}

/**
 * Every turn of the track, start and end included, in time order and
 * alternating between highs and lows. A step smaller than `rest` does not
 * count as a direction, so a flat stretch neither starts nor ends a turn.
 */
function turnsOf(values: readonly number[], rest: number): number[] {
	const turns = [0];
	let direction = 0;
	let since = 0;
	for (let i = 1; i < values.length; i += 1) {
		const delta = (values[i] ?? 0) - (values[i - 1] ?? 0);
		if (Math.abs(delta) <= rest) continue;
		const sign = Math.sign(delta);
		if (direction !== 0 && sign !== direction) {
			const at = extremum(values, since, i - 1, direction);
			turns.push(at);
			since = at;
		}
		direction = sign;
	}
	const last = values.length - 1;
	if (turns[turns.length - 1] !== last) turns.push(last);
	return turns;
}

/**
 * Drop turns that do not stand out by `prominence` on both sides, weakest
 * first. Turns alternate between highs and lows, so a dropped one leaves
 * two of a kind side by side: the lesser of that pair goes with it, unless
 * it is the start or the end, which always stay.
 */
function prune(
	values: readonly number[],
	turns: number[],
	prominence: number,
): number[] {
	const at = (i: number) => values[turns[i] ?? 0] ?? 0;
	for (;;) {
		let weakest = -1;
		let least = prominence;
		for (let i = 1; i < turns.length - 1; i += 1) {
			const stand = Math.min(
				Math.abs(at(i) - at(i - 1)),
				Math.abs(at(i) - at(i + 1)),
			);
			if (stand < least) {
				least = stand;
				weakest = i;
			}
		}
		if (weakest < 0) return turns;
		const before = weakest - 1;
		const after = weakest + 1;
		const isEnd = (i: number) => i === 0 || i === turns.length - 1;
		/*
		 * Which of the pair stands: the one further out, so an overshoot
		 * outlives the value it rings around. `up` is 1 when the weak turn
		 * is a high, and its neighbours are then lows.
		 */
		const up = Math.sign(at(weakest) - at(before)) || 1;
		const drop = isEnd(before)
			? isEnd(after)
				? null
				: after
			: isEnd(after)
				? before
				: up * (at(after) - at(before)) >= 0
					? after
					: before;
		turns.splice(weakest, 1);
		if (drop !== null) turns.splice(drop > weakest ? drop - 1 : drop, 1);
	}
}

function numericEvents(
	path: string,
	values: readonly number[],
	minRest: number,
): readonly Event[] {
	let min = Number.POSITIVE_INFINITY;
	let max = Number.NEGATIVE_INFINITY;
	for (const value of values) {
		if (value < min) min = value;
		if (value > max) max = value;
	}
	const range = max - min;
	if (!(range > 0)) return [];
	const near = range * NEAR_SHARE;
	const turns = prune(
		values,
		turnsOf(values, range * REST_SHARE),
		range * PROMINENCE_SHARE,
	);
	const last = values.length - 1;

	const events: Event[] = [];
	const push = (index: number, event: HitEvent) => {
		events.push({ index, hit: { path, event } });
	};
	/* the last sample still at rest after `from`, before the track leaves it */
	const leaves = (from: number, to: number) => {
		const base = values[from] ?? 0;
		let i = from;
		while (i < to && Math.abs((values[i + 1] ?? base) - base) <= near)
			i += 1;
		return i;
	};
	/* the first sample at rest before `to`, once the track has arrived */
	const arrives = (from: number, to: number) => {
		const base = values[to] ?? 0;
		let i = to;
		while (i > from && Math.abs((values[i - 1] ?? base) - base) <= near)
			i -= 1;
		return i;
	};

	turns.forEach((turn, n) => {
		const next = turns[n + 1];
		if (next === undefined) return;
		const off = leaves(turn, next);
		if (n === 0) {
			/*
			 * The start: at the timeline's own start, unless the channel
			 * waits out a delay worth naming. An ease barely moves over its
			 * first few ms, and that is not a delay.
			 */
			push(off - turn >= minRest ? off : turn, "start");
		} else if (off - turn >= minRest) {
			/* a hold: the turn was a settle, and motion resumes later */
			push(turn, "stop");
			push(off, "start");
		} else {
			push(turn, "peak");
		}
		if (next === last) {
			/*
			 * The last stretch always ends in a settle: where the track
			 * arrives, or the end of the timeline for a spring still
			 * creeping toward its target when the preview stops. A settle
			 * in the last few ms is the end, not a moment of its own.
			 */
			const on = arrives(off, last);
			push(last - on >= minRest ? on : last, "stop");
		}
	});
	return events;
}

function discreteEvents(
	path: string,
	values: readonly Sample[],
): readonly Event[] {
	const events: Event[] = [];
	for (let i = 1; i < values.length; i += 1) {
		if (values[i] !== values[i - 1]) {
			events.push({ index: i, hit: { path, event: "change" } });
		}
	}
	return events;
}

/**
 * The keyframes of `frameAt` over `[0, length]`. Channels that never move
 * are left out; events closer together than the merge window are one
 * key. The start and the end are always keys.
 */
export function deriveKeyframes(
	frameAt: (t: number) => unknown,
	length: number,
): Keyframes {
	const span = Math.max(0, length);
	const count = Math.max(2, Math.min(MAX_SAMPLES, Math.ceil(span) + 1));
	const step = span / (count - 1);
	const times = Array.from({ length: count }, (_, i) =>
		i === count - 1 ? span : i * step,
	);
	const samples = times.map((t) => flatten(frameAt(t)));
	const minRest = Math.max(2, Math.round(MIN_REST_MS / Math.max(step, 1e-9)));

	/* channel order is the first frame's order */
	const first = samples[0] ?? new Map<string, Sample>();
	const paths = [...first.keys()];
	const tracks = new Map<string, Sample[]>(
		paths.map((path) => [
			path,
			samples.map((sample) => sample.get(path) ?? "undefined"),
		]),
	);

	const events: Event[] = [];
	const channels: Channel[] = [];
	for (const path of paths) {
		const track = tracks.get(path) ?? [];
		const numeric = track.every((value) => typeof value === "number");
		const found = numeric
			? numericEvents(path, track as number[], minRest)
			: discreteEvents(path, track);
		if (found.length === 0) continue;
		channels.push({ path, kind: numeric ? "number" : "discrete" });
		events.push(...found);
	}

	/*
	 * Cluster events closer than the merge window. A discrete change is
	 * visible only from the sample where the new value holds, so a cluster
	 * with a change sits at its latest change. Otherwise a cluster sits at
	 * its earliest start or turn, which are sharp; a cluster of stops alone
	 * takes its latest, since an ease is at rest only once the last of
	 * them is. Clusters at either end snap onto it, and both ends are
	 * always keys.
	 */
	const order = new Map(channels.map((c, i) => [c.path, i]));
	const rank = (hit: Hit) => order.get(hit.path) ?? 0;
	const window = Math.max(1, Math.round(count * MERGE_SHARE));
	const sorted = [...events].sort((a, b) => a.index - b.index);
	const byIndex = new Map<number, Hit[]>();
	byIndex.set(0, []);
	byIndex.set(count - 1, []);
	let cluster: Event[] = [];
	const flush = () => {
		if (cluster.length === 0) return;
		const changes = cluster.filter((e) => e.hit.event === "change");
		const sharp = cluster.filter((e) => e.hit.event !== "stop");
		let index =
			changes.length > 0
				? Math.max(...changes.map((e) => e.index))
				: sharp.length > 0
					? Math.min(...sharp.map((e) => e.index))
					: Math.max(...cluster.map((e) => e.index));
		if (changes.length === 0) {
			if (index <= window) index = 0;
			else if (index >= count - 1 - window) index = count - 1;
		}
		const hits = byIndex.get(index);
		const found = cluster.map((e) => e.hit);
		if (hits) hits.push(...found);
		else byIndex.set(index, found);
		cluster = [];
	};
	for (const event of sorted) {
		const head = cluster[0];
		if (head && event.index - head.index > window) flush();
		cluster.push(event);
	}
	flush();
	for (const [index, hits] of byIndex) {
		byIndex.set(
			index,
			[...hits].sort((a, b) => rank(a) - rank(b)),
		);
	}

	const keys: Keyframe[] = [...byIndex.entries()]
		.sort(([a], [b]) => a - b)
		.map(([index, hits]) => {
			const at = times[index] ?? 0;
			const exact = flatten(frameAt(at));
			const values: Record<string, Sample> = {};
			for (const channel of channels) {
				values[channel.path] = exact.get(channel.path) ?? "undefined";
			}
			return { at, hits, values };
		});

	return { channels, keys };
}

/** The key at or before `t`; the first one before the timeline starts. */
export function keyAt(keys: readonly Keyframe[], t: number): number {
	let index = 0;
	keys.forEach((key, i) => {
		if (key.at <= t + 1e-6) index = i;
	});
	return index;
}

/** A value as the keyframe table shows it. */
export function formatSample(value: Sample): string {
	if (typeof value === "string") return value;
	const magnitude = Math.abs(value);
	const text =
		magnitude >= 100
			? value.toFixed(0)
			: magnitude >= 10
				? value.toFixed(1)
				: value.toFixed(3);
	return text.includes(".") ? text.replace(/\.?0+$/, "") : text;
}

const EVENT_WORD: Record<HitEvent, string> = {
	start: "starts",
	stop: "settles",
	peak: "turns",
	change: "changes",
};

/** One key's hits as a sentence fragment: `scale turns · box.left settles`. */
export function describeHits(hits: readonly Hit[]): string {
	return hits
		.map((hit) => `${hit.path} ${EVENT_WORD[hit.event]}`)
		.join(" · ");
}
