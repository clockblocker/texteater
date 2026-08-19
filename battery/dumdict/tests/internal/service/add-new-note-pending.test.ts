import { describe, expect, test } from "bun:test";
import {
	englishRunDraft,
	englishSwimDraft,
	englishSwimLemma,
	englishWalkLemma,
	englishWalkReading,
	enSerializedNotesWithPendingSwimRelation,
	getBootedUpDumdict,
} from "./helpers";

describe("pending lifecycle", () => {
	test("keeps independently addressable records for different source Readings", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		const result = await dict.addNewNote({
			draft: {
				...englishRunDraft,
				relations: [
					{
						target: {
							kind: "pending",
							pending: {
								relation: "nearSynonym",
								target: {
									language: "en",
									canonicalForm: "swim",
									family: "Lexeme",
									kind: "VERB",
								},
							},
						},
					},
				],
			},
		});
		expect(result.status).toBe("applied");
		expect(
			storage
				.loadAll()
				.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(2);
	});

	test("resolves when one matching Lemma appears and fans out its inverse", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		expect(
			(await dict.addNewNote({ draft: englishSwimDraft })).status,
		).toBe("applied");
		const notes = storage.loadAll();
		expect(
			notes.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(0);
		expect(
			notes
				.flatMap(({ readingEntries }) => readingEntries)
				.find(
					({ reading }) =>
						reading.emojiDescription ===
						englishWalkReading.emojiDescription,
				)?.knowledge?.semanticRelations?.nearSynonym,
		).toEqual([englishSwimLemma]);
		expect(
			notes
				.flatMap(({ readingEntries }) => readingEntries)
				.find(({ reading }) => reading.emojiDescription === "🏊")
				?.knowledge?.semanticRelations?.nearSynonym,
		).toEqual([englishWalkLemma]);
	});
});
