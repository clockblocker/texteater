import { describe, expect, test } from "bun:test";
import {
	englishRunLemma,
	englishRunLemmaId,
	englishSwimLemma,
	englishWalkLemmaId,
	enSerializedNotesWithPendingSwimRelation,
	getBootedUpDumdict,
	pendingSwimLemmaId,
} from "./helpers";

describe("configured service", () => {
	test("addNewNote reuses existing pending refs for proposed pending relation targets", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);

		const result = await dict.addNewNote({
			draft: {
				lemma: englishRunLemma,
				note: {
					attestedTranslations: ["run"],
					attestations: ["They run every morning."],
					notes: "Move quickly on foot.",
				},
				relations: [
					{
						relationFamily: "lexical",
						relation: "nearSynonym",
						target: {
							kind: "pending",
							ref: {
								canonicalLemma: "swim",
								lemmaKind: "Lexeme",
								lemmaSubKind: "VERB",
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
			pendingRefs.every(({ pendingId }) => pendingId === pendingSwimLemmaId),
		).toBe(true);
		expect(pendingRelations).toContainEqual({
			sourceLemmaId: englishRunLemmaId,
			relationFamily: "lexical",
			relation: "nearSynonym",
			targetPendingId: pendingSwimLemmaId,
		});
	});

	test("addNewNote picks up matching pending refs for the inserted lemma", async () => {
		const { dict, storage } = getBootedUpDumdict(
			"en",
			enSerializedNotesWithPendingSwimRelation,
		);

		const result = await dict.addNewNote({
			draft: {
				lemma: englishSwimLemma,
				note: {
					attestedTranslations: ["swim"],
					attestations: ["They swim every morning."],
					notes: "Move through water by moving the body.",
				},
			},
		});

		const storedNotes = storage.loadAll();
		const storedWalk = storedNotes.find(
			({ lemmaEntry }) => lemmaEntry.id === englishWalkLemmaId,
		)?.lemmaEntry;
		const storedSwim = storedNotes.find(
			({ lemmaEntry }) => lemmaEntry.lemma.canonicalLemma === "swim",
		)?.lemmaEntry;
		const pendingRelations = storedNotes.flatMap(
			({ pendingRelations }) => pendingRelations,
		);
		const pendingRefs = storedNotes.flatMap(
			({ pendingRefs }) => pendingRefs ?? [],
		);

		expect(result.status).toBe("applied");
		expect(storedWalk?.lexicalRelations.nearSynonym).toContain(storedSwim?.id);
		expect(storedSwim?.lexicalRelations.nearSynonym).toContain(
			englishWalkLemmaId,
		);
		expect(pendingRelations).toHaveLength(0);
		expect(pendingRefs).toHaveLength(0);
	});
});
