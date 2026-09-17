import type {
	ChoiceCriteria,
	ChoiceQuestion,
	EntryType,
} from "promptsmith/typesafe";

/** Typed request data; the injected executor owns SDK/client construction. */
export function choice<const C extends ChoiceCriteria>(
	instructions: EntryType,
	criteria: C,
): ChoiceQuestion<C> {
	return { type: "choice", instructions, criteria };
}
