import { describe, expect, test } from "bun:test";
import type {
	DumlingId,
	Lemma,
	LexicalRelation,
	PendingLemmaRef,
} from "../../../src";
import type { SerializedDictionaryNote } from "../../../src/testing/serialized-note";
import {
	createDumdictService,
	derivePendingLemmaId,
	englishRunLemma,
	englishRunLemmaId,
	englishSwimLemma,
	englishWalkLemma,
	englishWalkLemmaId,
	enSerializedNotesWithPendingSwimRelation,
	getBootedUpDumdict,
	makeDumlingIdFor,
	type StoreRevision,
	withUnusedCleanupStorageMethods,
} from "./helpers";

const englishSwimNounLemma = {
	canonicalLemma: "swim",
	inherentFeatures: {},
	language: "en",
	lemmaKind: "Lexeme",
	lemmaSubKind: "NOUN",
	meaningInEmojis: "swim-as-event",
} satisfies Lemma<"en", "Lexeme", "NOUN">;

function serializedNote(
	lemma: Lemma<"en">,
	note: {
		attestedTranslations: string[];
		attestations: string[];
		notes: string;
	},
	relations?: {
		nearSynonym?: DumlingId<"Lemma", "en">[];
	},
): SerializedDictionaryNote<"en"> {
	return {
		lemmaEntry: {
			id: makeDumlingIdFor("en", lemma),
			lemma,
			lexicalRelations: relations ?? {},
			morphologicalRelations: {},
			...note,
		},
		ownedSurfaceEntries: [],
		pendingRelations: [],
	};
}

function pendingRefFor(lemma: Lemma<"en">): PendingLemmaRef<"en"> {
	return {
		pendingId: derivePendingLemmaId({
			language: "en",
			canonicalLemma: lemma.canonicalLemma,
			lemmaKind: lemma.lemmaKind,
			lemmaSubKind: lemma.lemmaSubKind,
		}),
		language: "en",
		canonicalLemma: lemma.canonicalLemma,
		lemmaKind: lemma.lemmaKind,
		lemmaSubKind: lemma.lemmaSubKind,
	};
}

function serializedNoteWithPendingRelation({
	sourceLemma,
	targetPendingLemma,
	relation = "nearSynonym",
}: {
	sourceLemma: Lemma<"en">;
	targetPendingLemma: Lemma<"en">;
	relation?: LexicalRelation;
}): SerializedDictionaryNote<"en"> {
	const pendingRef = pendingRefFor(targetPendingLemma);
	const sourceLemmaId = makeDumlingIdFor("en", sourceLemma);

	return {
		lemmaEntry: {
			id: sourceLemmaId,
			lemma: sourceLemma,
			lexicalRelations: {},
			morphologicalRelations: {},
			attestedTranslations: [sourceLemma.canonicalLemma],
			attestations: [`They ${sourceLemma.canonicalLemma}.`],
			notes: `${sourceLemma.canonicalLemma} note.`,
		},
		ownedSurfaceEntries: [],
		pendingRefs: [pendingRef],
		pendingRelations: [
			{
				sourceLemmaId,
				relationFamily: "lexical",
				relation,
				targetPendingId: pendingRef.pendingId,
			},
		],
	};
}

