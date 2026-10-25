import type { Question } from "@typesafe-ai/sdk";
import { isRecord } from "common-utils";
import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { applyParadigmChanges, licensed, paradigmChangesFor } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { ProduceKnowledgeInput } from "../../src/knowledge/types.js";
import { type JevPick, knowledgeJev } from "./support.js";

export const bankLemma = {
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem" },
};
export const verb = (canonicalForm: string) => ({
	family: "Lexeme",
	kind: "VERB",
	canonicalForm,
	coreFeatures: { hasSepPrefix: null },
});

export type Forms = Partial<Record<Dumrel.DimensionId, readonly string[]>>;
export const verbDimensions: readonly Dumrel.DimensionId[] = [
	"preterite",
	"present1",
	"present2",
	"present3",
	"pastParticiple",
	"subjunctivePast",
];

/** The Paradigm `changes` leave on `paradigm`, Dumrel checking them. */
export function applied(
	paradigm: Dumrel.LemmaParadigm,
	readings: readonly Dumling.Reading<"de">[],
	changes: readonly Dumrel.ParadigmChange[],
): Dumrel.LemmaParadigm {
	const [first] = readings;
	if (!first) throw Error("No Reading");
	const result = applyParadigmChanges({
		lemma: first.lemma,
		readings,
		paradigm,
		changes,
	});
	if (!result.success) throw result.error;
	return result.value;
}

/** A Lemma Paradigm whose one Reading licenses `forms` explicitly. */
export function storedFor(
	reading: Dumling.Reading<"de">,
	forms: Forms,
): Dumrel.LemmaParadigm {
	return applied(
		{ dimensions: {} },
		[reading],
		Object.entries(forms).flatMap(([dimension, values]) =>
			paradigmChangesFor({
				reading,
				dimension: dimension as Dumrel.DimensionId,
				values: values ?? [],
				provenance: "Produced",
			}),
		),
	);
}

/**
 * A jev whose licence judge picks, per dimension, the option listing
 * `picks[dimension]` in the order shown (an unlisted dimension its first
 * option), and answers every other question as `knowledgeJev` does.
 */
export const judge = (
	picks: Partial<Record<Dumrel.DimensionId, readonly string[]>> = {},
	options: { readonly fail?: (stage: string) => boolean } = {},
) =>
	knowledgeJev((id, question: Question): JevPick | undefined => {
		const instructions = isRecord(question.instructions)
			? question.instructions
			: {};
		if (question.type !== "choice" || !Array.isArray(instructions.forms))
			return undefined;
		const wanted = picks[id as Dumrel.DimensionId];
		if (wanted === undefined) return undefined;
		const text = instructions.forms
			.map(String)
			.filter((form) => wanted.includes(form))
			.join(" and ");
		return (
			Object.entries(question.criteria ?? {}).find(
				([, criterion]) => criterion === text,
			)?.[0] ?? "none"
		);
	}, options);

/** What the Reading licenses, per dimension, once `changes` apply. */
export function licencesOf(
	paradigm: Dumrel.LemmaParadigm,
	reading: Dumling.Reading<"de">,
): Forms {
	return Object.fromEntries(
		Object.keys(paradigm.dimensions).map((dimension) => [
			dimension,
			licensed(
				paradigm,
				dimension as Dumrel.DimensionId,
				readingIdentityKey(reading),
			),
		]),
	);
}

export const later = <E>(
	input: ProduceKnowledgeInput<E>,
	stored: Dumrel.LemmaParadigm,
	readings: readonly Dumling.Reading<"de">[],
	dimensions: readonly Dumrel.DimensionId[],
): ProduceKnowledgeInput<E> => ({
	...input,
	paradigm: { dimensions, stored, readings },
});

/** Luna's principal-parts answer for `forms`. */
export const verbFormsOf = (forms: Forms) => ({
	preterite: forms.preterite,
	presentSingular: {
		first: forms.present1,
		second: forms.present2,
		third: forms.present3,
	},
	pastParticiple: forms.pastParticiple,
	subjunctivePast: forms.subjunctivePast,
});
