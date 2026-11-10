import {
	type DetectedLanguage,
	type operations,
	type SegmentedSentence,
	stitchedText,
} from "dumgen";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type { ScrollLanguage } from "../shared/supported-target-language";
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

/*
 * Intake's analysis of Sentences already split, the one path a paste and a
 * Folio's window share. It makes two results side by side and joins them
 * Sentence by Sentence:
 *
 * - `language.detect` gives each Sentence its Detected Language.
 * - `segment.inUnits` cuts every Sentence code leaves possibly in the
 *   target language (`mayBeIn`) and short enough to store (`fitsSegments`),
 *   a long one in parts (`longSentences.ts`).
 *
 * A Sentence is stored in the target language, with its Segments and
 * units, only when both agree: detected in it, and cut. Every other
 * Sentence is a Plain Sentence, and the cut of one detected in another
 * language is dropped. When detection fails, each Sentence that was cut is
 * taken to be in the Scroll's language, so the Scroll keeps its Segments;
 * a Sentence whose segmentation fails comes back marked, alone. Neither
 * result waits for the other, and only a bug or an interruption fails the
 * analysis.
 */

/** One Sentence as intake analyzed it, before storage gives it its place. */
export type AnalyzedSentence = {
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

/**
 * The Dumgen operations intake runs, which need `Jev`: the action provides
 * its `DumgenLive`, and a test one over a fake jev.
 */
export type IntakeDumgen = Pick<typeof operations, "language" | "segment">;

/** What an analysis tells its caller as it goes, by position across paragraphs. */
export type IntakeObserver = {
	/** The Sentences `segment.inUnits` reads, in its order, once for each part. */
	readonly segmenting?: (positions: readonly number[]) => void;
	/** The Sentences stored as Plain Sentences, once the results are joined. */
	readonly plain?: (positions: readonly number[]) => void;
};

type Paragraphs = readonly { readonly sentences: readonly string[] }[];

const words = /\p{L}[\p{L}\p{M}]*/gu;

/** The script each Scroll language is written in, matched on a word's first letter. */
const scriptOf = {
	de: /^\p{Script=Latin}/u,
	en: /^\p{Script=Latin}/u,
	he: /^\p{Script=Hebrew}/u,
} as const satisfies Record<ScrollLanguage, RegExp>;

/**
 * Whether code leaves `sentence` possibly in `language`, before any model
 * call: it has no letter, so it takes the language around it, or most of
 * its words are in the language's script. Words count, not letters, as in
 * `language.detect`'s own script verdict, so a long name in another script
 * does not outweigh the Sentence around it.
 */
export function mayBeIn(sentence: string, language: ScrollLanguage): boolean {
	const written = sentence.match(words) ?? [];
	if (written.length === 0) return true;
	const inScript = written.filter((word) =>
		scriptOf[language].test(word),
	).length;
	return inScript * 2 > written.length;
}

/** Each Sentence's position across paragraphs, with its paragraph. */
function placed(paragraphs: Paragraphs) {
	return paragraphs.flatMap(({ sentences }, paragraph) =>
		sentences.map((text) => ({ text, paragraph })),
	);
}

/**
 * Each Sentence's Detected Language by position, or undefined when
 * `language.detect` brought no usable answer. Detection reads a long
 * Sentence's opening only.
 */
function detectedLanguages(dumgen: IntakeDumgen, paragraphs: Paragraphs) {
	const asked = paragraphs.map(({ sentences }) => ({
		sentences: sentences.map((sentence) => detectionSlice(sentence)),
	}));
	return dumgen.language.detect({ paragraphs: asked }).pipe(
		Effect.withSpan(
			"Detect sentence languages",
			inspectionStep("battery/dumgen · language.detect", {
				paragraphs: asked,
			}),
		),
		Effect.result,
		Effect.map((detection) =>
			Result.isFailure(detection)
				? undefined
				: detection.success.paragraphs.flatMap(({ sentences }) =>
						sentences.map(({ language }) => language),
					),
		),
	);
}

/**
 * The cut of every Sentence `cut` names, by position: `segment.inUnits`
 * reads each in its paragraph, a long one in parts joined back into one.
 */
function cutSentences(
	dumgen: IntakeDumgen,
	paragraphs: Paragraphs,
	cut: (position: number) => boolean,
	observer: IntakeObserver | undefined,
) {
	return Effect.gen(function* () {
		const asked: { position: number; parts: SentenceParts }[][] = [];
		let position = 0;
		for (const { sentences } of paragraphs) {
			const paragraph: { position: number; parts: SentenceParts }[] = [];
			for (const sentence of sentences) {
				if (cut(position))
					paragraph.push({
						position,
						parts: sentenceParts(sentence),
					});
				position++;
			}
			if (paragraph.length > 0) asked.push(paragraph);
		}
		const sentences = asked.flat();
		observer?.segmenting?.(
			sentences.flatMap(({ position, parts }) =>
				parts.parts.map(() => position),
			),
		);
		const cuts = new Map<number, SegmentedSentence>();
		if (sentences.length === 0) return cuts;
		const segmentedParagraphs = asked.map((paragraph) => ({
			sentences: paragraph.flatMap(({ parts }) => parts.parts),
		}));
		// A Sentence whose calls fail comes back marked, so this step
		// fails only on a bug or an interruption.
		const segmented = yield* dumgen.segment
			.inUnits({ language: "de", paragraphs: segmentedParagraphs })
			.pipe(
				Effect.withSpan(
					"Segment sentences in units",
					inspectionStep("battery/dumgen · segment.inUnits", {
						paragraphs: segmentedParagraphs,
					}),
				),
			);
		const parts = segmented.paragraphs.flatMap(
			({ sentences }) => sentences,
		);
		let next = 0;
		for (const sentence of sentences) {
			const count = sentence.parts.parts.length;
			cuts.set(
				sentence.position,
				joinedSentence(parts.slice(next, next + count), sentence.parts),
			);
			next += count;
		}
		if (next !== parts.length)
			throw new Error(
				"segment.inUnits returned other Sentences than it was given.",
			);
		return cuts;
	});
}

/**
 * One Sentence as both results leave it: in the target language with its
 * cut when detection agrees, else Plain. A Plain Sentence keeps its
 * Detected Language unless that is the target language code ruled out,
 * which leaves it undetermined.
 */
function joined(
	text: string,
	detected: DetectedLanguage | undefined,
	cut: SegmentedSentence | undefined,
	language: ScrollLanguage,
): AnalyzedSentence {
	if (detected === language && cut)
		return {
			language: detected,
			stitchedText: cut.text,
			segments: cut.segments.map(({ kind, text, surface }) =>
				surface === undefined
					? { kind, text }
					: { kind, text, surface },
			),
			units: cut.units.map(storedUnitOf),
			...(cut.failed ? { segmentationFailed: true as const } : {}),
		};
	return {
		...(detected === undefined || detected === language
			? {}
			: { language: detected }),
		stitchedText: stitchedText(text),
		segments: [],
		units: [],
	};
}

/**
 * Analyzes Sentences already split, by paragraph: detection and
 * segmentation side by side, joined Sentence by Sentence (see above).
 */
export function analyzeParagraphs(
	dumgen: IntakeDumgen,
	paragraphs: Paragraphs,
	language: ScrollLanguage,
	observer?: IntakeObserver,
) {
	return Effect.gen(function* () {
		const sentences = placed(paragraphs);
		const cut = sentences.map(
			({ text }) => fitsSegments(text) && mayBeIn(text, language),
		);
		const [detected, cuts] = yield* Effect.all(
			[
				detectedLanguages(dumgen, paragraphs),
				cutSentences(
					dumgen,
					paragraphs,
					(position) => cut[position] === true,
					observer,
				),
			],
			{ concurrency: "unbounded" },
		);
		const analyzed = sentences.map(({ text }, position) =>
			joined(
				text,
				// Without detection, a Sentence that was cut is in the
				// Scroll's language.
				detected === undefined
					? cut[position]
						? language
						: undefined
					: detected[position],
				cuts.get(position),
				language,
			),
		);
		observer?.plain?.(
			analyzed.flatMap((sentence, position) =>
				sentence.segments.length === 0 ? [position] : [],
			),
		);
		return paragraphs.map((_, paragraph) =>
			analyzed.filter(
				(_, position) => sentences[position]?.paragraph === paragraph,
			),
		);
	});
}
