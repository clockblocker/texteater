import { describe, expect, test } from "bun:test";
import {
	projectSemanticRelations,
	type Reading,
	type SerializedDictionaryNote,
} from "../../../src";
import {
	englishSwimDraft,
	englishSwimLemma,
	englishSwimReading,
	englishWalkLemma,
	enSerializedNotesWithPendingSwimRelation,
	getBootedUpDumdict,
} from "./helpers";

function swimNote(reading: Reading<"en">): SerializedDictionaryNote<"en"> {
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
	const info = await dict.getInfoForRelationsCleanup({
		canonicalForm: "swim",
	});
	const locator = info.pendingRelations[0]?.locator;
	if (!locator) throw new Error("Expected pending relation.");
	return dict.cleanupRelations({
		baseRevision: info.revision,
		resolutions: [{ locator }],
	});
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
			readings.find(({ reading }) => reading.emojiDescription === "🚶")
				?.knowledge?.semanticRelations?.nearSynonym,
		).toEqual([englishSwimLemma]);
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🏊")
				?.knowledge?.semanticRelations?.nearSynonym,
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
			lemma: alternateLemma,
			emojiDescription: "🌊",
		} satisfies Reading<"en">;
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
				readings.find(
					({ reading }) => reading.emojiDescription === "🚶",
				)?.knowledge?.semanticRelations?.nearSynonym,
			).toBeUndefined();
			for (const emoji of ["🏊", "🌊"])
				expect(
					readings.find(
						({ reading }) => reading.emojiDescription === emoji,
					)?.knowledge?.semanticRelations?.nearSynonym,
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
		expect((await dict.addNewNote({ draft: sibling })).status).toBe(
			"applied",
		);
		const notes = storage.loadAll();
		const readings = notes.flatMap(({ readingEntries }) => readingEntries);
		expect(
			readings.find(({ reading }) => reading.emojiDescription === "🌊")
				?.knowledge,
		).toBeUndefined();
		expect(
			projectSemanticRelations({
				lemmas: notes.map(({ lemmaRecord }) => lemmaRecord),
				readings,
			}).filter(
				(projection) =>
					projection.sourceReading.emojiDescription === "🌊" &&
					projection.relation === "hyponym",
			),
		).toEqual([
			expect.objectContaining({
				targetLemma: englishWalkLemma,
				provenance: "inferred",
			}),
		]);
	});
});
