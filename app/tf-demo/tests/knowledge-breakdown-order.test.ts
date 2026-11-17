import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import * as Latch from "effect/Latch";
import { type Segmenters, withBreakdown } from "../server/knowledgeBreakdown";
import type { KnowledgeProduction } from "../server/knowledgeProduction";

const ENTSPANNUNG = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Entspannung",
		coreFeatures: { gender: "Fem" },
	},
	emojiDescription: "🧘",
} as const satisfies Dumling.Reading<"de">;
const shadow = (family: string, kind: string, canonicalForm: string) =>
	({ language: "de", family, kind, canonicalForm }) as Dumrel.UnitShadow;
const CONSTITUENTS = [
	{ letters: "Entspann", target: shadow("Lexeme", "VERB", "entspannen") },
	{ letters: "ung", target: shadow("Morpheme", "Suffix", "-ung") },
];
const TRANSCRIPTION = {
	kind: "Contribute",
	aspect: "transcription",
	value: "ɛntˈʃpanʊŋ",
} as unknown as KnowledgeProduction["changes"][number];
const SOURCE = {
	kind: "Contribute",
	aspect: "source",
	value: { target: shadow("Lexeme", "VERB", "entspannen") },
} as unknown as KnowledgeProduction["changes"][number];

const production = (
	...changes: KnowledgeProduction["changes"]
): KnowledgeProduction => ({ changes, failures: [], pendingRelations: [] });

/**
 * Segmenters that find `CONSTITUENTS`, or fail when `fail`, and open
 * `answered` once they have. `produce` below waits for it, so a run that
 * held the segmenters until `knowledge.produce` ended would never end.
 */
function segmentersOpening(answered: Latch.Latch, fail = false) {
	const asked: string[] = [];
	const segmenters: Segmenters<never> = {
		inConstituents: () => {
			asked.push("constituents");
			return Latch.open(answered).pipe(
				Effect.andThen(
					fail
						? Effect.fail({
								_tag: "ProviderFailure" as const,
								message: "no answer",
							})
						: Effect.succeed({
								kind: "Constituents" as const,
								pieces: CONSTITUENTS,
							}),
				),
			);
		},
		inMorphemes: () => {
			asked.push("morphemes");
			return Effect.succeed([]);
		},
	};
	return { segmenters, asked };
}

const run = (
	segmenters: Segmenters<never>,
	produce: Effect.Effect<KnowledgeProduction>,
	pointsBack = false,
	breakdown = true,
) =>
	Effect.runPromise(
		withBreakdown(
			segmenters,
			produce,
			{ reading: ENTSPANNUNG, breakdown },
			() => Effect.succeed(pointsBack),
		),
	);

test("with no Source asked, the segmenters run while knowledge.produce still waits, and their changes follow its", async () => {
	const answered = Latch.makeUnsafe(false);
	const { segmenters, asked } = segmentersOpening(answered);
	const produced = await run(
		segmenters,
		Effect.as(Latch.await(answered), production(TRANSCRIPTION)),
	);
	expect(asked).toEqual(["constituents"]);
	expect(produced).toEqual({
		changes: [
			TRANSCRIPTION,
			{
				kind: "Contribute",
				aspect: "breakdown",
				part: "constituents",
				value: CONSTITUENTS,
			},
		],
		failures: [],
		pendingRelations: [],
	});
});

test("a Source found drops the Breakdown the segmenters already answered, failures included", async () => {
	for (const fail of [false, true]) {
		const answered = Latch.makeUnsafe(false);
		const { segmenters, asked } = segmentersOpening(answered, fail);
		const produced = production(TRANSCRIPTION, SOURCE);
		expect(
			await run(segmenters, Effect.as(Latch.await(answered), produced)),
		).toEqual(produced);
		expect(asked).toEqual(["constituents"]);
	}
});

test("a Source dropped for pointing back keeps the Breakdown (#1279)", async () => {
	const answered = Latch.makeUnsafe(false);
	const { segmenters } = segmentersOpening(answered);
	const produced = await run(
		segmenters,
		Effect.as(Latch.await(answered), production(SOURCE)),
		true,
	);
	expect(produced.changes).toMatchObject([
		{ aspect: "source" },
		{ aspect: "breakdown", part: "constituents" },
	]);
});

test("a Source found while the segmenters still run interrupts them, and the run ends without them", async () => {
	let interrupted = false;
	const started = Latch.makeUnsafe(false);
	const segmenters: Segmenters<never> = {
		inConstituents: () =>
			Latch.open(started).pipe(
				Effect.andThen(Effect.never),
				Effect.onInterrupt(() =>
					Effect.sync(() => {
						interrupted = true;
					}),
				),
			),
		inMorphemes: () => Effect.succeed([]),
	};
	const produced = production(SOURCE);
	expect(
		await run(segmenters, Effect.as(Latch.await(started), produced)),
	).toEqual(produced);
	expect(interrupted).toBe(true);
});

test("a run that asks for no Breakdown runs no segmenter", async () => {
	const answered = Latch.makeUnsafe(true);
	const { segmenters, asked } = segmentersOpening(answered);
	const produced = production(TRANSCRIPTION);
	expect(
		await run(segmenters, Effect.succeed(produced), false, false),
	).toEqual(produced);
	expect(asked).toEqual([]);
});