describe("configured service", () => {
	test("getInfoForRelationsCleanup returns empty candidates and pending relations when nothing matches", async () => {
		const { dict } = getBootedUpDumdict("en", []);

		const result = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		expect(result.candidateLemmaIds).toEqual([]);
		expect(result.pendingRelations).toEqual([]);
	});

	test("getInfoForRelationsCleanup rejects malformed input before storage is called", async () => {
		let storageCalls = 0;
		const storage = {
			...withUnusedCleanupStorageMethods({
				async findStoredLemmaSenses() {
					throw new Error("Unexpected storage call");
				},
				async loadLemmaForPatch() {
					throw new Error("Unexpected storage call");
				},
				async loadNewNoteContext() {
					throw new Error("Unexpected storage call");
				},
				async commitChanges() {
					throw new Error("Unexpected storage call");
				},
			}),
			async getInfoForRelationsCleanup() {
				storageCalls += 1;
				throw new Error("Unexpected storage call");
			},
		};
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.getInfoForRelationsCleanup({ canonicalLemma: "   " }),
		).rejects.toThrow("canonicalLemma is required");
		expect(storageCalls).toBe(0);
	});

	test("getInfoForRelationsCleanup returns a thin cleanup workset for one spelling", async () => {
		const swimId = makeDumlingIdFor("en", englishSwimLemma);
		const { dict } = getBootedUpDumdict("en", [
			...enSerializedNotesWithPendingSwimRelation,
			serializedNote(englishSwimLemma, {
				attestedTranslations: ["swim"],
				attestations: ["They swim every morning."],
				notes: "Move through water by moving the body.",
			}),
		]);

		const result = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		expect(result.canonicalLemma).toBe("swim");
		expect(result.candidateLemmaIds).toEqual([swimId]);
		expect(result.pendingRelations).toHaveLength(1);
		expect(result.pendingRelations[0]).toMatchObject({
			sourceLemmaId: englishWalkLemmaId,
			relation: "nearSynonym",
			pendingRef: {
				canonicalLemma: "swim",
			},
		});
	});

	test("getInfoForRelationsCleanup uses pending-identity canonical semantics for request matching", async () => {
		const swimId = makeDumlingIdFor("en", englishSwimLemma);
		const { dict } = getBootedUpDumdict("en", [
			...enSerializedNotesWithPendingSwimRelation,
			serializedNote(englishSwimLemma, {
				attestedTranslations: ["swim"],
				attestations: ["They swim every morning."],
				notes: "Move through water by moving the body.",
			}),
		]);

		const result = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "SWIM",
		});

		expect(result.candidateLemmaIds).toEqual([swimId]);
		expect(result.pendingRelations).toHaveLength(1);
		expect(result.pendingRelations[0]?.pendingRef.canonicalLemma).toBe(
			"swim",
		);
	});

	test("getInfoForRelationsCleanup returns candidates when no pending relations exist", async () => {
		const swimId = makeDumlingIdFor("en", englishSwimLemma);
		const { dict } = getBootedUpDumdict("en", [
			serializedNote(englishSwimLemma, {
				attestedTranslations: ["swim"],
				attestations: ["They swim every morning."],
				notes: "Move through water by moving the body.",
			}),
		]);

		const result = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		expect(result.candidateLemmaIds).toEqual([swimId]);
		expect(result.pendingRelations).toEqual([]);
	});

	test("getInfoForRelationsCleanup returns pending relations when no candidate lemma exists", async () => {
		const { dict } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);

		const result = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		expect(result.candidateLemmaIds).toEqual([]);
		expect(result.pendingRelations).toHaveLength(1);
	});

	test("getInfoForRelationsCleanup returns multiple candidate lemmas for the same canonicalLemma", async () => {
		const swimVerbId = makeDumlingIdFor("en", englishSwimLemma);
		const swimNounId = makeDumlingIdFor("en", englishSwimNounLemma);
		const { dict } = getBootedUpDumdict("en", [
			serializedNote(englishSwimLemma, {
				attestedTranslations: ["swim"],
				attestations: ["They swim every morning."],
				notes: "Verb sense.",
			}),
			serializedNote(englishSwimNounLemma, {
				attestedTranslations: ["swim"],
				attestations: ["That was a long swim."],
				notes: "Noun sense.",
			}),
		]);

		const result = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		expect(new Set(result.candidateLemmaIds)).toEqual(
			new Set([swimVerbId, swimNounId]),
		);
	});

	test("getInfoForRelationsCleanup returns multiple pending relations from different source lemmas into one pending ref", async () => {
		const { dict } = getBootedUpDumdict("en", [
			serializedNoteWithPendingRelation({
				sourceLemma: englishWalkLemma,
				targetPendingLemma: englishSwimLemma,
			}),
			serializedNoteWithPendingRelation({
				sourceLemma: englishRunLemma,
				targetPendingLemma: englishSwimLemma,
			}),
		]);

		const result = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		expect(result.pendingRelations).toHaveLength(2);
		expect(
			new Set(
				result.pendingRelations.map(
					({ sourceLemmaId }) => sourceLemmaId,
				),
			),
		).toEqual(new Set([englishWalkLemmaId, englishRunLemmaId]));
		expect(
			new Set(
				result.pendingRelations.map(
					({ pendingRef }) => pendingRef.pendingId,
				),
			).size,
		).toBe(1);
	});

	test("getInfoForRelationsCleanup returns distinct pending refs with the same canonicalLemma separately", async () => {
		const walkToVerbSwim = serializedNoteWithPendingRelation({
			sourceLemma: englishWalkLemma,
			targetPendingLemma: englishSwimLemma,
		});
		const runToNounSwim = serializedNoteWithPendingRelation({
			sourceLemma: englishRunLemma,
			targetPendingLemma: englishSwimNounLemma,
		});
		const { dict } = getBootedUpDumdict("en", [
			walkToVerbSwim,
			runToNounSwim,
		]);

		const result = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		expect(result.pendingRelations).toHaveLength(2);
		expect(
			new Set(
				result.pendingRelations.map(
					({ pendingRef }) => pendingRef.pendingId,
				),
			).size,
		).toBe(2);
	});

	test("getInfoForRelationsCleanup does not mutate storage", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		const before = JSON.stringify(storage.loadAll());

		await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		expect(JSON.stringify(storage.loadAll())).toBe(before);
	});

	test("getInfoForRelationsCleanup rejects malformed storage that duplicates one pending ref ID", async () => {
		const storage = {
			async findStoredLemmaSenses() {
				throw new Error("Unexpected storage call");
			},
			async getInfoForRelationsCleanup() {
				const note = enSerializedNotesWithPendingSwimRelation[0];
				if (!note?.pendingRefs?.[0] || !note.pendingRelations[0]) {
					throw new Error("Expected pending swim fixture.");
				}
				return {
					revision: "cleanup-1" as StoreRevision,
					canonicalLemma: "swim",
					candidateLemmas: [],
					pendingRefs: [note.pendingRefs[0], note.pendingRefs[0]],
					pendingRelations: [note.pendingRelations[0]],
				};
			},
			async loadLemmaForPatch() {
				throw new Error("Unexpected storage call");
			},
			async loadNewNoteContext() {
				throw new Error("Unexpected storage call");
			},
			async loadCleanupRelationsContext() {
				throw new Error("Unexpected storage call");
			},
			async commitChanges() {
				throw new Error("Unexpected storage call");
			},
		};
		const dict = createDumdictService({ language: "en", storage });

		await expect(
			dict.getInfoForRelationsCleanup({ canonicalLemma: "swim" }),
		).rejects.toThrow("contains duplicates");
	});

	test("cleanupRelations returns an applied no-op without touching storage", async () => {
		let loadCleanupCalls = 0;
		let commitCalls = 0;
		const storage = {
			...withUnusedCleanupStorageMethods({
				async findStoredLemmaSenses() {
					throw new Error("Unexpected storage call");
				},
				async loadLemmaForPatch() {
					throw new Error("Unexpected storage call");
				},
				async loadNewNoteContext() {
					throw new Error("Unexpected storage call");
				},
				async commitChanges() {
					commitCalls += 1;
					throw new Error("Unexpected storage call");
				},
			}),
			async loadCleanupRelationsContext() {
				loadCleanupCalls += 1;
				throw new Error("Unexpected storage call");
			},
		};
		const dict = createDumdictService({ language: "en", storage });

		const result = await dict.cleanupRelations({
			baseRevision: "cleanup-1" as StoreRevision,
			resolutions: [],
		});

		expect(result).toMatchObject({
			status: "applied",
			baseRevision: "cleanup-1",
			nextRevision: "cleanup-1",
			summary: { message: "No relations cleaned up." },
		});
		expect(loadCleanupCalls).toBe(0);
		expect(commitCalls).toBe(0);
	});

	test("cleanupRelations rejects duplicate resolution keys", async () => {
		const { dict } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		const info = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});
		const resolution = {
			sourceLemmaId: englishWalkLemmaId,
			relation: "nearSynonym" as const,
			targetPendingId: info.pendingRelations[0]!.pendingRef.pendingId,
		};

		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [resolution, resolution],
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "invalidRequest",
		});
	});

	test("cleanupRelations rejects malformed relation input before loading cleanup storage", async () => {
		let loadCleanupCalls = 0;
		const storage = {
			...withUnusedCleanupStorageMethods({
				async findStoredLemmaSenses() {
					throw new Error("Unexpected storage call");
				},
				async loadLemmaForPatch() {
					throw new Error("Unexpected storage call");
				},
				async loadNewNoteContext() {
					throw new Error("Unexpected storage call");
				},
				async commitChanges() {
					throw new Error("Unexpected storage call");
				},
			}),
			async loadCleanupRelationsContext() {
				loadCleanupCalls += 1;
				throw new Error("Unexpected storage call");
			},
		};
		const dict = createDumdictService({ language: "en", storage });

		const result = await dict.cleanupRelations({
			baseRevision: "cleanup-1" as StoreRevision,
			resolutions: [
				{
					sourceLemmaId: englishWalkLemmaId,
					relation: "notARelation" as never,
					targetPendingId: pendingRefFor(englishSwimLemma).pendingId,
				},
			],
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "invalidRequest",
		});
		expect(loadCleanupCalls).toBe(0);
	});

	test("cleanupRelations resolves a pending relation into inverse-paired full relations", async () => {
		const swimId = makeDumlingIdFor("en", englishSwimLemma);
		const { dict, storage } = getBootedUpDumdict("en", [
			...enSerializedNotesWithPendingSwimRelation,
			serializedNote(englishSwimLemma, {
				attestedTranslations: ["swim"],
				attestations: ["They swim every morning."],
				notes: "Move through water by moving the body.",
			}),
		]);

		const info = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});
		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [
				{
					sourceLemmaId: englishWalkLemmaId,
					relation: "nearSynonym",
					targetPendingId:
						info.pendingRelations[0]!.pendingRef.pendingId,
					targetLemmaId: swimId,
				},
			],
		});

		const storedWalk = storage
			.loadAll()
			.find(
				({ lemmaEntry }) => lemmaEntry.id === englishWalkLemmaId,
			)?.lemmaEntry;
		const storedSwim = storage
			.loadAll()
			.find(({ lemmaEntry }) => lemmaEntry.id === swimId)?.lemmaEntry;

		expect(result.status).toBe("applied");
		expect(storedWalk?.lexicalRelations.nearSynonym).toContain(swimId);
		expect(storedSwim?.lexicalRelations.nearSynonym).toContain(
			englishWalkLemmaId,
		);
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(0);
		expect(
			storage.loadAll().flatMap(({ pendingRefs }) => pendingRefs ?? []),
		).toHaveLength(0);
	});

	test("cleanupRelations resolves multiple pending relations atomically", async () => {
		const swimId = makeDumlingIdFor("en", englishSwimLemma);
		const { dict, storage } = getBootedUpDumdict("en", [
			serializedNoteWithPendingRelation({
				sourceLemma: englishWalkLemma,
				targetPendingLemma: englishSwimLemma,
			}),
			serializedNoteWithPendingRelation({
				sourceLemma: englishRunLemma,
				targetPendingLemma: englishSwimLemma,
			}),
			serializedNote(englishSwimLemma, {
				attestedTranslations: ["swim"],
				attestations: ["They swim every morning."],
				notes: "Move through water by moving the body.",
			}),
		]);
		const info = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: info.pendingRelations.map(
				({ sourceLemmaId, relation, pendingRef }) => ({
					sourceLemmaId,
					relation,
					targetPendingId: pendingRef.pendingId,
					targetLemmaId: swimId,
				}),
			),
		});

		const storedNotes = storage.loadAll();
		const storedWalk = storedNotes.find(
			({ lemmaEntry }) => lemmaEntry.id === englishWalkLemmaId,
		)?.lemmaEntry;
		const storedRun = storedNotes.find(
			({ lemmaEntry }) => lemmaEntry.id === englishRunLemmaId,
		)?.lemmaEntry;
		const storedSwim = storedNotes.find(
			({ lemmaEntry }) => lemmaEntry.id === swimId,
		)?.lemmaEntry;

		expect(result.status).toBe("applied");
		expect(storedWalk?.lexicalRelations.nearSynonym).toContain(swimId);
		expect(storedRun?.lexicalRelations.nearSynonym).toContain(swimId);
		expect(storedSwim?.lexicalRelations.nearSynonym).toEqual(
			expect.arrayContaining([englishWalkLemmaId, englishRunLemmaId]),
		);
		expect(
			storedNotes.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(0);
	});

	test("cleanupRelations can drop a pending relation without creating a real relation", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);

		const info = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});
		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [
				{
					sourceLemmaId: englishWalkLemmaId,
					relation: "nearSynonym",
					targetPendingId:
						info.pendingRelations[0]!.pendingRef.pendingId,
				},
			],
		});

		const storedWalk = storage
			.loadAll()
			.find(
				({ lemmaEntry }) => lemmaEntry.id === englishWalkLemmaId,
			)?.lemmaEntry;

		expect(result.status).toBe("applied");
		expect(storedWalk?.lexicalRelations.nearSynonym ?? []).toHaveLength(0);
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(0);
	});

	test("cleanupRelations leaves omitted pending relations and refs in place during partial cleanup", async () => {
		const swimId = makeDumlingIdFor("en", englishSwimLemma);
		const { dict, storage } = getBootedUpDumdict("en", [
			serializedNoteWithPendingRelation({
				sourceLemma: englishWalkLemma,
				targetPendingLemma: englishSwimLemma,
			}),
			serializedNoteWithPendingRelation({
				sourceLemma: englishRunLemma,
				targetPendingLemma: englishSwimLemma,
			}),
			serializedNote(englishSwimLemma, {
				attestedTranslations: ["swim"],
				attestations: ["They swim every morning."],
				notes: "Move through water by moving the body.",
			}),
		]);
		const info = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [
				{
					sourceLemmaId: englishWalkLemmaId,
					relation: "nearSynonym",
					targetPendingId:
						info.pendingRelations[0]!.pendingRef.pendingId,
					targetLemmaId: swimId,
				},
			],
		});

		const storedNotes = storage.loadAll();
		const pendingRelations = storedNotes.flatMap(
			({ pendingRelations }) => pendingRelations,
		);
		const pendingRefs = storedNotes.flatMap(
			({ pendingRefs }) => pendingRefs ?? [],
		);

		expect(result.status).toBe("applied");
		expect(pendingRelations).toHaveLength(1);
		expect(pendingRelations[0]?.sourceLemmaId).toBe(englishRunLemmaId);
		expect(pendingRefs).toHaveLength(1);
	});

	test("cleanupRelations rejects self-resolution as selfRelation", async () => {
		const { dict } = getBootedUpDumdict("en", [
			serializedNoteWithPendingRelation({
				sourceLemma: englishWalkLemma,
				targetPendingLemma: englishWalkLemma,
			}),
		]);
		const info = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "walk",
		});

		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [
				{
					sourceLemmaId: englishWalkLemmaId,
					relation: "nearSynonym",
					targetPendingId:
						info.pendingRelations[0]!.pendingRef.pendingId,
					targetLemmaId: englishWalkLemmaId,
				},
			],
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "selfRelation",
		});
	});

	test("cleanupRelations rejects a target lemma that does not match the pending ref identity", async () => {
		const { dict } = getBootedUpDumdict("en", [
			...enSerializedNotesWithPendingSwimRelation,
			serializedNote(englishRunLemma, {
				attestedTranslations: ["run"],
				attestations: ["They run every day."],
				notes: "Move quickly on foot.",
			}),
		]);

		const info = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});
		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [
				{
					sourceLemmaId: englishWalkLemmaId,
					relation: "nearSynonym",
					targetPendingId:
						info.pendingRelations[0]!.pendingRef.pendingId,
					targetLemmaId: englishRunLemmaId,
				},
			],
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "invalidRequest",
		});
	});

	test("cleanupRelations consumes a pending relation even when the real relation already exists", async () => {
		const swimId = makeDumlingIdFor("en", englishSwimLemma);
		const pendingWalkToSwim = serializedNoteWithPendingRelation({
			sourceLemma: englishWalkLemma,
			targetPendingLemma: englishSwimLemma,
		});
		const { dict, storage } = getBootedUpDumdict("en", [
			{
				...pendingWalkToSwim,
				lemmaEntry: {
					...pendingWalkToSwim.lemmaEntry,
					lexicalRelations: { nearSynonym: [swimId] },
				},
			},
			{
				...serializedNote(
					englishSwimLemma,
					{
						attestedTranslations: ["swim"],
						attestations: ["They swim every morning."],
						notes: "Swim note.",
					},
					{ nearSynonym: [englishWalkLemmaId] },
				),
			},
		]);
		const info = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [
				{
					sourceLemmaId: englishWalkLemmaId,
					relation: "nearSynonym",
					targetPendingId:
						info.pendingRelations[0]!.pendingRef.pendingId,
					targetLemmaId: swimId,
				},
			],
		});

		const storedWalk = storage
			.loadAll()
			.find(
				({ lemmaEntry }) => lemmaEntry.id === englishWalkLemmaId,
			)?.lemmaEntry;

		expect(result.status).toBe("applied");
		expect(storedWalk?.lexicalRelations.nearSynonym).toEqual([swimId]);
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(0);
	});

	test("cleanupRelations conflicts when targetLemmaId does not exist", async () => {
		const { dict } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		const info = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});

		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [
				{
					sourceLemmaId: englishWalkLemmaId,
					relation: "nearSynonym",
					targetPendingId:
						info.pendingRelations[0]!.pendingRef.pendingId,
					targetLemmaId: englishRunLemmaId,
				},
			],
		});

		expect(result).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
	});

	test("cleanupRelations conflicts on a stale base revision", async () => {
		const swimId = makeDumlingIdFor("en", englishSwimLemma);
		const { dict } = getBootedUpDumdict("en", [
			...enSerializedNotesWithPendingSwimRelation,
			serializedNote(englishSwimLemma, {
				attestedTranslations: ["swim"],
				attestations: ["They swim every morning."],
				notes: "Move through water by moving the body.",
			}),
		]);

		const info = await dict.getInfoForRelationsCleanup({
			canonicalLemma: "swim",
		});
		await dict.addAttestation({
			lemmaId: swimId,
			attestation: "Swim laps before breakfast.",
		});

		const result = await dict.cleanupRelations({
			baseRevision: info.revision,
			resolutions: [
				{
					sourceLemmaId: englishWalkLemmaId,
					relation: "nearSynonym",
					targetPendingId:
						info.pendingRelations[0]!.pendingRef.pendingId,
					targetLemmaId: swimId,
				},
			],
		});

		expect(result).toMatchObject({
			status: "conflict",
			code: "revisionConflict",
			baseRevision: info.revision,
		});
	});

	test("cleanupRelations conflicts when the requested pending relation tuple no longer exists", async () => {
		const note = enSerializedNotesWithPendingSwimRelation[0];
		const pendingRef = note?.pendingRefs?.[0];
		if (!pendingRef) {
			throw new Error("Expected pending swim fixture.");
		}
		const storage = {
			...withUnusedCleanupStorageMethods({
				async findStoredLemmaSenses() {
					throw new Error("Unexpected storage call");
				},
				async loadLemmaForPatch() {
					throw new Error("Unexpected storage call");
				},
				async loadNewNoteContext() {
					throw new Error("Unexpected storage call");
				},
				async commitChanges() {
					throw new Error("Unexpected storage call");
				},
			}),
			async loadCleanupRelationsContext() {
				return {
					revision: "cleanup-1" as StoreRevision,
					pendingRefs: [pendingRef],
					pendingRelations: [],
					targetLemmas: [],
				};
			},
		};
		const dict = createDumdictService({ language: "en", storage });

		const result = await dict.cleanupRelations({
			baseRevision: "cleanup-1" as StoreRevision,
			resolutions: [
				{
					sourceLemmaId: englishWalkLemmaId,
					relation: "nearSynonym",
					targetPendingId: pendingRef.pendingId,
				},
			],
		});

		expect(result).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
	});
});
