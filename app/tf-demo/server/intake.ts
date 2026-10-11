import {
	type DetectedLanguage,
	type Dumgen,
	type ExtractedText,
	type LanguagedText,
	type SegmentedText,
	splitExtractedText,
	stitchedText,
} from "dumgen";
import * as Effect from "effect/Effect";
import type { TextLanguage } from "../shared/supported-target-language";
import { assertNonEmpty } from "./identifiers";
import { inspectionStep } from "./inspectionCapture";
import {
	type StoredSegmentValue,
	type StoredUnit,
	storedUnitOf,
} from "./storedSegments";
import { assertTextSubmissionWithinLimits } from "./textSubmissionLimits";

/**
 * Intake (map #1175, #1178): a Submission's Extracted Text is split into
 * paragraphs and Sentences in code (`splitExtractedText`), Dumgen's
 * `language.detect` gives each Sentence its Detected Language, only the
 * Sentences in the Text's target language are cut into Segments and
 * biggest units by `segment.inUnits`, and the Text is stored with its
 * Extracted Text, so a later run starts from it. Every other Sentence is a
 * Plain Sentence: stored with its Detected Language, or none when it stayed
 * undetermined, and with no Segments, so the reader shows it unclickable.
 * German is the only target language for now; the language stays a
 * parameter so Hebrew can follow.
 */

/** What a Visitor reads when a Text in another language is turned away. */
export const GERMAN_ONLY_MESSAGE =
	"tf-demo reads German Texts only for now. Support for other languages is planned.";

/** Why intake turns a Text in `language` away, or undefined for German. */
export function unsupportedLanguageMessage(
	language: TextLanguage,
): string | undefined {
	return language === "de" ? undefined : GERMAN_ONLY_MESSAGE;
}

/** What a Visitor reads when the deployment has no TypeSafe key for intake. */
export const INTAKE_NOT_CONFIGURED_MESSAGE =
	"Intake isn't configured: TYPESAFE_API_KEY is missing on the Convex deployment. Run `bun run env:sync` and restart the dev server.";

/** A Text's Sentences in reading order, as intake splits its Extracted Text. */
export function sourceSentencesOf(extracted: ExtractedText): string[] {
	return splitExtractedText(extracted).paragraphs.flatMap(({ sentences }) => [
		...sentences,
	]);
}

/** One Sentence as intake hands it to storage. */
export type SubmittedSentence = {
	readonly segmentedSentenceId: string;
	/** The Sentence's place in the Text, counted across paragraphs from 0. */
	readonly position: number;
	/** The paragraph the Sentence reads in; Sentences sharing one run together. */
	readonly paragraph: number;
	/**
	 * The Sentence's Detected Language; absent when it stayed undetermined.
	 * Any but the Text's target language makes it a Plain Sentence, with no
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

export type SubmittedText = {
	readonly submissionKey: string;
	readonly sourceText: string;
	/** What later runs start from: Flags, segmentation fixes, curators' edits. */
	readonly extractedText: ExtractedText;
	readonly sentences: readonly SubmittedSentence[];
};

/** Where intake stores a segmented Text; Convex supplies it, a test an in-memory one. */
export type IntakePersistence = {
	persistSubmittedText(
		input: SubmittedText,
	): Promise<{ readonly textId: string }>;
};

export type SubmitTextInput = {
	readonly submissionKey: string;
	readonly sourceText: string;
	/**
	 * The Submission's Extracted Text: the stored one when the Text was
	 * submitted before, else `extractPastedText(sourceText)`.
	 */
	readonly extractedText: ExtractedText;
	/** The Text's target language. */
	readonly language: TextLanguage;
};

type LanguagedParagraphs = LanguagedText["paragraphs"];

/** The target-language Sentences, by paragraph, with no paragraph left empty. */
function targetParagraphs(
	paragraphs: LanguagedParagraphs,
	language: TextLanguage,
) {
	return paragraphs
		.map(({ sentences }) => ({
			sentences: sentences
				.filter((sentence) => sentence.language === language)
				.map(({ text }) => text),
		}))
		.filter(({ sentences }) => sentences.length > 0);
}

/**
 * Every Sentence as tf-demo stores it, positions counted across
 * paragraphs: a target-language Sentence with its Segments and units in
 * the order `segment.inUnits` returned them, any other as a Plain
 * Sentence. A Sentence's ID is its submission's key and position, so a
 * retried submission names the same Sentences.
 */
function submittedSentences(
	submissionKey: string,
	paragraphs: LanguagedParagraphs,
	language: TextLanguage,
	segmented: SegmentedText | undefined,
): SubmittedSentence[] {
	const segmentedSentences =
		segmented?.paragraphs.flatMap(({ sentences }) => sentences) ?? [];
	let position = 0;
	let next = 0;
	return paragraphs.flatMap(({ sentences }, paragraph) =>
		sentences.map((sentence) => {
			const at = position++;
			const placed = {
				segmentedSentenceId: `${submissionKey}#${at}`,
				position: at,
				paragraph,
				...(sentence.language === undefined
					? {}
					: { language: sentence.language }),
			};
			if (sentence.language !== language)
				return {
					...placed,
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
				...placed,
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

export function createIntake(options: {
	/**
	 * `createDumgen({ jev })` with the host's jev, for `language.detect`
	 * and `segment.inUnits`; a test passes one with a fake jev.
	 */
	readonly dumgen: Pick<Dumgen, "language" | "segment">;
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
				splitExtractedText(input.extractedText),
			).pipe(
				Effect.withSpan(
					"Split text into sentences",
					inspectionStep("battery/dumgen · splitExtractedText", {
						extractedText: input.extractedText,
					}),
				),
			);
			const sentences = paragraphs.flatMap(({ sentences }) => sentences);
			assertTextSubmissionWithinLimits(input.sourceText, sentences);
			if (sentences.length === 0)
				throw new Error("Text submission contains no sentences.");

			const detected = yield* options.dumgen.language
				.detect({ paragraphs })
				.pipe(
					Effect.withSpan(
						"Detect sentence languages",
						inspectionStep("battery/dumgen · language.detect", {
							paragraphs,
						}),
					),
				);
			const target = targetParagraphs(
				detected.paragraphs,
				input.language,
			);
			options.onSegmenting?.(
				detected.paragraphs
					.flatMap(({ sentences }) => sentences)
					.flatMap(({ language }, position) =>
						language === input.language ? [position] : [],
					),
			);
			// A Sentence whose calls fail comes back marked, so this step
			// fails only on a bug or an interruption.
			const segmented =
				target.length === 0
					? undefined
					: yield* options.dumgen.segment
							.inUnits({ language: "de", paragraphs: target })
							.pipe(
								Effect.withSpan(
									"Segment sentences in units",
									inspectionStep(
										"battery/dumgen · segment.inUnits",
										{ paragraphs: target },
									),
								),
							);
			const submission: SubmittedText = {
				submissionKey: input.submissionKey,
				sourceText: input.sourceText,
				extractedText: input.extractedText,
				sentences: submittedSentences(
					input.submissionKey,
					detected.paragraphs,
					input.language,
					segmented,
				),
			};
			const persisted = yield* Effect.tryPromise(() =>
				options.persistence.persistSubmittedText(submission),
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
