/**
 * Text mode of the `segment.inUnits` evaluation (#845): how `splitText`
 * cuts a Text into paragraphs and Sentences, scored by sentence boundary
 * against the paragraphs drafted in `ud-drafts/` beside this file, until
 * #738's Text Records replace them.
 *
 * A boundary is the cut after a Sentence that is not its Text's last. It
 * is counted in the Text's visible characters, whitespace left out, so a
 * splitter that trims a Sentence or joins a hard-wrapped line still meets
 * gold's cuts.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { readStoredJsonSync } from "../stored-json.js";

/** `splitText`'s contract: a Text in, its paragraphs of Sentences out. */
export type Splitter = (text: string) => {
	readonly paragraphs: readonly { readonly sentences: readonly string[] }[];
};

export const splitTextInputSchema = z.strictObject({
	language: z.literal("de"),
	text: z.string().min(1),
});

export const splitTextOutputSchema = z.strictObject({
	paragraphs: z.array(
		z.strictObject({ sentences: z.array(z.string().min(1)) }),
	),
});

export type SplitTextInput = z.infer<typeof splitTextInputSchema>;
export type SplitTextOutput = z.infer<typeof splitTextOutputSchema>;

/** One drafted Text: its source text and the paragraphs of Sentences it reads as. */
export type DraftedText = {
	readonly id: string;
	readonly input: SplitTextInput;
	readonly idealOutput: SplitTextOutput;
};

/** `ud-drafts/manifest.json`: each Text's source and its paragraphs' Sentences. */
export const udDraftsManifestSchema = z.object({
	texts: z.record(
		z.string(),
		z.object({
			sourceText: z.string(),
			paragraphs: z.array(z.object({ sentences: z.array(z.string()) })),
		}),
	),
});

/** `ud-drafts/paragraphs.json`: each Text's Sentences, in order. */
const udDraftsParagraphsSchema = z.object({
	paragraphs: z.array(
		z.object({ id: z.string(), sentences: z.array(z.string()) }),
	),
});

const udDraftsDirectory = join(
	dirname(fileURLToPath(import.meta.url)),
	"ud-drafts",
);

/**
 * The ud-drafts Texts: `manifest.json` gives each Text's source and how its
 * Sentences fall into paragraphs, `paragraphs.json` each Sentence's text.
 */
export function udDraftTexts(directory = udDraftsDirectory): DraftedText[] {
	const manifest = readStoredJsonSync(
		udDraftsManifestSchema,
		join(directory, "manifest.json"),
	);
	const drafts = readStoredJsonSync(
		udDraftsParagraphsSchema,
		join(directory, "paragraphs.json"),
	);
	return drafts.paragraphs.map((draft) => {
		const text = manifest.texts[draft.id];
		if (!text) throw Error(`ud-drafts manifest has no text ${draft.id}`);
		const sentences = [...draft.sentences];
		const paragraphs = text.paragraphs.map((paragraph) => ({
			sentences: paragraph.sentences.map(() => {
				const sentence = sentences.shift();
				if (sentence === undefined)
					throw Error(`ud-drafts ${draft.id} has too few Sentences`);
				return sentence;
			}),
		}));
		if (sentences.length > 0)
			throw Error(`ud-drafts ${draft.id} has Sentences in no paragraph`);
		return {
			id: draft.id,
			input: { language: "de", text: text.sourceText },
			idealOutput: { paragraphs },
		};
	});
}

/** How a split met its Text's gold Sentences. */
export type SplitCheck = {
	/** The Text's Sentences came back exactly: every gold one, no other. */
	readonly contractPass: boolean;
	/** The Sentences, whitespace aside, spell the whole Text. */
	readonly textPreserved: boolean;
	readonly goldBoundaries: number;
	readonly predictedBoundaries: number;
	readonly matchedBoundaries: number;
	readonly goldSentences: number;
	readonly predictedSentences: number;
	/** Predicted Sentences with both of a gold Sentence's cuts. */
	readonly exactSentences: number;
	readonly goldParagraphs: number;
	readonly predictedParagraphs: number;
};

const visible = (text: string) => text.replace(/\s+/gu, "");

/** Each Sentence's start and end in visible characters. */
function spansOf(output: SplitTextOutput): (readonly [number, number])[] {
	let at = 0;
	return output.paragraphs
		.flatMap(({ sentences }) => sentences)
		.map((sentence) => {
			const start = at;
			at += visible(sentence).length;
			return [start, at] as const;
		});
}

export function evaluateSplitText(args: {
	readonly input: SplitTextInput;
	readonly idealOutput: SplitTextOutput;
	readonly output: SplitTextOutput;
}): SplitCheck {
	const gold = spansOf(args.idealOutput);
	const predicted = spansOf(args.output);
	const cuts = (spans: readonly (readonly [number, number])[]) =>
		new Set(spans.slice(0, -1).map(([, end]) => end));
	const goldCuts = cuts(gold);
	const predictedCuts = cuts(predicted);
	const goldSpans = new Set(gold.map(([start, end]) => `${start}:${end}`));
	const textPreserved =
		args.output.paragraphs
			.flatMap(({ sentences }) => sentences.map(visible))
			.join("") === visible(args.input.text);
	const exactSentences = predicted.filter(([start, end]) =>
		goldSpans.has(`${start}:${end}`),
	).length;
	return {
		contractPass:
			textPreserved &&
			exactSentences === gold.length &&
			predicted.length === gold.length,
		textPreserved,
		goldBoundaries: goldCuts.size,
		predictedBoundaries: predictedCuts.size,
		matchedBoundaries: [...predictedCuts].filter((cut) => goldCuts.has(cut))
			.length,
		goldSentences: gold.length,
		predictedSentences: predicted.length,
		exactSentences,
		goldParagraphs: args.idealOutput.paragraphs.length,
		predictedParagraphs: args.output.paragraphs.length,
	};
}

const ratio = (part: number, whole: number) =>
	whole === 0 ? Number.NaN : part / whole;

const rates = (matched: number, predicted: number, gold: number) => {
	const precision = ratio(matched, predicted);
	const recall = ratio(matched, gold);
	return {
		precision,
		recall,
		f1:
			precision + recall === 0
				? Number.NaN
				: (2 * precision * recall) / (precision + recall),
		gold,
	};
};

/** Sentence-boundary and exact-Sentence P/R/F1 over a run's Texts. */
export function splitTextMetrics(run: {
	readonly cases: readonly { readonly evaluation?: unknown }[];
}) {
	const checks = run.cases.flatMap(({ evaluation }) =>
		evaluation && typeof evaluation === "object"
			? [evaluation as SplitCheck]
			: [],
	);
	const sum = (
		key: Exclude<keyof SplitCheck, "textPreserved" | "contractPass">,
	) => checks.reduce((total, check) => total + check[key], 0);
	return {
		evaluated: checks.length,
		textPreserved: checks.filter((check) => check.textPreserved).length,
		boundaries: rates(
			sum("matchedBoundaries"),
			sum("predictedBoundaries"),
			sum("goldBoundaries"),
		),
		sentences: rates(
			sum("exactSentences"),
			sum("predictedSentences"),
			sum("goldSentences"),
		),
		paragraphs: {
			gold: sum("goldParagraphs"),
			predicted: sum("predictedParagraphs"),
		},
	};
}
