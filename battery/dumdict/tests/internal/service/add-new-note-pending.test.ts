import { describe, expect, test } from "bun:test";
import {
	emojiOf,
	englishRunDraft,
	englishSwimDraft,
	englishSwimLemma,
	englishWalkReading,
	enSerializedNotesWithPendingSwimRelation,
	getBootedUpDumdict,
	lemmaRelations,
} from "./helpers";

describe("pending lifecycle", () => {
	test("keeps independently addressable records for different source Readings", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		const result = dict.addNewNote({
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

	test("resolves when one matching Lemma appears without persisting its inverse", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);
		expect(dict.addNewNote({ draft: englishSwimDraft }).status).toBe(
			"applied",
		);
		const notes = storage.loadAll();
		expect(
			notes.flatMap(({ pendingRelations }) => pendingRelations),
		).toHaveLength(0);
		expect(
			lemmaRelations(
				notes
					.flatMap(({ readingEntries }) => readingEntries)
					.find(
						({ reading }) =>
							emojiOf(reading) ===
							englishWalkReading.emojiDescription,
					)?.knowledge?.semanticRelations,
			)?.nearSynonym,
		).toEqual([englishSwimLemma]);
		expect(
			lemmaRelations(
				notes
					.flatMap(({ readingEntries }) => readingEntries)
					.find(({ reading }) => emojiOf(reading) === "🏊")?.knowledge
					?.semanticRelations,
			)?.nearSynonym,
		).toBeUndefined();
	});
});
