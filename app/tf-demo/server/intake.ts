import {
	type DetectedLanguage,
	type Dumgen,
	type LanguagedText,
	type Scroll,
	type SegmentedText,
	splitScroll,
	stitchedText,
} from "dumgen";
import * as Effect from "effect/Effect";
import type { ScrollLanguage } from "../shared/supported-target-language";
import { assertNonEmpty } from "./identifiers";
import { inspectionStep } from "./inspectionCapture";
import {
	detectionSlice,
	fitsSegments,
	joinedSentence,
	type SentenceParts,
	sentenceParts,
} from "./longSentences";
import {
	type StoredSegmentValue,
	type StoredUnit,
	storedUnitOf,
} from "./storedSegments";
import { assertTextSubmissionWithinLimits } from "./textSubmissionLimits";

/**
 * Intake (map #1175, #1178): a Scroll's Extracted Text is split into
 * paragraphs and Sentences in code (`splitScroll`), Dumgen's
 * `language.detect` gives each Sentence its Detected Language, only the
 * Sentences in the Scroll's target language are cut into Segments and
 * biggest units by `segment.inUnits`, and the Scroll is stored with its
 * Extracted Text, so a later run starts from it. Every other Sentence is a
 * Plain Sentence: stored with its Detected Language, or none when it stayed
 * undetermined, and with no Segments, so the reader shows it unclickable.
 * German is the only target language for now; the language stays a
 * parameter so Hebrew can follow.
 */

/** What a Visitor reads when a Scroll in another language is turned away. */
export const GERMAN_ONLY_MESSAGE =
	"tf-demo reads German Texts only for now. Support for other languages is planned.";

/** Why intake turns a Scroll in `language` away, or undefined for German. */
export function unsupportedLanguageMessage(
	language: ScrollLanguage,
): string | undefined {
	return language === "de" ? undefined : GERMAN_ONLY_MESSAGE;
}

/** What a Visitor reads when the deployment has no TypeSafe key for intake. */
export const INTAKE_NOT_CONFIGURED_MESSAGE =
	"Intake isn't configured: TYPESAFE_API_KEY is missing on the Convex deployment. Run `bun run env:sync` and restart the dev server.";

/** A Scroll's Sentences in reading order, as intake splits its Extracted Text. */
export function sourceSentencesOf(extracted: Scroll): string[] {
	return splitScroll(extracted).paragraphs.flatMap(({ sentences }) => [
		...sentences,
	]);
}

/** One Sentence as intake hands it to storage. */
export type SubmittedSentence = {
	readonly segmentedSentenceId: string;
	/** The Sentence's place in the Scroll, counted across paragraphs from 0. */
	readonly position: number;
	/** The paragraph the Sentence reads in; Sentences sharing one run together. */
	readonly paragraph: number;
	/**
	 * The Sentence's Detected Language; absent when it stayed undetermined.
	 * Any but the Scroll's target language makes it a Plain Sentence, with no
	 * Segments and no units.
	 */
	readonly language?: DetectedLanguage;
	/** The Sentence's normalized text; its Segments concatenate to it. */
	readonly stitchedText: string;
	/** A fused word arrives as its pieces when segmentation split it. */
	readonly segments: readonly StoredSegmentValue[];
	/**
	 * Every ResolvableText Segment belongs to exactly one unit, unless the
	 * Sentence's segmentation failed.
	 */
	readonly units: readonly StoredUnit[];
	/**
	 * Present when `segment.inUnits` failed for the Sentence: it has no
	 * units, and the reader shows it as not segmented (#861).
	 */
	readonly segmentationFailed?: true;
};

export type SubmittedScroll = {
	readonly submissionKey: string;
	readonly sourceText: string;
	/**
	 * The Scroll's Extracted Text, what later runs start from: Flags,
	 * segmentation fixes, curators' edits.
	 */
	readonly extractedText: Scroll;
	readonly sentences: readonly SubmittedSentence[];
};

/** Where intake stores a segmented Scroll; Convex supplies it, a test an in-memory one. */
export type IntakePersistence = {
	persistSubmittedScroll(
		input: SubmittedScroll,
	): Promise<{ readonly scrollId: string }>;
};

