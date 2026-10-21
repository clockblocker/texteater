import { lemmaIdentityKey, normalizeForm, parseUnit, routeOf } from "dumling";
import {
	applyKnowledgeChanges,
	parseKnowledgeChange,
	selectKnowledge,
	translationLanguageValues,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type { OperationScope } from "../../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../../errors.js";
import { askThrough } from "../../jev-call.js";
import { askLuna } from "../../luna-call.js";
import { choice, choiceOf } from "../../segment/ask.js";
import type {
	AccumulateTranslationsInput,
	KnowledgeFailure,
	TranslationAccumulation,
} from "../types.js";
import type { HebrewKnowledgeModels } from "./produce.js";

const translationKey = (text: string, language: Dumrel.TranslationLanguage) =>
	normalizeForm(text).replace(/\s+/gu, " ").toLocaleLowerCase(language);

function badInput(
	input: AccumulateTranslationsInput<"he">,
): string | undefined {
	if (
		input.language !== "he" ||
		input.reading.lemma.language !== "he" ||
		input.attestation.surface.lemma.language !== "he"
	)
		return "Expected Hebrew translation accumulation input";
	for (const value of [input.reading, input.attestation]) {
		const parsed = parseUnit(value);
		if (!parsed.success) return parsed.error.message;
	}
	if (
		lemmaIdentityKey(input.reading.lemma) !==
		lemmaIdentityKey(input.attestation.surface.lemma)
	)
		return "The Attestation is of another Lemma than the Reading";
	const { segments, target } = input.sentence;
	if (
		target.length === 0 ||
		target.some(
			(value, index) =>
				!Number.isInteger(value) ||
				value < 0 ||
				value >= segments.length ||
				(index > 0 && value <= (target[index - 1] ?? -1)),
		)
	)
		return "The target is no ascending run of the Sentence's Segments";
	for (const [language, texts] of Object.entries(input.translations)) {
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

/** Hebrew ADR0047 accumulator: stored equivalents are bare judge options, never writer hints. */
export const accumulateHebrewTranslations = (
	scope: OperationScope,
	models: HebrewKnowledgeModels,
	input: AccumulateTranslationsInput<"he">,
): Effect.Effect<TranslationAccumulation<"he">> =>
	Effect.gen(function* () {
		const problem = badInput(input);
		if (problem) return yield* Effect.die(Error(problem));
		const selected = selectKnowledge({
			route: routeOf(input.reading.lemma),
		});
		const applicable = selected.success
			? (selected.value.translations ?? {})
			: {};
		const target = new Set(input.sentence.target);
		const markedSentence = input.sentence.segments
			.map(({ text }, index) =>
				target.has(index) ? `<TARGET>${text}</TARGET>` : text,
			)
			.join("")
			.replaceAll("</TARGET><TARGET>", "");
		const reading = {
			lemma: input.reading.lemma.canonicalForm,
			kind: input.reading.lemma.kind,
			family: input.reading.lemma.family,
			coreFeatures: input.reading.lemma.coreFeatures,
			...("emojiDescription" in input.reading
				? { emojiDescription: input.reading.emojiDescription }
				: {}),
		};
		const languages = translationLanguageValues.filter(
			(language) =>
				language in applicable &&
				(input.translations[language]?.length ?? 0) > 0,
		);
		const outputs = yield* Effect.forEach(
			languages,
			(language) =>
				Effect.gen(function* () {
					const seen = new Set<string>();
					const options = (input.translations[language] ?? []).filter(
						(text) => {
							const key = translationKey(text, language);
							if (!key || seen.has(key)) return false;
							seen.add(key);
							return true;
						},
					);
					if (options.length === 0)
						return {
							changes: [],
							failures: [],
						} satisfies TranslationAccumulation<"he">;
					const answers = yield* askThrough(
						scope,
						models.jev,
					)({
						stage: "translationCoverage",
						state: {
							reading,
							markedSentence,
							language,
							policy: {
								task: "The Reading names one resolved Hebrew sense; its Emoji Description identifies that sense. Options are its stored dictionary translations into language (en English, ru Russian), shown bare.",
								coverage:
									"Judge the natural translation of the entire marked Sentence, not a word-for-word gloss. An option covers the target when that translation uses it or an inflected form of the same word. A nearby meaning or familiar dictionary gloss is not enough. Pick NoMatch when none covers it, even with only one option. Never switch the Reading's sense.",
							},
						},
						questions: {
							translation: choice(
								"Which stored equivalent renders <TARGET> in the natural translation of this Sentence into language?",
								{
									...Object.fromEntries(
										options.map((text, index) => [
											`t${index}`,
											text,
										]),
									),
									NoMatch:
										"The natural translation needs an equivalent none of the stored options gives",
								},
							),
						},
					});
					const answer = choiceOf(answers, "translation").choice;
					if (answer !== "NoMatch") {
						const by = options.find(
							(_, index) => `t${index}` === answer,
						);
						if (by === undefined)
							return yield* new InvalidModelOutput({
								stage: "translationCoverage",
								message:
									"The judge selected no stored translation",
							});
						scope.event({
							name: "TranslationAccumulation",
							data: { language, outcome: "Covered", by },
						});
						return {
							changes: [],
							failures: [],
						} satisfies TranslationAccumulation<"he">;
					}
					const written = yield* askLuna(
						scope,
						models.luna,
						"translationAccumulation",
						{
							systemPrompt:
								"The Reading identifies one resolved Hebrew sense. Translate the whole marked Sentence naturally into the requested language, then give one to three citation-form equivalents rendering TARGET in that translation. Never switch the Reading's sense. Return {sentence,equivalents}; do not guess unavailable equivalents.",
							input: {
								aspect: "translationAccumulation",
								reading,
								markedSentence,
								language,
							},
							outputFormat: "json",
							outputSchema: {
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
							},
						},
						(output) => {
							if (
								typeof output !== "object" ||
								output === null ||
								!("sentence" in output) ||
								typeof output.sentence !== "string" ||
								!output.sentence.trim() ||
								!("equivalents" in output) ||
								!Array.isArray(output.equivalents) ||
								output.equivalents.length === 0 ||
								output.equivalents.length > 3 ||
								output.equivalents.some(
									(text) =>
										typeof text !== "string" ||
										!text.trim(),
								)
							)
								return new InvalidModelOutput({
									stage: "translationAccumulation",
									message:
										"Expected a sentence and one to three nonempty equivalents",
								});
							return output.equivalents.map((text: string) =>
								normalizeForm(text),
							);
						},
					);
					const held = new Set(
						options.map((text) => translationKey(text, language)),
					);
					const added = written.filter((text) => {
						const key = translationKey(text, language);
						if (held.has(key)) return false;
						held.add(key);
						return true;
					});
					if (added.length === 0) {
						scope.event({
							name: "TranslationAccumulation",
							data: { language, outcome: "Contained", written },
						});
						return {
							changes: [],
							failures: [],
						} satisfies TranslationAccumulation<"he">;
					}
					const parsed = parseKnowledgeChange({
						source: input.reading,
						change: {
							kind: "Contribute",
							aspect: "translations",
							language,
							value: added,
						},
					});
					if (!parsed.success)
						return yield* new InvalidModelOutput({
							stage: "translationAccumulation",
							message: parsed.error.message,
						});
					const applied = applyKnowledgeChanges({
						source: input.reading,
						knowledge: {
							translations: Object.fromEntries(
								Object.entries(input.translations).map(
									([key, texts]) => [key, [...texts]],
								),
							),
						},
						changes: [parsed.value],
					});
					if (!applied.success)
						return yield* new InvalidModelOutput({
							stage: "translationAccumulation",
							message: applied.error.message,
						});
					scope.event({
						name: "TranslationAccumulation",
						data: { language, outcome: "Added", written, added },
					});
					return {
						changes: [parsed.value],
						failures: [],
					} satisfies TranslationAccumulation<"he">;
				}).pipe(
					Effect.catch(
						(error: ProviderFailure | InvalidModelOutput) =>
							Effect.succeed<TranslationAccumulation<"he">>({
								changes: [],
								failures: [
									{
										aspect: "translations",
										leaf: language,
										code: error._tag,
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
