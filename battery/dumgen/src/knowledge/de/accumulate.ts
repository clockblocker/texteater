/**
 * The German body of `knowledge.accumulateTranslations` (ADR 0047): a
 * Reading's translations grow click by click, one language at a time.
 *
 * - jev judges first, as it judges the Reading (ADR 0031): it sees the
 *   language's stored translations bare beside the marked Sentence and
 *   picks the one that covers this occurrence, or answers NoMatch. Its
 *   pick, of any option, ends the language: nothing is written.
 * - Only after NoMatch does Luna write the occurrence's equivalents, from
 *   the Reading and the marked Sentence alone, never the stored ones: the
 *   Sentence's natural translation first, then what it renders the target
 *   with.
 * - What Luna writes that the language already holds is dropped, comparing
 *   case-folded with whitespace collapsed. When nothing is left, the judge
 *   was wrong, and nothing is added; otherwise the rest is one Contribute.
 * - Authored Readings accumulate too: their stored translations started
 *   as the authored ones (ADR 0021).
 * - Each language runs on its own, and its failure is a value that adds
 *   nothing for it. Nothing is retried, and no answer is salvaged.
 * - Bad input is a Defect, raised before anything is asked.
 */

import { isRecord } from "common-utils";
import { lemmaIdentityKey, normalizeForm, routeOf } from "dumling";
import { selectKnowledge, translationLanguageValues } from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type { OperationScope } from "../../call.js";
import { InvalidModelOutput } from "../../errors.js";
import { markedSentence } from "../../resolve/reading.js";
import { choice, choiceOf } from "../../segment/ask.js";
import type {
	AccumulateTranslationsInput,
	GermanKnowledgeChange,
	KnowledgeFailure,
	TranslationAccumulation,
} from "../types.js";
import {
	coveragePolicy,
	coverageQuestion,
	occurrenceTranslationPrompt,
} from "./accumulation-prompts.js";
import {
	type AspectContext,
	type AspectError,
	aspectContext,
	checkedChanges,
	judgeState,
	type KnowledgeModels,
	textsOf,
	write,
} from "./context.js";

/** jev's request and Luna's, as the trace and a cache key them. */
const judgeStage = "translationCoverage";
const writerStage = "translationAccumulation";

/**
 * Luna writes the Sentence's translation before the equivalents it reads
 * off it, as the Emoji Description comes before the headword (ADR 0031):
 * written first, the equivalents named the meaning's most common sense.
 */
const occurrenceSchema = {
	type: "object",
	properties: {
		sentence: { type: "string", minLength: 1 },
		equivalents: {
			type: "array",
			items: { type: "string", minLength: 1 },
			minItems: 1,
			maxItems: 3,
		},
	},
	required: ["sentence", "equivalents"],
} as const;

/**
 * The key two translations share when they are the same one: Dumrel's
 * normalization, whitespace collapsed and case folded in their language.
 */
function translationKey(
	text: string,
	language: Dumrel.TranslationLanguage,
): string {
	return normalizeForm(text)
		.replace(/\s+/gu, " ")
		.toLocaleLowerCase(language);
}

/** How one language came out; the trace's `TranslationAccumulation` event. */
type LanguageOutcome =
	| { readonly outcome: "Covered"; readonly by: string }
	| { readonly outcome: "Contained"; readonly written: readonly string[] }
	| {
			readonly outcome: "Added";
			readonly written: readonly string[];
			readonly added: readonly string[];
	  };

/** The option id of the stored translation at `index`. */
const optionId = (index: number) => `t${index}`;

/**
 * The language's stored translations, each once: jev's options, and what
 * Luna's answer is checked against.
 */
