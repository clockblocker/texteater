import { describe, expect, test } from "bun:test";
import {
	derivePendingEntryId,
	englishSwimCitationSurface,
	englishSwimDraft,
	englishSwimReading,
	englishWalkReading,
	enSerializedNotes,
	getBootedUpDumdict,
} from "./helpers";

describe("configured service", () => {
	test("addNewNote rejects self relations", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addNewNote({
			draft: {
				...englishSwimDraft,
				relations: [
					{
						relationFamily: "lexical",
						relation: "nearSynonym",
						target: {
							kind: "existing",
							reading: englishSwimReading,
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

	test("addNewNote rejects pending self relations by Lemma description", async () => {
		const { dict } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addNewNote({
			draft: {
				...englishSwimDraft,
				relations: [
					{
						relationFamily: "lexical",
						relation: "nearSynonym",
						target: {
							kind: "pending",
							ref: {
								canonicalForm: "swim",
								family: "Lexeme",
								kind: "VERB",
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

	test("addNewNote adds inverse-paired relations between Readings", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);

		const result = await dict.addNewNote({
			draft: {
				...englishSwimDraft,
				relations: [
					{
						relationFamily: "lexical",
						relation: "nearSynonym",
						target: {
							kind: "existing",
							reading: englishWalkReading,
						},
					},
				],
			},
		});

		const storedNotes = storage.loadAll();
		const storedSwim = storedNotes.find(
			({ lemmaRecord }) => lemmaRecord.lemma.canonicalForm === "swim",
		)?.readingEntries[0];
		const storedWalk = storedNotes.find(({ readingEntries }) =>
			readingEntries.some(({ reading }) =>
				Bun.deepEquals(reading, englishWalkReading),
			),
		)?.readingEntries[0];

		expect(result.status).toBe("applied");
		expect(storedSwim?.lexicalRelations.nearSynonym).toContainEqual(
			englishWalkReading,
		);
		expect(storedWalk?.lexicalRelations.nearSynonym).toContainEqual(
			storedSwim?.reading,
		);
	});

	test("addNewNote creates pending refs and pending relations for missing relation targets", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const pendingWalkFastId = derivePendingEntryId({
			language: "en",
			canonicalForm: "walk fast",
			family: "Lexeme",
			kind: "VERB",
		});

		const result = await dict.addNewNote({
			draft: {
				...englishSwimDraft,
				relations: [
					{
						relationFamily: "lexical",
						relation: "nearSynonym",
						target: {
							kind: "pending",
							ref: {
								canonicalForm: "walk fast",
								family: "Lexeme",
								kind: "VERB",
							},
						},
					},
				],
			},
		});

		const storedSwim = storage
			.loadAll()
			.find(
				({ lemmaRecord }) => lemmaRecord.lemma.canonicalForm === "swim",
			);

		expect(result.status).toBe("applied");
		if (!storedSwim) {
			throw new Error("Expected stored swim note.");
		}
		expect(storedSwim.pendingRefs?.[0]).toMatchObject({
			pendingId: pendingWalkFastId,
			canonicalForm: "walk fast",
		});
		expect(storedSwim.readingEntries[0]?.reading).toEqual(
			englishSwimReading,
		);
		expect(storedSwim.pendingRelations).toContainEqual({
			sourceReading: englishSwimReading,
			relationFamily: "lexical",
			relation: "nearSynonym",
			targetPendingId: pendingWalkFastId,
		});
	});

	test("addNewNote dedupes duplicate owned surfaces in one draft", async () => {
		const { dict, storage } = getBootedUpDumdict("en", enSerializedNotes);
		const ownedSurfaceDraft = {
			surface: englishSwimCitationSurface,
			note: {
				attestedTranslations: ["swim"],
				attestations: ["They swim every morning."],
				notes: "Plain present form.",
			},
		};

		const result = await dict.addNewNote({
			draft: {
				...englishSwimDraft,
				ownedSurfaces: [ownedSurfaceDraft, ownedSurfaceDraft],
			},
		});

		const storedSwim = storage
			.loadAll()
			.find(
				({ lemmaRecord }) => lemmaRecord.lemma.canonicalForm === "swim",
			);

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
					canonicalForm: "walk fast",
					family: "Lexeme",
					kind: "VERB",
				},
			},
		} as const;

		const result = await dict.addNewNote({
			draft: {
				...englishSwimDraft,
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
