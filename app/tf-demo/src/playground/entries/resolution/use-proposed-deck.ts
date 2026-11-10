import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { DECK_OF_CARDS, DEFAULT_TURN } from "tabletop/core";
import type { TableHandle } from "tabletop/react";
import { dealLandsAt, deckMoves } from "./deal-moves";
import {
	type DeckState,
	type DeckSteps,
	deckPlan,
	ROLES,
	type Role,
} from "./deck-plan";
import type { SessionEvent } from "./fake-convex";
import type { Knobs } from "./knobs";
import { bodyId, type DeckLayout, PANE } from "./proposed-scene";
import { type SessionState, sessionTimeline } from "./session";
import type { StoryStatus } from "./stored-notes";
import { type Story, storyAt, storyWords } from "./stories";
import { sentenceIndexOf, storySteps } from "./story-notes";

/**
 * #1309 Q6: a reduced deal dissolves in 200 ms. A reduced turn is a 140 ms
 * crossfade, but the Card it turns into is another size, so it dissolves
 * there for as long.
 */
const REDUCED = { landMs: 200, turnMs: 200 };

/** One click's Deck: its story, and how far its plan has played. */
export type Run = {
	readonly id: string;
	readonly story: Story;
	readonly clicked: number;
	/** The Deck as shown; `null` until it is dealt. */
	readonly shown: DeckState | null;
	/** The front Card's Note, as tall as it lays out, in px. */
	readonly noteHeight: number | null;
	/**
	 * How long after its face showed the front Card's Blocks start to
	 * arrive, in ms: once the move that showed it has landed. `null` while
	 * it lies face down.
	 */
	readonly arriveAfter: number | null;
};

type Scene = {
	readonly run: Run | null;
	/** Decks another click swept, still flying off. */
	readonly leaving: readonly Run[];
	/** The state about to be shown, laid out unseen so its Note can be measured. */
	readonly measuring: { readonly run: Run; readonly state: DeckState } | null;
	readonly status: ReadonlyMap<string, StoryStatus>;
	readonly announcement: string;
};

const EMPTY: Scene = {
	run: null,
	leaving: [],
	measuring: null,
	status: new Map(),
	announcement: "",
};

function stepsOf(story: Story): DeckSteps {
	const steps = storySteps(story);
	return { ...steps, attestationAtClick: story.members.length > 1 };
}

export function layoutOf(run: Run): DeckLayout | null {
	return run.shown
		? {
				id: run.id,
				cards: run.shown.cards,
				faceUp: run.shown.faceUp,
				noteHeight: run.noteHeight,
			}
		: null;
}

/**
 * Proposed's Deck: a click starts a fake Session and plays its plan
 * through the Table. Every change of the Deck is one commit, measured
 * before it is shown, so each Card moves from where it showed; the front
 * Card's turn is cued on the deal's own clock.
 */
