import type { Feel } from "./knobs";
import {
	reachedAt,
	type SessionPhase,
	type SessionState,
	stateAt,
} from "./session";

/**
 * Proposed's plan, pure: which Card of a click's Deck is dealt when, and
 * when the front Card shows its face, from the fake Session's timeline and
 * the decisions under study. The stage plays it; nothing here moves.
 */

/** A click's Cards, back to front (tf-demo ADR 0011). */
export const ROLES = ["Attestation", "Surface", "Lemma", "Reading"] as const;
export type Role = (typeof ROLES)[number];

/** Which of a story's Cards say something, and what is known at the click. */
export type DeckSteps = {
	/** The stored unit is more than the clicked word: known at the click. */
	readonly attestationAtClick: boolean;
	/** The Attestation says something once Grammar has read the words. */
	readonly attestation: boolean;
	readonly surface: boolean;
	readonly lemma: boolean;
};

/** How long the moves the plan waits out take, in ms. */
type PlanMotion = {
	/** A deal, from its start to its landing. */
	readonly landMs: number;
	/** A turn face up. */
	readonly turnMs: number;
};

/** The Deck as it stands from `at` ms after the click. */
export type DeckState = {
	readonly at: number;
	/** What the Session knows by then: what the faces show. */
	readonly phase: SessionPhase;
	/** The Cards dealt so far, back to front. */
	readonly cards: readonly Role[];
	/** Whether the front Card shows its face; it is dealt face down otherwise. */
	readonly faceUp: boolean;
};

type PlanInput = {
	readonly timeline: readonly SessionState[];
	readonly steps: DeckSteps;
	readonly feel: Pick<
		Feel,
		"dealWhen" | "thresholdMs" | "surfaceWhen" | "turnUp" | "failure"
	>;
	readonly motion: PlanMotion;
};

/**
 * When the front Card has a face to show: its Knowledge, its commit when it
 * turns up only then, or a stored route's answer. `null` for a Session
 * that fails.
 */
function answerAt({ timeline, feel }: PlanInput): number | null {
	return (
		reachedAt(timeline, "Stored") ??
		reachedAt(
			timeline,
			feel.turnUp === "commit" ? "Committed" : "Knowledge",
		)
	);
}

/**
 * When the Deck is dealt (#1316). After the threshold: an answer inside it
 * deals the Deck when it lands, face up; a slower one deals it as the
 * threshold passes, face down. Otherwise at the click, or as the selection
 * returns.
 */
function dealtAt(input: PlanInput): number {
	const { timeline, feel } = input;
	const answer = answerAt(input);
	switch (feel.dealWhen) {
		case "click":
			return 0;
		case "selection":
			return (
				reachedAt(timeline, "Selected") ??
				reachedAt(timeline, "Stored") ??
				0
			);
		case "threshold":
			return answer !== null && answer <= feel.thresholdMs
				? answer
				: feel.thresholdMs;
	}
}

/**
 * When the front Card shows its face: with its deal when its answer is
 * already in, else as the answer lands and never before the deal has. A
 * failed Session's turns up only to show the failure. `null`: never.
 */
function facesUpAt(input: PlanInput, dealAt: number): number | null {
	const { timeline, feel, motion } = input;
	const answer = answerAt(input);
	const landedAt = dealAt + motion.landMs;
	if (answer !== null)
		return answer <= dealAt ? dealAt : Math.max(answer, landedAt);
	const failed = reachedAt(timeline, "Failed");
	return failed !== null && feel.failure === "face"
		? Math.max(failed, landedAt)
		: null;
}

/** When each Card is dealt or joins; `null` for one the Deck never holds. */
function joinTimes(
	input: PlanInput,
	dealAt: number,
	upAt: number | null,
): Readonly<Record<Role, number | null>> {
	const { timeline, steps, feel, motion } = input;
	const stored = reachedAt(timeline, "Stored");
	const committed = stored ?? reachedAt(timeline, "Committed");
	const grammar = stored ?? reachedAt(timeline, "Grammar");
	const turns = upAt !== null && upAt > dealAt;
	/* a Card joining after the front one has started to turn waits it out */
	const settled = (at: number | null) => {
		if (at === null) return null;
		const joins = Math.max(at, dealAt);
		return turns && upAt !== null && joins > upAt
			? Math.max(joins, upAt + motion.turnMs)
			: joins;
	};
	const attestation = steps.attestationAtClick
		? dealAt
		: steps.attestation
			? settled(grammar)
			: null;
	return {
		Reading: dealAt,
		Attestation: attestation,
		Surface: steps.surface
			? settled(feel.surfaceWhen === "grammar" ? grammar : committed)
			: null,
		Lemma: steps.lemma ? settled(committed) : null,
	};
}

/**
 * The states a click's Deck passes through, in order.
 *
 * - The front Card turns face up when its answer lands, never before its
 *   deal has landed; one dealt with its answer is dealt face up. A failed
 *   Session's stays face down, or turns up to show the failure.
 * - The Attestation is dealt with the front Card when the unit is known at
 *   the click, and joins once Grammar shows it says something otherwise.
 * - The Surface joins at commit, or with Grammar; the Lemma at commit. A
 *   Card that joins with the front Card's turn moves with it; one that
 *   joins after the turn has started waits for it to land.
 * - A Card is never taken back.
 */
export function deckPlan(input: PlanInput): readonly DeckState[] {
	const { timeline } = input;
	const dealAt = dealtAt(input);
	const upAt = facesUpAt(input, dealAt);
	const joinsAt = joinTimes(input, dealAt, upAt);
	const times = new Set<number>([dealAt]);
	if (upAt !== null) times.add(upAt);
	for (const at of Object.values(joinsAt)) if (at !== null) times.add(at);
	for (const { at } of timeline) if (at > dealAt) times.add(at);
	const states: DeckState[] = [];
	for (const at of [...times].toSorted((a, b) => a - b)) {
		const state: DeckState = {
			at,
			phase: stateAt(timeline, at).phase,
			cards: ROLES.filter((role) => {
				const joins = joinsAt[role];
				return joins !== null && joins <= at;
			}),
			faceUp: upAt !== null && upAt <= at,
		};
		const last = states.at(-1);
		if (
			!last ||
			last.phase !== state.phase ||
			last.faceUp !== state.faceUp ||
			last.cards.length !== state.cards.length
		)
			states.push(state);
	}
	return states;
}
