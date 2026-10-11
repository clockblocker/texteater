/**
 * `language.detect`: each Sentence's Detected Language (Dumgen ADR 0001,
 * #1177), after `splitText` and before `segment.inUnits`. Code settles the
 * Sentences whose script decides: one without letters is judged by its
 * surroundings, and one whose words are mostly in Hebrew script is Hebrew. jev
 * judges the rest with one Choice per Sentence, over windows of about
 * `windowSize` consecutive Sentences that may cross paragraphs, so a short
 * Sentence reads with its neighbours. The state names no target language:
 * a hint pulls a frame Sentence toward it (#1177).
 *
 * A Sentence jev cannot place (Unknown), like a letterless one, takes the
 * language of the nearest placed Sentence before it, else the nearest one
 * after it; with none, it stays undetermined. The windows run side by side,
 * and the first window that brings no usable answer fails the operation.
 */
import * as Effect from "effect/Effect";
import type { OperationScope } from "../call.js";
import { askThrough, type JevSettings } from "../jev-call.js";
import { type AskFailure, choice, choiceOf } from "../segment/ask.js";

/**
 * A Sentence's Detected Language: a language Intake names, or `other` for
 * any language it does not. An undetermined Sentence has none.
 */
export type DetectedLanguage = "de" | "en" | "he" | "other";

export type DetectLanguagesInput = {
	/** As `splitText` gives them: non-blank Sentences, paragraph by paragraph. */
	readonly paragraphs: readonly { readonly sentences: readonly string[] }[];
};

/** A Sentence with its Detected Language, absent when undetermined. */
type LanguagedSentence = {
	readonly text: string;
	readonly language?: DetectedLanguage;
};

/** The input's paragraphs, each Sentence with its Detected Language. */
export type LanguagedText = {
	readonly paragraphs: readonly {
		readonly sentences: readonly LanguagedSentence[];
	}[];
};

/** About how many Sentences one jev request reads and judges. */
const windowSize = 30;

/** Each option of the Choice, with the Detected Language it gives. */
const options = {
	German: { criterion: "German", language: "de" },
	English: { criterion: "English", language: "en" },
	Hebrew: { criterion: "Hebrew", language: "he" },
	Other: {
		criterion: "Another language, such as French, Dutch or Spanish",
		language: "other",
	},
	Unknown: {
		criterion:
			"Cannot tell: only names, numbers, interjections or words several languages share",
		language: undefined,
	},
} as const satisfies Record<
	string,
	{ criterion: string; language: DetectedLanguage | undefined }
>;

const criteria = Object.fromEntries(
	Object.entries(options).map(([option, { criterion }]) => [
		option,
		criterion,
	]),
);

/**
 * The Choice about `sentences[index]`. It quotes the Sentence too: with the
 * index alone, jev read a neighbour's words in a window of 21 Sentences
 * (11 of 17 clear cases right, against 17 of 17 quoted, live 2026-10-11,
 * #1178), for about 7% more tokens.
 */
const question = (index: number, sentence: string) =>
	choice(
		`Which language is \`sentences[${index}]\` written in? It reads: ${JSON.stringify(sentence)}. Judge its own words; a Sentence that mixes languages takes the language of its own clauses, not of a quoted or borrowed phrase.`,
		criteria,
	);

const words = /\p{L}[\p{L}\p{M}]*/gu;
const hebrewWord = /^\p{Script=Hebrew}/u;

/**
 * How code settles a Sentence before any judgment: `he` when most of its
 * words are in Hebrew script (`אני גר ב-Tel Aviv.`), `none` when it has no
 * letter, or `judge`. Words count, not letters, so a Hebrew Sentence keeps
 * a long Latin name, and a Hebrew word quoted in a German one does not
 * outweigh it.
 */
function scriptVerdict(sentence: string): "he" | "none" | "judge" {
	const written = sentence.match(words) ?? [];
	if (written.length === 0) return "none";
	const hebrew = written.filter((word) => hebrewWord.test(word)).length;
	return hebrew * 2 > written.length ? "he" : "judge";
}