export function useProposedDeck(
	table: TableHandle,
	knobs: Knobs,
	reduced: boolean,
	onState: (event: SessionEvent) => void,
) {
	const [scene, setScene] = useState<Scene>(EMPTY);
	const latest = useRef({ scene, knobs, reduced, onState });
	latest.current = { scene, knobs, reduced, onState };
	/** The Deck in play, ahead of the render that shows it. */
	const current = useRef<Run | null>(null);
	const measure = useRef<HTMLDivElement>(null);
	const timers = useRef<number[]>([]);
	const dealt = useRef(0);
	/** The run whose deal has landed, and the states its landing lets through. */
	const landed = useRef<string | null>(null);
	const held = useRef<DeckState[]>([]);

	const clearTimers = useCallback(() => {
		for (const timer of timers.current) window.clearTimeout(timer);
		timers.current = [];
	}, []);
	useEffect(() => clearTimers, [clearTimers]);

	/** Shows `next`, each Card moving from where it showed. */
	const show = useCallback(
		(runId: string, next: DeckState) => {
			const { knobs: k, reduced: still } = latest.current;
			const run = current.current;
			if (!run || run.id !== runId) return;
			const before = run.shown;
			/* a turn waits for the deal's landing frame */
			if (
				before &&
				next.faceUp &&
				!before.faceUp &&
				landed.current !== runId
			) {
				held.current.push(next);
				return;
			}
			flushSync(() =>
				setScene((s) => ({ ...s, measuring: { run, state: next } })),
			);
			const noteHeight = measure.current?.offsetHeight ?? null;
			const turnMs = still ? REDUCED.turnMs : DEFAULT_TURN.ms;
			const styleOf = deckMoves({
				before,
				after: next,
				feel: k.feel,
				turnMs,
				word: wordBox(),
				reduced: still,
				slotOf: (role) =>
					table.slotRect(`${PANE}:${bodyId(runId, role)}`),
			});
			const shown: Run = {
				...run,
				shown: next,
				noteHeight,
				arriveAfter: arrivesAfter(run, next, turnMs, k.feel.becoming),
			};
			current.current = shown;
			table.transact(
				() =>
					setScene((s) => ({
						...s,
						measuring: null,
						run: shown,
						announcement: announce(run, next) ?? s.announcement,
					})),
				(id) => {
					const role = ROLES.find(
						(candidate) => bodyId(runId, candidate) === id,
					);
					return role ? styleOf(role) : undefined;
				},
			);
			if (!before)
				table.cue(dealLandsAt(next.cards.length), () => {
					landed.current = runId;
					const waiting = held.current;
					held.current = [];
					for (const state of waiting) show(runId, state);
				});
		},
		[table],
	);

	/** Starts `story`'s Session: its plan's states and its phases, each at its time. */
	const start = useCallback(
		(run: Run, outcome: Knobs["outcome"], from = 0) => {
			const { knobs: k, reduced: still } = latest.current;
			const slow = 1 / Math.max(0.05, k.timeScale);
			const timeline = sessionTimeline({ ...k, outcome });
			const plan = deckPlan({
				timeline,
				steps: stepsOf(run.story),
				feel: k.feel,
				motion: still
					? REDUCED
					: {
							landMs: DECK_OF_CARDS.move.ms,
							turnMs: DEFAULT_TURN.ms,
						},
			});
			const later = (at: number, fn: () => void) => {
				timers.current.push(
					window.setTimeout(fn, Math.max(0, at - from) * slow),
				);
			};
			const report = (state: SessionState) => {
				latest.current.onState({
					requestId: run.id,
					story: run.story,
					state,
					now: performance.now(),
				});
				const stands = statusAt(state);
				if (stands)
					setScene((s) => ({
						...s,
						status: new Map(s.status).set(run.story.key, stands),
					}));
			};
			for (const state of timeline)
				if (state.at >= from) later(state.at, () => report(state));
			for (const state of plan)
				if (state.at >= from)
					later(state.at, () => show(run.id, state));
		},
		[show],
	);

	/** A click on a word: its Deck is dealt; the Deck another word left is swept away. */
	const select = useCallback(
		(sentenceId: string, clicked: number) => {
			const sentence = sentenceIndexOf(sentenceId);
			const story = sentence === null ? null : storyAt(sentence, clicked);
			const { scene: now, knobs: k } = latest.current;
			const old = current.current;
			/* the word whose Deck is live deals nothing again */
			if (!story || old?.story.key === story.key) return;
			clearTimers();
			held.current = [];
			const run: Run = {
				id: `deck-${++dealt.current}`,
				story,
				clicked,
				shown: null,
				noteHeight: null,
				arriveAfter: null,
			};
			current.current = run;
			if (old?.shown) sweep(table, old, setScene);
			setScene((s) => ({
				...s,
				run,
				leaving: old?.shown ? [...s.leaving, old] : s.leaving,
			}));
			start(
				run,
				now.status.get(story.key) === "Attested" ? "Stored" : k.outcome,
			);
		},
		[clearTimers, start, table],
	);

	/** Retry: the failed Session runs again from its first result, and commits. */
	const retry = useCallback(() => {
		const run = current.current;
		if (run?.shown?.phase !== "Failed") return;
		clearTimers();
		start(run, "Complete", latest.current.knobs.latencies.selection);
	}, [clearTimers, start]);

	return useMemo(
		() => ({ scene, select, retry, measure }),
		[scene, select, retry],
	);
}

/**
 * How long after `next` shows the front Card's face its Blocks start to
 * arrive: once the deal or the turn that showed it has landed, and its
 * growth too when that follows the turn.
 */
function arrivesAfter(
	run: Run,
	next: DeckState,
	turnMs: number,
	becoming: Knobs["feel"]["becoming"],
): number | null {
	if (!next.faceUp) return null;
	if (run.shown?.faceUp) return run.arriveAfter;
	if (!run.shown) return dealLandsAt(next.cards.length);
	return turnMs + (becoming === "turn-then-grow" ? DECK_OF_CARDS.move.ms : 0);
}

/** What a change of the Deck tells a screen reader, if anything. */
function announce(run: Run, next: DeckState): string | null {
	if (next.phase === "Failed")
		return `${storyWords(run.story)} could not be resolved.`;
	return next.faceUp && !run.shown?.faceUp
		? `${run.story.lemma.canonicalForm} is ready.`
		: null;
}

function statusAt({ phase }: SessionState): StoryStatus | null {
	switch (phase) {
		case "Clicked":
			return null;
		case "Failed":
			return "PermanentFailure";
		case "Committed":
		case "Stored":
			return "Attested";
		default:
			return "Active";
	}
}

/** The clicked word's box in the text, client px. */
function wordBox() {
	const rect = document
		.querySelector<HTMLElement>(
			'[data-resolution-surface] [data-slot="reader-segment"][aria-pressed="true"]',
		)
		?.getBoundingClientRect();
	return rect
		? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
		: null;
}

/**
 * The Deck another click left flies off toward inline-start, as the app's
 * sweep does, and is forgotten once it has gone.
 */
function sweep(
	table: TableHandle,
	old: Run,
	setScene: (next: (scene: Scene) => Scene) => void,
) {
	const rtl =
		document
			.querySelector("[data-resolution-surface]")
			?.getAttribute("dir") === "rtl";
	const flights = (old.shown?.cards ?? []).map((role: Role) =>
		table.leave(bodyId(old.id, role), {
			velocity: { x: rtl ? 900 : -900, y: 0 },
		}),
	);
	const forget = () =>
		setScene((s) => ({
			...s,
			leaving: s.leaving.filter(({ id }) => id !== old.id),
		}));
	void Promise.all(flights).then(forget);
}
