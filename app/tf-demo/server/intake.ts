import { type Dumgen, type SegmentedText, splitText } from "dumgen";
import * as Effect from "effect/Effect";
import { inspectionStep } from "./inspectionCapture";
import {
	type StoredSegmentValue,
	type StoredUnit,
	storedUnitOf,
} from "./storedSegments";
import { assertTextSubmissionWithinLimits } from "./textSubmissionLimits";

/**
 * Intake: a submitted Text is split into paragraphs and Sentences in code
 * (`splitText`), each Sentence is cut into its Segments and biggest units by
 * Dumgen's `segment.inUnits`, and the Text is stored with them. Intake reads
 * German only for now; the language stays a parameter so Hebrew can follow.
 */

/** The languages a Text names when it is submitted. */
export type SubmissionLanguage = "de" | "en" | "he";

/** What a Visitor reads when a Text in another language is turned away. */
export const GERMAN_ONLY_MESSAGE =
	"tf-demo reads German Texts only for now. Support for other languages is planned.";

/** Why intake turns a Text in `language` away, or undefined for German. */
export function unsupportedLanguageMessage(
	language: SubmissionLanguage,
): string | undefined {
	return language === "de" ? undefined : GERMAN_ONLY_MESSAGE;
}

/** What a Visitor reads when the deployment has no TypeSafe key for intake. */
export const INTAKE_NOT_CONFIGURED_MESSAGE =
	"Intake isn't configured: TYPESAFE_API_KEY is missing on the Convex deployment. Run `bun run env:sync` and restart the dev server.";

/** A Text's Sentences in reading order, as `splitText` splits them. */
export function sourceSentencesOf(text: string): string[] {
	return splitText(text).paragraphs.flatMap(({ sentences }) => [
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
	readonly language: "de";
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
	readonly language: SubmissionLanguage;
};

/**
 * Each Segmented Sentence as tf-demo stores it, positions counted across
 * paragraphs. A Sentence's ID is its submission's key and position, so a
 * retried submission names the same Sentences.
 */
function submittedSentences(
	submissionKey: string,
	text: SegmentedText,
): SubmittedSentence[] {
	let position = 0;
	return text.paragraphs.flatMap(({ sentences }, paragraph) =>
		sentences.map((sentence) => {
			const at = position++;
			return {
				segmentedSentenceId: `${submissionKey}#${at}`,
				position: at,
				paragraph,
				language: text.language,
				stitchedText: sentence.text,
				segments: sentence.segments.map(({ kind, text, surface }) =>
					surface === undefined
						? { kind, text }
						: { kind, text, surface },
				),
				units: sentence.units.map(storedUnitOf),
				...(sentence.failed
					? { segmentationFailed: true as const }
					: {}),
			};
		}),
	);
}

export function createIntake(options: {
	/** `createDumgen({ jev }).segment` with the host's jev; a test passes a fake jev. */
	readonly segment: Dumgen["segment"];
	readonly persistence: IntakePersistence;
}) {
	function submitText(input: SubmitTextInput) {
		return Effect.gen(function* () {
			assertNonEmpty(input.submissionKey, "submissionKey");
			assertNonEmpty(input.sourceText, "sourceText");
			const rejection = unsupportedLanguageMessage(input.language);
			if (rejection !== undefined) throw new Error(rejection);

			const { paragraphs } = yield* Effect.sync(() =>
				splitText(input.sourceText),
			).pipe(
				Effect.withSpan(
					"Split text into sentences",
					inspectionStep("battery/dumgen · splitText", {
						sourceText: input.sourceText,
					}),
				),
			);
			const sentences = paragraphs.flatMap(({ sentences }) => sentences);
			assertTextSubmissionWithinLimits(input.sourceText, sentences);
			if (sentences.length === 0)
				throw new Error("Text submission contains no sentences.");

			// A Sentence whose calls fail comes back marked, so this step
			// fails only on a bug or an interruption.
			const segmented = yield* options.segment
				.inUnits({ language: "de", paragraphs })
				.pipe(
					Effect.withSpan(
						"Segment sentences in units",
						inspectionStep("battery/dumgen · segment.inUnits", {
							paragraphs,
						}),
					),
				);
			const submission: SubmittedText = {
				submissionKey: input.submissionKey,
				sourceText: input.sourceText,
				sentences: submittedSentences(input.submissionKey, segmented),
			};
			const persisted = yield* Effect.tryPromise(() =>
				options.persistence.persistSubmittedText(submission),
			).pipe(
				Effect.withSpan(
					"Persist submitted text",
					inspectionStep("app/tf-demo", submission),
				),
			);
			return { segmented, persisted };
		});
	}

	return Object.freeze({ submitText });
}

function assertNonEmpty(value: string, field: string): void {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new TypeError(`${field} must be a non-empty string.`);
	}
}
