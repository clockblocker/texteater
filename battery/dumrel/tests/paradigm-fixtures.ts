/** The Lemmas, Readings and produced Paradigms the Paradigm tests share. */
import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import {
	applyParadigmChanges,
	licenceGroups,
	paradigmChangesFor,
} from "dumrel";
import type * as Dumrel from "dumrel/types";

export const noun = (canonicalForm: string, gender: "Fem" | "Masc" | "Neut") =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm,
		coreFeatures: { gender },
	}) as const satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">;
export const verb = (
	canonicalForm: string,
	hasSepPrefix: string | null = null,
) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm,
		coreFeatures: { hasSepPrefix },
	}) as const satisfies Dumling.Lemma<"de", "Lexeme", "VERB">;
export const reading = <
	L extends Dumling.Lemma<"de", "Lexeme", "NOUN" | "VERB">,
>(
	lemma: L,
	emojiDescription: string,
) => ({ unitKind: "Reading", lemma, emojiDescription }) as Dumling.Reading;

/** The Paradigm one write per Reading gives, each Reading licensing what it wrote. */
export function produced(
	lemma: Dumling.Lemma,
	readings: readonly Dumling.Reading[],
	written: readonly [Dumling.Reading, Dumrel.DimensionId, string[]][],
): Dumrel.LemmaParadigm {
	const result = applyParadigmChanges({
		lemma,
		readings,
		paradigm: { dimensions: {} },
		changes: written.flatMap(([source, dimension, values]) =>
			paradigmChangesFor({
				reading: source,
				dimension,
				values,
				provenance: "Produced",
			}),
		),
	});
	if (!result.success) throw result.error;
	return result.value;
}

export const keyOf = readingIdentityKey;
export const groupsOf = (
	paradigm: Dumrel.LemmaParadigm,
	readings: readonly Dumling.Reading[],
) =>
	licenceGroups(paradigm, readings.map(keyOf)).map((group) => ({
		readings: group.readings.map((key) => {
			const found = readings.find((entry) => keyOf(entry) === key);
			return found && "emojiDescription" in found
				? found.emojiDescription
				: undefined;
		}),
		selection: group.selection,
	}));
