import { describe, expect, test } from "bun:test";
import {
	derivePendingLemmaId,
	englishSwimLemma,
	englishSwimLemmaSurface,
	englishWalkLemmaId,
	enSerializedNotes,
	getBootedUpDumdict,
	makeDumlingIdFor,
} from "./helpers";

describe("configured service", () => {
	test("addNewNote rejects self relations", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addNewNote({
			draft: {
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
				relations: [
					{
						relationFamily: "lexical",
						relation: "nearSynonym",
						target: {
							kind: "existing",
							lemmaId: makeDumlingIdFor("en", englishSwimLemma),
						},
					},
				],
			},
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "selfRelation",
		});
	});

	test("addNewNote rejects pending self relations by dumling identity", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addNewNote({
			draft: {
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
				relations: [
					{
						relationFamily: "lexical",
						relation: "nearSynonym",
						target: {
							kind: "pending",
							ref: {
								canonicalLemma: "SWIM",
								lemmaKind: "Lexeme",
								lemmaSubKind: "VERB",
							},
						},
					},
				],
			},
		});

		expect(result).toMatchObject({
			status: "rejected",
			code: "selfRelation",
		});
	});

	test("addNewNote adds explicit inverse-paired relations to existing lemmas", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addNewNote({
			draft: {
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
				relations: [
					{
						relationFamily: "lexical",
						relation: "nearSynonym",
						target: { kind: "existing", lemmaId: englishWalkLemmaId },
					},
				],
			},
		});

		const storedNotes = storage.loadAll();
		const storedSwim = storedNotes.find(
			({ lemmaEntry }) => lemmaEntry.lemma.canonicalLemma === "swim",
		)?.lemmaEntry;
		const storedWalk = storedNotes.find(
			({ lemmaEntry }) => lemmaEntry.id === englishWalkLemmaId,
		)?.lemmaEntry;

		expect(result.status).toBe("applied");
		expect(storedSwim?.lexicalRelations.nearSynonym).toContain(
			englishWalkLemmaId,
		);
		expect(storedWalk?.lexicalRelations.nearSynonym).toContain(storedSwim?.id);
	});

	test("addNewNote creates pending refs and pending relations for missing relation targets", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const pendingWalkFastId = derivePendingLemmaId({
			language: "en",
			canonicalLemma: "walk fast",
			lemmaKind: "Lexeme",
			lemmaSubKind: "VERB",
		});

		const result = await dict.addNewNote({
			draft: {
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
				relations: [
					{
						relationFamily: "lexical",
						relation: "nearSynonym",
						target: {
							kind: "pending",
							ref: {
								canonicalLemma: "walk fast",
								lemmaKind: "Lexeme",
								lemmaSubKind: "VERB",
							},
						},
					},
				],
			},
		});

		const storedSwim = storage
			.loadAll()
			.find(({ lemmaEntry }) => lemmaEntry.lemma.canonicalLemma === "swim");

		expect(result.status).toBe("applied");
		if (!storedSwim) {
			throw new Error("Expected stored swim note.");
		}
		expect(storedSwim.pendingRefs?.[0]).toMatchObject({
			pendingId: pendingWalkFastId,
			canonicalLemma: "walk fast",
		});
		expect(storedSwim.lemmaEntry.id).toBeDefined();
		expect(storedSwim.pendingRelations).toContainEqual({
			sourceLemmaId: storedSwim.lemmaEntry.id,
			relationFamily: "lexical",
			relation: "nearSynonym",
			targetPendingId: pendingWalkFastId,
		});
	});

	test("addNewNote dedupes duplicate owned surfaces in one draft", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const ownedSurfaceDraft = {
			surface: englishSwimLemmaSurface,
			note: {
				attestedTranslations: ["swim"],
				attestations: ["They swim every morning."],
				notes: "Plain present form.",
			},
		};

		const result = await dict.addNewNote({
			draft: {
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
				ownedSurfaces: [ownedSurfaceDraft, ownedSurfaceDraft],
			},
		});

		const storedSwim = storage
			.loadAll()
			.find(({ lemmaEntry }) => lemmaEntry.lemma.canonicalLemma === "swim");

		expect(result.status).toBe("applied");
		expect(storedSwim?.ownedSurfaceEntries).toHaveLength(1);
	});

	test("addNewNote dedupes duplicate pending relations in one draft", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const pendingRelationDraft = {
			relationFamily: "lexical",
			relation: "nearSynonym",
			target: {
				kind: "pending",
				ref: {
					canonicalLemma: "walk fast",
					lemmaKind: "Lexeme",
					lemmaSubKind: "VERB",
				},
			},
		} as const;

		const result = await dict.addNewNote({
			draft: {
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
				relations: [pendingRelationDraft, pendingRelationDraft],
			},
		});

		const pendingRelations = storage
			.loadAll()
			.flatMap(({ pendingRelations }) => pendingRelations);

		expect(result.status).toBe("applied");
		expect(pendingRelations).toHaveLength(1);
	});
});
