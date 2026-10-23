import type { Jev } from "dumgen";
import * as Effect from "effect/Effect";
import type { ScrollLanguage } from "../shared/supported-target-language";
import {
	type AnalyzedSentence,
	analyzeParagraphs,
	type IntakeDumgen,
} from "./intake";
import { logged } from "./logging";

/**
 * A book's Folio through intake, once the Learner asks for it (#1216).
 * Each window of the Folio's unprocessed Sentences goes through the
 * paste's own analysis (`analyzeParagraphs`: `language.detect`, then
 * `segment.inUnits` on the target-language ones), grouped back into their
 * paragraphs, and comes back by Sentence ID, so storing it fills in the
 * Sentences the reader already shows as plain text.
 */

/** A stored, unprocessed Sentence of a window. */
type WindowSentence = {
	readonly sentenceId: string;
	readonly paragraph: number;
	readonly stitchedText: string;
};

/** A window's Sentence as intake analyzed it, by its stored ID. */
export type ProcessedSentence<Id extends string = string> = AnalyzedSentence & {
	readonly sentenceId: Id;
};

/** The window's Sentences in their paragraphs. */
function paragraphsOf(sentences: readonly WindowSentence[]) {
	const paragraphs: { sentences: string[] }[] = [];
	let previous: WindowSentence | undefined;
	for (const sentence of sentences) {
		const last = paragraphs.at(-1);
		if (last && sentence.paragraph === previous?.paragraph)
			last.sentences.push(sentence.stitchedText);
		else paragraphs.push({ sentences: [sentence.stitchedText] });
		previous = sentence;
	}
	return paragraphs;
}

/**
 * Analyzes one window. It fails as `language.detect` does, when jev brings
 * no usable answer; a Sentence `segment.inUnits` could not cut comes back
 * marked, as for a paste.
 */
function analyzeWindow<Id extends string>(
	dumgen: IntakeDumgen,
	window: readonly (WindowSentence & { readonly sentenceId: Id })[],
	language: ScrollLanguage,
) {
	return analyzeParagraphs(dumgen, paragraphsOf(window), language).pipe(
		Effect.map((paragraphs) => {
			const analyzed = paragraphs.flat();
			return window.map((sentence, index): ProcessedSentence<Id> => {
				const result = analyzed[index];
				if (result === undefined)
					throw new Error(
						"Intake analyzed fewer Sentences than asked.",
					);
				return { ...result, sentenceId: sentence.sentenceId };
			});
		}),
	);
}

/** The next window a run processes, as storage hands it out. */
export type FolioWindow = {
	readonly sentences: readonly WindowSentence[];
};

/** The stored IDs of a window's Sentences. */
type SentenceIdOf<Window extends FolioWindow> =
	Window["sentences"][number]["sentenceId"];

/** What a run asks of storage; the Convex action passes its mutations. */
export type FolioProcessingPort<Window extends FolioWindow> = {
	/**
	 * The next window of the Folio's unprocessed Sentences, or null once
	 * none is left, which marks the Folio processed, or once the run no
	 * longer holds the Folio.
	 */
	readonly nextWindow: () => Promise<Window | null>;
	readonly storeWindow: (
		sentences: readonly ProcessedSentence<SentenceIdOf<Window>>[],
	) => Promise<unknown>;
	/** Marks the Folio failed, so the Learner may ask for it again. */
	readonly failed: () => Promise<unknown>;
};

/** How a run ended: the Folio done, failed, or the action out of time. */
export type FolioRunEnd =
	| { readonly kind: "Done" }
	| { readonly kind: "Failed" }
	| { readonly kind: "Continue" };

/**
 * Processes one Folio window by window until none is left, or `hasTime`
 * says the action should hand over to a fresh one. A window that fails,
 * in jev or in storing, fails the Folio; what was stored before it stays,
 * and the next request starts with what is left. It needs `Jev`, which
 * the action provides once for all its windows.
 */
export function processFolio<Window extends FolioWindow>(options: {
	readonly dumgen: IntakeDumgen;
	readonly language: ScrollLanguage;
	readonly port: FolioProcessingPort<Window>;
	readonly hasTime: () => boolean;
}): Effect.Effect<FolioRunEnd, never, Jev> {
	const { port } = options;
	return Effect.gen(function* () {
		while (options.hasTime()) {
			const window = yield* Effect.promise(() => port.nextWindow());
			if (window === null) return { kind: "Done" as const };
			const analyzed = yield* logged(
				analyzeWindow<SentenceIdOf<Window>>(
					options.dumgen,
					window.sentences,
					options.language,
				),
			);
			yield* Effect.promise(() => port.storeWindow(analyzed));
		}
		return { kind: "Continue" as const };
	}).pipe(
		Effect.catchCause(() =>
			Effect.promise(() => port.failed()).pipe(
				Effect.as<FolioRunEnd>({ kind: "Failed" }),
			),
		),
	);
}