function distinctTranslations(
	stored: readonly string[],
	language: Dumrel.TranslationLanguage,
): string[] {
	const seen = new Set<string>();
	return stored.filter((text) => {
		const key = translationKey(text, language);
		if (key === "" || seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

const accumulateLanguage = Effect.fnUntraced(function* (
	context: AspectContext,
	language: Dumrel.TranslationLanguage,
	stored: readonly string[],
): Effect.fn.Return<
	{
		readonly outcome: LanguageOutcome;
		readonly changes: readonly GermanKnowledgeChange[];
	},
	AspectError
> {
	const options = distinctTranslations(stored, language);
	const answers = yield* context.ask({
		stage: judgeStage,
		state: judgeState(context, { language, policy: { ...coveragePolicy } }),
		questions: {
			translation: choice(coverageQuestion.question, {
				...Object.fromEntries(
					options.map((text, index) => [optionId(index), text]),
				),
				NoMatch: coverageQuestion.noMatch,
			}),
		},
	});
	const answer = choiceOf(answers, "translation").choice;
	if (answer !== "NoMatch") {
		const by = options.find((_, index) => optionId(index) === answer);
		if (by === undefined)
			return yield* new InvalidModelOutput({
				stage: judgeStage,
				message: `jev answered the translation with ${answer}, no option of it`,
			});
		return { outcome: { outcome: "Covered", by }, changes: [] };
	}
	const written = yield* write(
		context,
		writerStage,
		occurrenceTranslationPrompt,
		{ language },
		occurrenceSchema,
		(output) => {
			const texts = textsOf(
				writerStage,
				isRecord(output) ? output.equivalents : undefined,
				3,
			);
			if (!Array.isArray(texts)) return texts;
			return texts.length === 0
				? new InvalidModelOutput({
						stage: writerStage,
						message: "Luna answered no translation",
					})
				: texts;
		},
	);
	const held = new Set(options.map((text) => translationKey(text, language)));
	const added = written.filter((text) => {
		const key = translationKey(text, language);
		if (held.has(key)) return false;
		held.add(key);
		return true;
	});
	if (added.length === 0)
		return { outcome: { outcome: "Contained", written }, changes: [] };
	const changes = checkedChanges(context, "translations", [
		{ kind: "Contribute", aspect: "translations", language, value: added },
	]);
	if (changes instanceof InvalidModelOutput) return yield* changes;
	return { outcome: { outcome: "Added", written, added }, changes };
});

/** Why the input is bad, if it is: a Defect, raised before anything is asked. */
function badInput(input: AccumulateTranslationsInput): string | undefined {
	const { reading, attestation, sentence, translations } = input;
	if (
		lemmaIdentityKey(attestation.surface.lemma) !==
		lemmaIdentityKey(reading.lemma)
	)
		return "The Attestation is of another Lemma than the Reading";
	const { segments, target } = sentence;
	if (
		target.length === 0 ||
		target.some(
			(index, at) =>
				!Number.isInteger(index) ||
				index < 0 ||
				index >= segments.length ||
				(at > 0 && index <= (target[at - 1] ?? -1)),
		)
	)
		return "The target is no ascending run of the Sentence's Segments";
	for (const [language, texts] of Object.entries(translations)) {
		if (!translationLanguageValues.some((known) => known === language))
			return `${JSON.stringify(language)} is no translation language`;
		if (
			!Array.isArray(texts) ||
			texts.some((text) => typeof text !== "string")
		)
			return `The ${language} translations are no list of text`;
	}
	return undefined;
}

export const accumulateGermanTranslations = (
	scope: OperationScope,
	models: KnowledgeModels,
	input: AccumulateTranslationsInput,
): Effect.Effect<TranslationAccumulation> =>
	Effect.gen(function* () {
		const problem = badInput(input);
		if (problem) return yield* Effect.die(Error(problem));
		const { reading, attestation, translations } = input;
		const selected = selectKnowledge({ route: routeOf(reading.lemma) });
		const applicable = selected.success
			? (selected.value.translations ?? {})
			: {};
		const languages = translationLanguageValues.filter(
			(language) =>
				language in applicable &&
				(translations[language]?.length ?? 0) > 0,
		);
		if (languages.length === 0)
			return {
				changes: [],
				failures: [],
			} satisfies TranslationAccumulation;
		const context = aspectContext(
			scope,
			models,
			reading,
			attestation,
			markedSentence(input.sentence.segments, input.sentence.target),
		);
		// Effect.forEach keeps the input order, so the result reads in
		// language order however the calls finish.
		const outputs = yield* Effect.forEach(
			languages,
			(language) =>
				accumulateLanguage(
					context,
					language,
					translations[language] ?? [],
				).pipe(
					Effect.map(({ outcome, changes }) => {
						scope.event({
							name: "TranslationAccumulation",
							data: { language, ...outcome },
						});
						return { changes, failures: [] };
					}),
					Effect.catch((error: AspectError) =>
						Effect.succeed({
							changes: [],
							failures: [
								{
									aspect: "translations",
									leaf: language,
									code:
										error._tag === "KnowledgeUnresolved"
											? "Unresolved"
											: error._tag,
									message: error.message,
								} satisfies KnowledgeFailure,
							],
						}),
					),
				),
			{ concurrency: "unbounded" },
		);
		return {
			changes: outputs.flatMap((output) => output.changes),
			failures: outputs.flatMap((output) => output.failures),
		};
	});