export type SubmitTextInput = {
	readonly submissionKey: string;
	readonly sourceText: string;
	/**
	 * The Scroll's Extracted Text: the stored one when the Scroll was
	 * submitted before, else `extractPastedText(sourceText)`.
	 */
	readonly extractedText: Scroll;
	/** The Scroll's target language. */
	readonly language: ScrollLanguage;
};

type LanguagedParagraphs = LanguagedText["paragraphs"];

/** The target-language Sentences, by paragraph, with no paragraph left empty. */
function targetParagraphs(
	paragraphs: LanguagedParagraphs,
	language: ScrollLanguage,
) {
	return paragraphs
		.map(({ sentences }) => ({
			sentences: sentences
				.filter((sentence) => sentence.language === language)
				.map(({ text }) => text),
		}))
		.filter(({ sentences }) => sentences.length > 0);
}

/** One Sentence as intake analyzed it, before storage gives it its place. */
export type AnalyzedSentence = Omit<
	SubmittedSentence,
	"segmentedSentenceId" | "position" | "paragraph"
>;

/**
 * Every Sentence as tf-demo stores it, by paragraph: a target-language
 * Sentence with its Segments and units in the order `segment.inUnits`
 * returned them, any other as a Plain Sentence.
 */
function analyzedSentences(
	paragraphs: LanguagedParagraphs,
	language: ScrollLanguage,
	segmented: SegmentedText | undefined,
): AnalyzedSentence[][] {
	const segmentedSentences =
		segmented?.paragraphs.flatMap(({ sentences }) => sentences) ?? [];
	let next = 0;
	return paragraphs.map(({ sentences }) =>
		sentences.map((sentence): AnalyzedSentence => {
			const detected =
				sentence.language === undefined
					? {}
					: { language: sentence.language };
			if (sentence.language !== language)
				return {
					...detected,
					stitchedText: stitchedText(sentence.text),
					segments: [],
					units: [],
				};
			const cut = segmentedSentences[next++];
			if (cut === undefined)
				throw new Error(
					"segment.inUnits returned fewer Sentences than it was given.",
				);
			return {
				...detected,
				stitchedText: cut.text,
				segments: cut.segments.map(({ kind, text, surface }) =>
					surface === undefined
						? { kind, text }
						: { kind, text, surface },
				),
				units: cut.units.map(storedUnitOf),
				...(cut.failed ? { segmentationFailed: true as const } : {}),
			};
		}),
	);
}

/** The Dumgen operations intake runs. */
export type IntakeDumgen = Pick<Dumgen, "language" | "segment">;

/**
 * Intake's analysis of Sentences already split, the one path a paste and a
 * Folio's window share: `language.detect` gives each its Detected
 * Language, and only the target-language ones go to `segment.inUnits`.
 * A Sentence over the bound is read within it (`longSentences.ts`).
 * `onSegmenting` hears which go, by index across paragraphs, once for each
 * part `segment.inUnits` reads.
 */
export function analyzeParagraphs(
	dumgen: IntakeDumgen,
	paragraphs: readonly { readonly sentences: readonly string[] }[],
	language: ScrollLanguage,
	onSegmenting?: (positions: readonly number[]) => void,
) {
	return Effect.gen(function* () {
		const asked = paragraphs.map(({ sentences }) => ({
			sentences: sentences.map((sentence) => detectionSlice(sentence)),
		}));
		const detection = yield* dumgen.language
			.detect({ paragraphs: asked })
			.pipe(
				Effect.withSpan(
					"Detect sentence languages",
					inspectionStep("battery/dumgen · language.detect", {
						paragraphs: asked,
					}),
				),
			);
		// Detection may have read a long Sentence's opening only.
		const detected: LanguagedParagraphs = detection.paragraphs.map(
			({ sentences }, paragraph) => ({
				sentences: sentences.map(({ text: slice, language }, index) => {
					const text =
						paragraphs[paragraph]?.sentences[index] ?? slice;
					return language === undefined || !fitsSegments(text)
						? { text }
						: { text, language };
				}),
			}),
		);
		const target = targetParagraphs(detected, language).map(
			({ sentences }) =>
				sentences.map((sentence) => sentenceParts(sentence)),
		);
		const targetPositions = detected
			.flatMap(({ sentences }) => sentences)
			.flatMap((sentence, position) =>
				sentence.language === language ? [position] : [],
			);
		const targetParts = target.flat();
		onSegmenting?.(
			targetParts.flatMap(({ parts }, index) =>
				parts.map(() => targetPositions[index] ?? index),
			),
		);
		const segmentedParagraphs = target.map((sentences) => ({
			sentences: sentences.flatMap(({ parts }) => parts),
		}));
		// A Sentence whose calls fail comes back marked, so this step
		// fails only on a bug or an interruption.
		const segmented =
			target.length === 0
				? undefined
				: yield* dumgen.segment
						.inUnits({
							language: "de",
							paragraphs: segmentedParagraphs,
						})
						.pipe(
							Effect.withSpan(
								"Segment sentences in units",
								inspectionStep(
									"battery/dumgen · segment.inUnits",
									{ paragraphs: segmentedParagraphs },
								),
							),
						);
		return analyzedSentences(
			detected,
			language,
			segmented && joinedParts(segmented, targetParts),
		);
	});
}

