import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type CardKind,
	cardKinds,
	type FakeCard,
	type FakeResolution,
	type FixtureWord,
	resolveWord,
} from "@/fixtures";

/**
 * One pipeline stage per Card kind. A stage first has something to show
 * (its heading: title, emoji, caption) and later settles: its whole Card,
 * nothing at all, or an error. `useFakeResolution` reveals whole Cards
 * only, so this local hook adds the in-between step and the two other
 * endings the strategies need.
 */
export type StageState =
	| { readonly status: "waiting" }
	| { readonly status: "partial"; readonly card: FakeCard }
	| { readonly status: "ready"; readonly card: FakeCard }
	| { readonly status: "empty" }
	| { readonly status: "failed" };

type Stages = Readonly<Record<CardKind, StageState>>;

/** ms after the click, at speed ×1: heading arrives, then the stage settles. */
const timings: Readonly<
	Record<CardKind, { readonly arrive: number; readonly settle: number }>
> = {
	Attestation: { arrive: 200, settle: 450 },
	Surface: { arrive: 550, settle: 1000 },
	Lemma: { arrive: 900, settle: 1600 },
	Reading: { arrive: 1400, settle: 2600 },
};

/** The stage that fails when the toggle is on. */
export const failingKind: CardKind = "Lemma";

const waitingStages: Stages = {
	Attestation: { status: "waiting" },
	Surface: { status: "waiting" },
	Lemma: { status: "waiting" },
	Reading: { status: "waiting" },
};

/**
 * A word already in its base form has no Surface of its own: Bahnhof and
 * Bank are their lemmas, so that stage settles empty.
 */
function isEmpty(card: FakeCard, cards: readonly FakeCard[]): boolean {
	if (card.kind !== "Surface") return false;
	const lemma = cards.find((other) => other.kind === "Lemma")?.title ?? "";
	const bare = lemma.replace(/^(der|die|das) /i, "").toLowerCase();
	return card.title.toLowerCase() === bare;
}

export type StagedLookup = {
	readonly resolution: FakeResolution | null;
	readonly stages: Stages;
	/** `performance.now()` when this run started. */
	readonly startedAt: number;
	/** When every stage had settled, ms after the start, or null. */
	readonly settledAfter: number | null;
	/** Bumps on every new run, for anything that restarts with it. */
	readonly run: number;
	readonly retry: (kind: CardKind) => void;
};

/**
 * Resolves `lookup` and plays its stages out at `speed` (a delay
 * multiplier). A new lookup, speed, failure setting or `replay` count
 * starts the run over. The delays are data, not motion, so reduced motion
 * leaves them alone.
 */
export function useStagedLookup(
	lookup: FixtureWord | string | null,
	{
		speed,
		fail,
		replay,
	}: {
		readonly speed: number;
		readonly fail: boolean;
		/** Any new value starts the run over. */
		readonly replay: string;
	},
): StagedLookup {
	const key =
		lookup === null
			? null
			: typeof lookup === "string"
				? lookup
				: lookup.id;
	const resolution = useMemo(
		() => (lookup === null ? null : resolveWord(lookup)),
		[key],
	);
	const [state, setState] = useState({
		run: 0,
		startedAt: 0,
		stages: waitingStages,
		settledAfter: null as number | null,
	});
	const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

	const later = useCallback((ms: number, step: () => void) => {
		const timer = setTimeout(() => {
			timers.current.delete(timer);
			step();
		}, ms);
		timers.current.add(timer);
	}, []);

	const setStage = useCallback((kind: CardKind, stage: StageState) => {
		setState((previous) => {
			const stages = { ...previous.stages, [kind]: stage };
			const settled = cardKinds.every((each) => {
				const status = stages[each].status;
				return status !== "waiting" && status !== "partial";
			});
			return {
				...previous,
				stages,
				settledAfter:
					settled && previous.settledAfter === null
						? performance.now() - previous.startedAt
						: previous.settledAfter,
			};
		});
	}, []);

	useEffect(() => {
		const startedAt = performance.now();
		setState((previous) => ({
			run: previous.run + 1,
			startedAt,
			stages: waitingStages,
			settledAfter: null,
		}));
		if (resolution === null) return;
		const own = timers.current;
		for (const card of resolution.cards) {
			const { arrive, settle } = timings[card.kind];
			const empty = isEmpty(card, resolution.cards);
			const failing = fail && card.kind === failingKind;
			// Only a stage that will show something shows its heading first.
			if (!empty && !failing)
				later(arrive * speed, () =>
					setStage(card.kind, { status: "partial", card }),
				);
			later(settle * speed, () =>
				setStage(
					card.kind,
					empty
						? { status: "empty" }
						: failing
							? { status: "failed" }
							: { status: "ready", card },
				),
			);
		}
		return () => {
			for (const timer of own) clearTimeout(timer);
			own.clear();
		};
	}, [resolution, speed, fail, replay, later, setStage]);

	const retry = useCallback(
		(kind: CardKind) => {
			const card = resolution?.cards.find((each) => each.kind === kind);
			if (!card) return;
			const { arrive, settle } = timings[kind];
			setState((previous) => ({ ...previous, settledAfter: null }));
			setStage(kind, { status: "waiting" });
			later((settle - arrive) * 0.5 * speed, () =>
				setStage(kind, { status: "partial", card }),
			);
			later((settle - arrive) * speed, () =>
				setStage(kind, { status: "ready", card }),
			);
		},
		[resolution, speed, later, setStage],
	);

	return { resolution, ...state, retry };
}
