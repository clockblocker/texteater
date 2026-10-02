import type {
	ChoiceCriteria,
	ChoiceQuestion,
	EntryType,
	NoulQuestion,
	ScoreCriteria,
	ScoreQuestion,
} from "promptsmith/typesafe";

/** Typed request data; the injected executor owns SDK/client construction. */
export function choice<const C extends ChoiceCriteria>(
	instructions: EntryType,
	criteria: C,
): ChoiceQuestion<C> {
	return { type: "choice", instructions, criteria };
}

export function noul(
	instructions: EntryType,
	criteria?: NoulQuestion["criteria"],
): NoulQuestion {
	return { type: "noul", instructions, ...(criteria ? { criteria } : {}) };
}

export function score<const C extends ScoreCriteria>(
	instructions: EntryType,
	criteria: C,
): ScoreQuestion<C> {
	return { type: "score", instructions, criteria };
}
