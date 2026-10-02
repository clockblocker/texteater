/**
 * `segment.inUnits` as a host calls it at intake (Dumgen ADR 0007): a Text
 * already split into paragraphs and Sentences goes in, and each Sentence
 * comes back as its Segments and its biggest units, each with its route or
 * `Unresolved`. German runs the Segment stage, then the unit stage with
 * production's setting (`productionUnitSettings`).
 *
 * Every jev request goes through the host's `JevAsk`, split into chunks of
 * `questionsPerRequest` questions, each naming the pinned model. A chunk
 * that fails, or that a different model answered, fails its Sentence: each
 * of its ResolvableText Segments becomes its own `Unresolved` unit and the
 * Sentence carries a `failure`. One failed Sentence never fails the Text.
 */
import type { Question } from "promptsmith/typesafe";
import type { Answers, Ask, AskRequest } from "./ask.js";
import type { GermanInventory } from "./de/inventory.js";
import {
	type GermanSegmentation,
	segmentGermanSentence,
	writtenGermanSegments,
} from "./de/segments.js";
import { productionUnitSettings, segmentGermanUnits } from "./de/units.js";
import {
	isFloatingModel,
	type JevAsk,
	type JevResponse,
	pinnedJevModel,
	questionsPerRequest,
} from "./jev.js";
import type {
	Segment,
	SegmentedSentence,
	SegmentedText,
	SegmentLanguage,
	Unit,
} from "./segmented-sentence.js";
import { stitchedText } from "./stitched-text.js";

/** A Sentence's paragraph and its place in it, both from 0. */
type Place = { readonly paragraph: number; readonly sentence: number };

/** One jev request `inUnits` sent, reported once it settles. */
export type SegmentCall = {
	/** The Sentence's paragraph and its place in it, both from 0. */
	readonly paragraph: number;
	readonly sentence: number;
	/** Which request of the segmenter it was (`segments`, `candidates`, `route`, …). */
	readonly stage: string;
	readonly questions: number;
	/** The jev version that answered, or the one requested when none did. */
	readonly model: string;
	/** Zero when jev did not answer. */
	readonly inputTokens: number;
	readonly outputTokens: number;
	readonly durationMs: number;
	/** Why the request failed; its Sentence falls back to `Unresolved` units. */
	readonly error?: string;
};

export type SegmentOptions = {
	/** Sends one jev request: `createTypeSafeAsk` in production. */
	readonly ask: JevAsk;
	/** The jev version every request names; a floating alias is refused. */
	readonly model?: string;
	/** The German Authored Inventories the unit stage reads; dumspec's by default. */
	readonly inventory?: GermanInventory;
	/** Receives every request sent, with its tokens, so a host can record spend. */
	readonly onCall?: (call: SegmentCall) => void;
	/** The most requests in flight at once; 12 by default, as in the lab. */
	readonly concurrency?: number;
};

export type InUnitsInput = {
	readonly language: SegmentLanguage;
	/** As `splitText` gives them: non-blank Sentences, paragraph by paragraph. */
	readonly paragraphs: readonly { readonly sentences: readonly string[] }[];
};

/** The segmenters a host calls; `inLexemes` is deferred (Dumgen ADR 0007). */
export type Segmenters = {
	/**
	 * Segments every Sentence and groups its Segments into biggest units.
	 * It rejects a language other than German and a blank Sentence before
	 * asking anything; past that, a failed Sentence falls back instead of
	 * throwing.
	 */
	readonly inUnits: (input: InUnitsInput) => Promise<SegmentedText>;
};

const messageOf = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

/** An exception from the host's `onCall`, which `inUnits` passes on. */
class CallbackFailure extends Error {
	constructor(readonly original: unknown) {
		super(messageOf(original));
	}
}

