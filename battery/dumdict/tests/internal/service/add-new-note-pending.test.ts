import { describe, expect, test } from "bun:test";
import {
	englishRunDraft,
	englishRunReading,
	englishSwimDraft,
	englishSwimReading,
	englishWalkReading,
	enSerializedNotesWithPendingSwimRelation,
	getBootedUpDumdict,
	pendingSwimEntryId,
} from "./helpers";

describe("configured service", () => {
	test("addNewNote reuses existing pending refs for proposed pending relation targets", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);

		const result = await dict.addNewNote({
			draft: {
				...englishRunDraft,
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

		const storedNotes = storage.loadAll();
		const pendingRelations = storedNotes.flatMap(
			({ pendingRelations }) => pendingRelations,
		);
		const pendingRefs = storedNotes.flatMap(
			({ pendingRefs }) => pendingRefs ?? [],
		);

		expect(result.status).toBe("applied");
		expect(pendingRefs).toHaveLength(2);
		expect(
			pendingRefs.every(
				({ pendingId }) => pendingId === pendingSwimEntryId,
			),
		).toBe(true);
		expect(pendingRelations).toContainEqual({
			sourceReading: englishRunReading,
			relationFamily: "lexical",
			relation: "nearSynonym",
			targetPendingId: pendingSwimEntryId,
		});
	});

	test("addNewNote picks up matching pending refs for the inserted Lemma", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);

		const result = await dict.addNewNote({
			draft: englishSwimDraft,
		});

		const storedNotes = storage.loadAll();
		const storedWalk = storedNotes.find(({ readingEntries }) =>
			readingEntries.some(
				({ reading }) =>
					reading.emojiDescription ===
					englishWalkReading.emojiDescription,
			),
		)?.readingEntries[0];
		const storedSwim = storedNotes.find(
			({ lemmaRecord }) => lemmaRecord.lemma.canonicalForm === "swim",
		)?.readingEntries[0];
		const pendingRelations = storedNotes.flatMap(
			({ pendingRelations }) => pendingRelations,
		);
		const pendingRefs = storedNotes.flatMap(
			({ pendingRefs }) => pendingRefs ?? [],
		);

		expect(result.status).toBe("applied");
		expect(storedWalk?.lexicalRelations.nearSynonym).toContainEqual(
			englishSwimReading,
		);
		expect(storedSwim?.lexicalRelations.nearSynonym).toContainEqual(
			englishWalkReading,
		);
		expect(pendingRelations).toHaveLength(0);
		expect(pendingRefs).toHaveLength(0);
	});
});
