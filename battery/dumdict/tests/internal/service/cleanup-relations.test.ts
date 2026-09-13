import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import {
	projectSemanticRelations,
	type SerializedDictionaryNote,
} from "../../../src";
import {
	englishSwimDraft,
	englishSwimLemma,
	englishSwimReading,
	englishWalkLemma,
	enSerializedNotesWithPendingSwimRelation,
	getBootedUpDumdict,
	lemmaRelations,
} from "./helpers";

function swimNote(
	reading: Dumling.Reading<"en">,
): SerializedDictionaryNote<"en"> {
	return {
		schemaVersion: 1,
		lemmaRecord: { lemma: reading.lemma },
		readingEntries: [
			{
				reading,
				attestedTranslations: ["swim"],
				attestations: ["They swim."],
				notes: "Swimming.",
			},
		],
		ownedSurfaceEntries: [],
		pendingRelations: [],
	};
}

async function cleanupFirstPending(
	dict: ReturnType<typeof getBootedUpDumdict<"en">>["dict"],
) {
	const info = await Effect.runPromise(
		dict.getInfoForRelationsCleanup({
			canonicalForm: "swim",
		}),
	);
	const locator = info.pendingRelations[0]?.locator;
	if (!locator) throw new Error("Expected pending relation.");
	return Effect.runPromise(
		dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [{ locator }],
		}),
	);
}

describe("relations cleanup", () => {
	test("keeps a zero-match Unit Shadow pending", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		const result = await cleanupFirstPending(dict);
		expect(result.status).toBe("applied");
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(1);
		expect(
			storage.loadAll()[0]?.readingEntries[0]?.knowledge,
		).toBeUndefined();
	});

	test("automatically resolves one Lemma, stores only the direct claim, and deletes pending atomically", async () => {
		const { dict, storage } = getBootedUpDumdict("en", [
			...enSerializedNotesWithPendingSwimRelation,
			swimNote(englishSwimReading),
		]);
		const result = await cleanupFirstPending(dict);
		const readings = storage
			.loadAll()
			.flatMap(({ readingEntries }) => readingEntries);
		expect(result.status).toBe("applied");
		expect(
			lemmaRelations(
				readings.find(
					({ reading }) => reading.emojiDescription === "🚶",
				)?.knowledge?.semanticRelations,
			)?.nearSynonym,
		).toEqual([englishSwimLemma]);
		expect(
			lemmaRelations(
				readings.find(
					({ reading }) => reading.emojiDescription === "🏊",
				)?.knowledge?.semanticRelations,
			)?.nearSynonym,
		).toBeUndefined();
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toEqual([]);
	});

	test("keeps an ambiguous multi-Lemma shadow pending and inert", async () => {
		const alternateLemma = {
			...englishSwimLemma,
			coreFeatures: {
				...englishSwimLemma.coreFeatures,
				style: "Vrnc" as const,
			},
		};
		const alternateReading = {
			unitKind: "Reading" as const,
			lemma: alternateLemma,
			emojiDescription: "🌊",
		} satisfies Dumling.Reading<"en">;
		const run = async (reverse: boolean) => {
			const matches = [
				swimNote(englishSwimReading),
				swimNote(alternateReading),
			];
			const { dict, storage } = getBootedUpDumdict("en", [
				...enSerializedNotesWithPendingSwimRelation,
				...(reverse ? matches.reverse() : matches),
			]);
			await cleanupFirstPending(dict);
			return storage.loadAll();
		};
		for (const notes of [await run(false), await run(true)]) {
			const readings = notes.flatMap(
				({ readingEntries }) => readingEntries,
			);
			expect(
				lemmaRelations(
					readings.find(
						({ reading }) => reading.emojiDescription === "🚶",
					)?.knowledge?.semanticRelations,
				)?.nearSynonym,
			).toBeUndefined();
			for (const emoji of ["🏊", "🌊"])
				expect(
					lemmaRelations(
						readings.find(
							({ reading }) => reading.emojiDescription === emoji,
						)?.knowledge?.semanticRelations,
					)?.nearSynonym,
				).toBeUndefined();
			expect(
				notes.flatMap(({ pendingRelations }) => pendingRelations),
			).toHaveLength(1);
		}
	});

	test("a later Reading receives inferred inverse views without a backfill write", async () => {
		const sourceFixture = enSerializedNotesWithPendingSwimRelation[0];
		if (!sourceFixture) throw new Error("Expected source fixture.");
		const sourceWithEdge: SerializedDictionaryNote<"en"> =
			structuredClone(sourceFixture);
		sourceWithEdge.pendingRelations = [];
		const source = sourceWithEdge.readingEntries[0];
		if (!source) throw new Error("Expected source Reading.");
		source.knowledge = {
			semanticRelations: { hypernym: [englishSwimLemma] },
		};
		const firstSwim = swimNote(englishSwimReading);
		const { dict, storage } = getBootedUpDumdict("en", [
			sourceWithEdge,
			firstSwim,
		]);
		const sibling = {
			...englishSwimDraft,
			reading: { ...englishSwimReading, emojiDescription: "🌊" },
		};
		expect(
			(await Effect.runPromise(dict.addNewNote({ draft: sibling })))
				.status,
		).toBe("applied");
		const notes = storage.loadAll();
		const readings = notes.flatMap(({ readingEntries }) => readingEntries);
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🌊")
				?.knowledge,
		).toBeUndefined();
		expect(
			projections(readings).filter(
				(projection) =>
					projection.source.emojiDescription === "🌊" &&
					projection.relation === "hyponym",
			),
		).toEqual([
			expect.objectContaining({
				target: englishWalkLemma,
				provenance: "inferred",
			}),
		]);
	});
});

function projections(readings: import("../../../src").ReadingEntry<"en">[]) {
	const result = projectSemanticRelations(readings);
	if (!result.success) throw result.error;
	return result.value;
}