/** Each long Sentence's parts, as `segment.inUnits` cut them, joined back into one. */
function joinedParts(
	segmented: SegmentedText,
	sentences: readonly SentenceParts[],
): SegmentedText {
	const parts = segmented.paragraphs.flatMap(({ sentences }) => sentences);
	let next = 0;
	return {
		language: segmented.language,
		paragraphs: [
			{
				sentences: sentences.map((sentence) => {
					const cut = parts.slice(next, next + sentence.parts.length);
					next += sentence.parts.length;
					return joinedSentence(cut, sentence);
				}),
			},
		],
	};
}

/**
 * Every analyzed Sentence placed in its Scroll, positions counted across
 * paragraphs. A Sentence's ID is its submission's key and position, so a
 * retried submission names the same Sentences.
 */
function submittedSentences(
	submissionKey: string,
	paragraphs: readonly (readonly AnalyzedSentence[])[],
): SubmittedSentence[] {
	let position = 0;
	return paragraphs.flatMap((sentences, paragraph) =>
		sentences.map((sentence) => {
			const at = position++;
			return {
				segmentedSentenceId: `${submissionKey}#${at}`,
				position: at,
				paragraph,
				...sentence,
			};
		}),
	);
}

export function createIntake(options: {
	/**
	 * `createDumgen({ jev })` with the host's jev, for `language.detect`
	 * and `segment.inUnits`; a test passes one with a fake jev.
	 */
	readonly dumgen: IntakeDumgen;
	readonly persistence: IntakePersistence;
	/**
	 * Hears which Sentences go to `segment.inUnits`, by position, in the
	 * order it counts them; the intake run reads its trace by them.
	 */
	readonly onSegmenting?: (positions: readonly number[]) => void;
}) {
	function submitText(input: SubmitTextInput) {
		return Effect.gen(function* () {
			assertNonEmpty(input.submissionKey, "submissionKey");
			assertNonEmpty(input.sourceText, "sourceText");
			const rejection = unsupportedLanguageMessage(input.language);
			if (rejection !== undefined) throw new Error(rejection);

			const { paragraphs } = yield* Effect.sync(() =>
				splitScroll(input.extractedText),
			).pipe(
				Effect.withSpan(
					"Split text into sentences",
					inspectionStep("battery/dumgen · splitScroll", {
						extractedText: input.extractedText,
					}),
				),
			);
			const sentences = paragraphs.flatMap(({ sentences }) => sentences);
			assertTextSubmissionWithinLimits(input.sourceText, sentences);
			if (sentences.length === 0)
				throw new Error("Text submission contains no sentences.");

			const analyzed = yield* analyzeParagraphs(
				options.dumgen,
				paragraphs,
				input.language,
				options.onSegmenting,
			);
			const submission: SubmittedScroll = {
				submissionKey: input.submissionKey,
				sourceText: input.sourceText,
				extractedText: input.extractedText,
				sentences: submittedSentences(input.submissionKey, analyzed),
			};
			const persisted = yield* Effect.tryPromise(() =>
				options.persistence.persistSubmittedScroll(submission),
			).pipe(
				Effect.withSpan(
					"Persist submitted text",
					inspectionStep("app/tf-demo", submission),
				),
			);
			return { submission, persisted };
		});
	}

	return Object.freeze({ submitText });
}
