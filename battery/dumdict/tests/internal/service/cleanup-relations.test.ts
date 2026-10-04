import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { projectSemanticRelations } from "dumrel";
import type { SerializedDictionaryNote } from "../../../src";
import {
	emojiOf,
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

/** Resolves the store's first pending relation against its current revision. */
function cleanupFirstPending({
	dict,
	storage,
}: ReturnType<typeof getBootedUpDumdict<"en">>) {
	const locator = storage
		.loadAll()
		.flatMap(({ pendingRelations }) => pendingRelations)[0]?.locator;
	if (!locator) throw new Error("Expected pending relation.");
	return dict.cleanupRelations({
		baseRevision: storage.revision(),
		resolutions: [{ locator }],
	});
}

describe("relations cleanup", () => {
	test("keeps a zero-match Unit Shadow pending", async () => {
		const booted = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		const { storage } = booted;
		const result = cleanupFirstPending(booted);
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
		const booted = getBootedUpDumdict("en", [
			...enSerializedNotesWithPendingSwimRelation,
			swimNote(englishSwimReading),
		]);
		const { storage } = booted;
		const result = cleanupFirstPending(booted);
		const readings = storage
			.loadAll()
			.flatMap(({ readingEntries }) => readingEntries);
		expect(result.status).toBe("applied");
		expect(
			lemmaRelations(
				readings.find(({ reading }) => emojiOf(reading) === "🚶")
					?.knowledge?.semanticRelations,
			)?.nearSynonym,
		).toEqual([englishSwimLemma]);
		expect(
			lemmaRelations(
				readings.find(({ reading }) => emojiOf(reading) === "🏊")
					?.knowledge?.semanticRelations,
			)?.nearSynonym,
		).toBeUndefined();
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toEqual([]);
	});

	test("keeps an ambiguous multi-Lemma shadow pending and inert", async () => {
		// Another Core on the same route and Canonical Form, so two Lemmas
		// match the shadow; the feature itself is arbitrary.
		const alternateLemma = {
			...englishSwimLemma,
			coreFeatures: {
				...englishSwimLemma.coreFeatures,
				abbr: "Yes" as const,
			},
		};
		const alternateReading = {
			unitKind: "Reading" as const,
			lemma: alternateLemma,
			emojiDescription: "🌊",
		} satisfies Dumling.Reading<"en">;
		const run = (reverse: boolean) => {
			const matches = [
				swimNote(englishSwimReading),
				swimNote(alternateReading),
			];
			const booted = getBootedUpDumdict("en", [
				...enSerializedNotesWithPendingSwimRelation,
				...(reverse ? matches.reverse() : matches),
			]);
			cleanupFirstPending(booted);
			return booted.storage.loadAll();
		};
		for (const notes of [run(false), run(true)]) {
			const readings = notes.flatMap(
				({ readingEntries }) => readingEntries,
			);
			expect(
				lemmaRelations(
					readings.find(({ reading }) => emojiOf(reading) === "🚶")
						?.knowledge?.semanticRelations,
				)?.nearSynonym,
			).toBeUndefined();
			for (const emoji of ["🏊", "🌊"])
				expect(
					lemmaRelations(
						readings.find(
							({ reading }) => emojiOf(reading) === emoji,
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
		const { dict, storage } = getBootedUpDumdict("en", [
			sourceWithEdge,
			{ ...swimNote(englishSwimReading), readingEntries: [] },
		]);
		const hyponyms = (
			readingCounts: Parameters<typeof projections>[1] = [],
		) => {
			const readings = storage
				.loadAll()
				.flatMap(({ readingEntries }) => readingEntries);
			for (const { reading, knowledge } of readings)
				if (reading.lemma.canonicalForm === "swim")
					expect(knowledge).toBeUndefined();
			return projections(readings, readingCounts).filter(
				(projection) => projection.relation === "hyponym",
			);
		};
		expect(dict.addNewNote({ draft: englishSwimDraft }).status).toBe(
			"applied",
		);
		expect(hyponyms()).toEqual([
			expect.objectContaining({
				source: englishSwimReading,
				target: englishWalkLemma,
				provenance: "inferred",
			}),
		]);
		// Entries that hold only part of swim's Readings need its full count.
		expect(
			hyponyms([{ lemma: englishSwimLemma, readingCount: 2 }]),
		).toEqual([]);
		// A second Reading makes swim homonymous: its Lemma target stays direct.
		const sibling = {
			...englishSwimDraft,
			reading: { ...englishSwimReading, emojiDescription: "🌊" },
		};
		expect(dict.addNewNote({ draft: sibling }).status).toBe("applied");
		expect(hyponyms()).toEqual([]);
	});
});

function projections(
	readings: import("../../../src").ReadingEntry<"en">[],
	readingCounts: readonly {
		readonly lemma: Dumling.Lemma;
		readonly readingCount: number;
	}[] = [],
) {
	const result = projectSemanticRelations(
		readings.map(({ reading, knowledge }) => ({
			reading,
			knowledge: knowledge ?? {},
		})),
		{ readingCounts },
	);
	if (!result.success) throw result.error;
	return result.value;
}
