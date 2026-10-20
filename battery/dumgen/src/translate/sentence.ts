/**
 * `translate.sentence` (#1210): one German Sentence goes in, its
 * translation into a Dumrel translation language comes out, written by
 * Luna in one call. The Sentences around it are context only. No judge
 * checks the text (ADR 0023), and nothing of it is Knowledge: the
 * `translations` aspect gives a Reading's dictionary equivalents, never a
 * Sentence's.
 */
import { translationLanguageValues } from "dumrel";
import * as Effect from "effect/Effect";
import type { OperationScope } from "../call.js";
import { InvalidModelOutput, type ProviderFailure } from "../errors.js";
import { askLuna, type LunaSettings } from "../luna-call.js";
import type { TranslateSentenceInput } from "./types.js";

const stage = "translation";

/** The one translation prompt; the language comes in the input, as in Knowledge (#697). */
export const sentenceTranslationPrompt = [
	"`sentence` is one German sentence from a text a learner is reading. Translate it into `language` (en: English, ru: Russian) as a fluent translator would: one natural translation that keeps its meaning, tone and register, says nothing it does not say and leaves out nothing it says.",
	"`before` and `after`, when present, are the sentences just before and after it in the text. Read them only to settle what the sentence leaves open, such as whom a pronoun names, its gender and number, or which sense an ambiguous word has; never translate them, and add nothing only they say.",
	"Translate an idiom or a fixed expression by the expression of the same meaning in that language, else by a plain wording of its meaning, never word for word. A proper name keeps its own form, transliterated into Cyrillic for ru, unless the language has an established name for it. Informal, broken or transcribed speech is translated in the same register, never corrected or completed.",
	"The sentence may mark words with inline markup: **…**, *…*, ==…==, ~~…~~, `…` or […]. Put each mark around the words of the translation that carry the marked words' meaning, rewording around them where needed to keep them together: around the equivalent of a marked idiom, not its literal words, and around whatever carries a marked separable prefix's meaning. Add no other markup.",
	"Answer with the translation alone as the JSON string: no quotation marks around it, no note, no transliteration and no second version.",
].join("\n");

const translationSchema = { type: "string", minLength: 1 } as const;

const isText = (value: unknown): value is string =>
	typeof value === "string" && value.trim() !== "";

/**
 * Translates one Sentence. Another language than German, a blank
 * Sentence, a language outside Dumrel's translation languages or a
 * neighbour that is no text is bad input, a Defect raised before anything
 * is asked.
 */
export const translateSentence = Effect.fnUntraced(function* (
	scope: OperationScope,
	luna: LunaSettings,
	input: TranslateSentenceInput,
): Effect.fn.Return<string, ProviderFailure | InvalidModelOutput> {
	const language: string = input.language;
	if (language !== "de")
		return yield* Effect.die(
			Error(
				`translate.sentence translates German ("de") only, not ${JSON.stringify(language)}`,
			),
		);
	if (!isText(input.sentence))
		return yield* Effect.die(Error("translate.sentence needs a Sentence"));
	const into: string = input.into;
	if (!translationLanguageValues.some((known) => known === into))
		return yield* Effect.die(
			Error(
				`translate.sentence translates into ${translationLanguageValues.join(" or ")}, not ${JSON.stringify(into)}`,
			),
		);
	const { before, after } = input.neighbours ?? {};
	for (const neighbour of [before, after])
		if (neighbour !== undefined && typeof neighbour !== "string")
			return yield* Effect.die(
				Error("A neighbouring Sentence of translate.sentence is text"),
			);
	return yield* askLuna(
		scope,
		luna,
		stage,
		{
			systemPrompt: sentenceTranslationPrompt,
			input: {
				sentence: input.sentence.trim(),
				language: into,
				...(isText(before) ? { before: before.trim() } : {}),
				...(isText(after) ? { after: after.trim() } : {}),
			},
			outputFormat: "json",
			outputSchema: translationSchema,
		},
		(output) =>
			isText(output)
				? output.trim()
				: new InvalidModelOutput({
						stage,
						message: `Luna answered no translation: ${JSON.stringify(output)?.slice(0, 80)}`,
					}),
	);
});