class Semaphore {
	#free: number;
	readonly #waiting: (() => void)[] = [];
	constructor(size: number) {
		this.#free = size;
	}
	async use<T>(work: () => Promise<T>): Promise<T> {
		if (this.#free > 0) this.#free--;
		else await new Promise<void>((resolve) => this.#waiting.push(resolve));
		try {
			return await work();
		} finally {
			const next = this.#waiting.shift();
			if (next) next();
			else this.#free++;
		}
	}
}

/** Each ResolvableText Segment as its own `Unresolved` unit. */
const unresolvedUnits = (segments: readonly Segment[]): Unit[] =>
	segments.flatMap((segment, index) =>
		segment.kind === "ResolvableText"
			? [{ segments: [index], route: "Unresolved" as const }]
			: [],
	);

export function createSegment(options: SegmentOptions): Segmenters {
	const model = options.model ?? pinnedJevModel;
	if (isFloatingModel(model))
		throw Error(
			`${model} floats between jev versions; pin one, such as ${pinnedJevModel}`,
		);
	const concurrency = options.concurrency ?? 12;
	if (!Number.isInteger(concurrency) || concurrency < 1)
		throw Error("concurrency is a positive integer");
	const semaphore = new Semaphore(concurrency);
	const settings =
		options.inventory === undefined
			? productionUnitSettings
			: { ...productionUnitSettings, inventory: options.inventory };

	const report = (call: SegmentCall) => {
		try {
			options.onCall?.(call);
		} catch (error) {
			throw new CallbackFailure(error);
		}
	};

	/** Sends one chunk of a stage's request and reports it. */
	async function askChunk(
		place: Place,
		request: AskRequest,
		chunk: readonly (readonly [string, Question])[],
	): Promise<Answers> {
		const { stage } = request;
		const call = { ...place, stage, questions: chunk.length };
		const started = Date.now();
		let response: JevResponse;
		try {
			response = await options.ask(
				{
					model,
					state: request.state,
					questions: Object.fromEntries(chunk),
				},
				{ stage },
			);
		} catch (error) {
			const message = messageOf(error);
			report({
				...call,
				model,
				inputTokens: 0,
				outputTokens: 0,
				durationMs: Date.now() - started,
				error: message,
			});
			throw Error(`${stage}: ${message}`);
		}
		const missing = chunk
			.map(([id]) => id)
			.filter((id) => !(id in response.answers));
		const error =
			response.model !== model
				? `jev answered as ${response.model}, not the pinned ${model}`
				: missing.length > 0
					? `jev answered without ${missing.slice(0, 3).join(", ")}`
					: undefined;
		report({
			...call,
			model: response.model,
			inputTokens: response.usage.input_tokens,
			outputTokens: response.usage.output_tokens,
			durationMs: Date.now() - started,
			...(error === undefined ? {} : { error }),
		});
		if (error !== undefined) throw Error(`${stage}: ${error}`);
		return response.answers;
	}

	/**
	 * The stages' `ask` for one Sentence. Every chunk settles before the
	 * request does, so no call is reported after `inUnits` returns.
	 */
	const askFor =
		(place: Place): Ask =>
		async (request) => {
			const entries = Object.entries(request.questions);
			const chunks: (typeof entries)[] = [];
			for (let at = 0; at < entries.length; at += questionsPerRequest)
				chunks.push(entries.slice(at, at + questionsPerRequest));
			const settled = await Promise.allSettled(
				chunks.map((chunk) =>
					semaphore.use(() => askChunk(place, request, chunk)),
				),
			);
			const rejected = settled.flatMap((result) =>
				result.status === "rejected" ? [result.reason] : [],
			);
			const [failure] = [
				...rejected.filter(
					(reason) => reason instanceof CallbackFailure,
				),
				...rejected,
			];
			if (failure !== undefined) throw failure;
			return Object.assign(
				{},
				...settled.map((result) =>
					result.status === "fulfilled" ? result.value : {},
				),
			);
		};

	async function segmentSentence(
		text: string,
		place: Place,
	): Promise<SegmentedSentence> {
		const ask = askFor(place);
		let segmentation: GermanSegmentation | undefined;
		try {
			segmentation = await segmentGermanSentence(text, ask);
			const units = await segmentGermanUnits(segmentation, ask, settings);
			return {
				text: segmentation.text,
				segments: segmentation.segments,
				units,
			};
		} catch (error) {
			if (error instanceof CallbackFailure) throw error.original;
			const fallback = segmentation ?? writtenGermanSegments(text);
			return {
				text: fallback.text,
				segments: fallback.segments,
				units: unresolvedUnits(fallback.segments),
				failure: messageOf(error),
			};
		}
	}

	return {
		async inUnits(input) {
			if (input.language !== "de")
				throw Error(
					`segment.inUnits segments German ("de") only, not ${JSON.stringify(input.language)}`,
				);
			input.paragraphs.forEach(({ sentences }, paragraph) => {
				sentences.forEach((sentence, index) => {
					if (stitchedText(sentence).length === 0)
						throw Error(
							`Sentence ${index} of paragraph ${paragraph} is blank`,
						);
				});
			});
			return {
				language: input.language,
				paragraphs: await Promise.all(
					input.paragraphs.map(async ({ sentences }, paragraph) => ({
						sentences: await Promise.all(
							sentences.map((text, sentence) =>
								segmentSentence(text, { paragraph, sentence }),
							),
						),
					})),
				),
			};
		},
	};
}
