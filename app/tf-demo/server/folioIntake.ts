import * as Effect from "effect/Effect";
import type { ScrollLanguage } from "../shared/supported-target-language";
import {
	type AnalyzedSentence,
	analyzeParagraphs,
	type IntakeDumgen,
} from "./intake";

/**
 * A book's Folios through intake (#1193). Each window of a Folio, its
 * stored Sentences, goes through the paste's own analysis
 * (`analyzeParagraphs`: `language.detect`, then `segment.inUnits` on the
 * target-language ones), grouped back into their paragraphs, and comes back
 * by Sentence ID, so storing it fills in the Sentences the reader already
 * shows as plain text.
 */

/** A stored, unprocessed Sentence of a window. */
type WindowSentence = {
	readonly sentenceId: string;
	readonly paragraph?: number;
	readonly stitchedText: string;
};

/** A window's Sentence as intake analyzed it, by its stored ID. */
export type ProcessedSentence<Id extends string = string> = AnalyzedSentence & {
	readonly sentenceId: Id;
};

/** The window's Sentences in their paragraphs; one with no paragraph reads alone. */
function paragraphsOf(sentences: readonly WindowSentence[]) {
	const paragraphs: { sentences: string[] }[] = [];
	let previous: WindowSentence | undefined;
	for (const sentence of sentences) {
		const last = paragraphs.at(-1);
		if (
			last &&
			sentence.paragraph !== undefined &&
			sentence.paragraph === previous?.paragraph
		)
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
	readonly window: number;
	readonly sentences: readonly WindowSentence[];
};

/** The stored IDs of a window's Sentences. */
type SentenceIdOf<Window extends FolioWindow> =
	Window["sentences"][number]["sentenceId"];

/** What a run asks of storage; the Convex action passes its mutations. */
export type FolioProcessingPort<Window extends FolioWindow> = {
	/**
	 * The next window within the reader's Folios, or null once all of them
	 * are processed, which also ends the run.
	 */
	readonly nextWindow: () => Promise<Window | null>;
	readonly storeWindow: (
		window: Window,
		sentences: readonly ProcessedSentence<SentenceIdOf<Window>>[],
	) => Promise<void>;
	/**
	 * Records that the window failed; the run then stops, and storage says
	 * after how long it retries, or null when it gives up for now.
	 */
	readonly windowFailed: (window: Window) => Promise<number | null>;
};

/** How a run ended: done, waiting to retry a failed window, or out of time. */
export type FolioRunEnd =
	| { readonly kind: "Done" }
	| { readonly kind: "Retry"; readonly afterMs: number }
	| { readonly kind: "GaveUp" }
	| { readonly kind: "Continue" };

/**
 * Processes windows until the reader's Folios are done, a window fails, or
 * `hasTime` says the action should hand over to a fresh one. A failed
 * window keeps everything stored before it; the retry starts at it.
 */
export async function processFolios<Window extends FolioWindow>(options: {
	readonly dumgen: IntakeDumgen;
	readonly language: ScrollLanguage;
	readonly port: FolioProcessingPort<Window>;
	readonly hasTime: () => boolean;
}): Promise<FolioRunEnd> {
	const { port } = options;
	while (options.hasTime()) {
		const window = await port.nextWindow();
		if (window === null) return { kind: "Done" };
		const analyzed = await Effect.runPromiseExit(
			analyzeWindow<SentenceIdOf<Window>>(
				options.dumgen,
				window.sentences,
				options.language,
			),
		);
		if (analyzed._tag === "Failure") {
			const afterMs = await port.windowFailed(window);
			return afterMs === null
				? { kind: "GaveUp" }
				: { kind: "Retry", afterMs };
		}
		await port.storeWindow(window, analyzed.value);
	}
	return { kind: "Continue" };
}