/**
 * How code or jev settled a Sentence, before surroundings fill the gaps:
 * the operation's `DetectedLanguages` event lists one per Sentence, so an
 * inspection shows each judgment's confidence.
 */
type Settlement =
	| {
			readonly sentence: number;
			readonly by: "Script";
			readonly language?: "he";
	  }
	| {
			readonly sentence: number;
			readonly by: "Judge";
			readonly choice: string;
			readonly confidence: number;
	  };

/** Consecutive windows of about `windowSize`, as even as they come. */
function windowsOf(count: number): (readonly [number, number])[] {
	const windows = Math.ceil(count / windowSize);
	const size = Math.ceil(count / Math.max(windows, 1));
	return Array.from({ length: windows }, (_, window) => [
		window * size,
		Math.min(count, (window + 1) * size),
	]);
}

/**
 * Fills each undetermined Sentence from the nearest determined one before
 * it, else after it, reading only the languages settled before filling.
 */
function filledFromSurroundings(
	languages: readonly (DetectedLanguage | undefined)[],
): (DetectedLanguage | undefined)[] {
	return languages.map((language, index) => {
		if (language !== undefined) return language;
		for (let before = index - 1; before >= 0; before--)
			if (languages[before] !== undefined) return languages[before];
		for (let after = index + 1; after < languages.length; after++)
			if (languages[after] !== undefined) return languages[after];
		return undefined;
	});
}

/** The body of `language.detect`. */
export const detectLanguages = Effect.fnUntraced(function* (
	scope: OperationScope,
	jev: JevSettings,
	input: DetectLanguagesInput,
): Effect.fn.Return<LanguagedText, AskFailure> {
	const sentences = input.paragraphs.flatMap(({ sentences }) => sentences);
	const verdicts = sentences.map(scriptVerdict);
	const ask = askThrough(scope, jev);
	const judged = yield* Effect.forEach(
		windowsOf(sentences.length),
		([start, end]) => {
			const questions = Object.fromEntries(
				verdicts
					.slice(start, end)
					.flatMap((verdict, offset) =>
						verdict === "judge"
							? [
									[
										`sentence-${offset}`,
										question(
											offset,
											sentences[start + offset] ?? "",
										),
									],
								]
							: [],
					),
			);
			if (Object.keys(questions).length === 0)
				return Effect.succeed(new Map<number, Settlement>());
			return ask({
				stage: "language",
				state: { sentences: sentences.slice(start, end) },
				questions,
			}).pipe(
				Effect.map(
					(answers) =>
						new Map(
							Object.keys(questions).map((id) => {
								const answer = choiceOf(answers, id);
								const sentence =
									start +
									Number(id.slice("sentence-".length));
								return [
									sentence,
									{
										sentence,
										by: "Judge",
										choice: answer.choice,
										confidence: answer.confidence,
									},
								] as const;
							}),
						),
				),
			);
		},
		{ concurrency: "unbounded" },
	);
	const judgments = new Map(judged.flatMap((window) => [...window]));
	const settled = verdicts.map((verdict, sentence) => {
		if (verdict === "he") return "he";
		const judgment = judgments.get(sentence);
		return judgment?.by === "Judge"
			? options[judgment.choice as keyof typeof options]?.language
			: undefined;
	});
	scope.event({
		name: "DetectedLanguages",
		data: verdicts.map(
			(verdict, sentence): Settlement =>
				judgments.get(sentence) ??
				(verdict === "he"
					? { sentence, by: "Script", language: "he" }
					: { sentence, by: "Script" }),
		),
	});
	const languages = filledFromSurroundings(settled);
	let position = 0;
	return {
		paragraphs: input.paragraphs.map(({ sentences }) => ({
			sentences: sentences.map((text) => {
				const language = languages[position++];
				return language === undefined ? { text } : { text, language };
			}),
		})),
	};
});
