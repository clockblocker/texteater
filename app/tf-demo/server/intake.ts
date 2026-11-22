import { type Scroll, splitScroll } from "dumgen";
import * as Effect from "effect/Effect";
import type { ScrollLanguage } from "../shared/supported-target-language";
import { assertNonEmpty } from "./identifiers";
import { annotateInspectionStep } from "./inspectionCapture";
import {
	type AnalyzedSentence,
	analyzeParagraphs,
	type IntakeDumgen,
	type IntakeObserver,
} from "./intakeAnalysis";
import { assertTextSubmissionWithinLimits } from "./textSubmissionLimits";

/**
 * Intake (map #1175, #1178): a Scroll's Extracted Text is split into
 * paragraphs and Sentences in code (`splitScroll`); Dumgen's
 * `language.detect` gives each Sentence its Detected Language while
 * `segment.inUnits` cuts the ones code leaves possibly in the target
 * language into Segments and biggest units (`intakeAnalysis.ts`); and the
 * Scroll is stored with its Extracted Text, so a later run starts from it.
 * A Sentence detected in another language, or in none, is a Plain
 * Sentence: stored with its Detected Language, or none when it stayed
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
export type SubmittedSentence = AnalyzedSentence & {
	readonly segmentedSentenceId: string;
	/** The Sentence's place in the Scroll, counted across paragraphs from 0. */
	readonly position: number;
	/** The paragraph the Sentence reads in; Sentences sharing one run together. */
	readonly paragraph: number;
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

const splitExtractedScroll = Effect.fn("Split text into sentences")(function* (
	extractedText: Scroll,
) {
	yield* annotateInspectionStep("battery/dumgen · splitScroll", {
		extractedText,
	});
	return splitScroll(extractedText);
});

export function createIntake(options: {
	/** Dumgen's `language.detect` and `segment.inUnits`: `operations`. */
	readonly dumgen: IntakeDumgen;
	readonly persistence: IntakePersistence;
	/**
	 * Hears which Sentences go to `segment.inUnits` and which end Plain, by
	 * position; the intake run reads its trace by them.
	 */
	readonly observer?: IntakeObserver;
}) {
	const persistSubmittedScroll = Effect.fn("Persist submitted text")(
		function* (submission: SubmittedScroll) {
			yield* annotateInspectionStep("app/tf-demo", submission);
			return yield* Effect.tryPromise(() =>
				options.persistence.persistSubmittedScroll(submission),
			);
		},
	);

	const submitText = Effect.fn("Intake.submitText")(function* (
		input: SubmitTextInput,
	) {
		assertNonEmpty(input.submissionKey, "submissionKey");
		assertNonEmpty(input.sourceText, "sourceText");
		const rejection = unsupportedLanguageMessage(input.language);
		if (rejection !== undefined) throw new Error(rejection);

		const { paragraphs } = yield* splitExtractedScroll(input.extractedText);
		const sentences = paragraphs.flatMap(({ sentences }) => sentences);
		assertTextSubmissionWithinLimits(input.sourceText, sentences);
		if (sentences.length === 0)
			throw new Error("Text submission contains no sentences.");

		const analyzed = yield* analyzeParagraphs(
			options.dumgen,
			paragraphs,
			input.language,
			options.observer,
		);
		const submission: SubmittedScroll = {
			submissionKey: input.submissionKey,
			sourceText: input.sourceText,
			extractedText: input.extractedText,
			sentences: submittedSentences(input.submissionKey, analyzed),
		};
		const persisted = yield* persistSubmittedScroll(submission);
		return { submission, persisted };
	});

	return Object.freeze({ submitText });
}
