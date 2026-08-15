import { describe, expect, test } from "bun:test";
import {
	englishSwimLemma,
	englishWalkReading,
	enSerializedNotes,
	getBootedUpDumdict,
	type StoreRevision,
} from "./helpers";

describe("in-memory storage", () => {
	test("does not publish a partially created Lemma after a failed precondition", async () => {
		const { storage } = getBootedUpDumdict("en", enSerializedNotes);
		const result = await storage.commitChanges({
			baseRevision: "mem-1" as StoreRevision,
			changes: [
				{
					type: "createLemma",
					record: {
						lemma: englishSwimLemma,
					},
					preconditions: [
						{
							kind: "revisionMatches",
							revision: "mem-1" as StoreRevision,
						},
						{
							kind: "lemmaMissing",
							lemma: englishSwimLemma,
						},
					],
				},
				{
					type: "patchReading",
					reading: englishWalkReading,
					ops: [
						{
							kind: "addAttestation",
							value: "Already attested",
						},
					],
					preconditions: [
						{
							kind: "readingMissing",
							reading: englishWalkReading,
						},
					],
				},
			],
		});

		expect(result).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
		expect(
			storage
				.loadAll()
				.some(
					({ lemmaRecord }) =>
						lemmaRecord.lemma.canonicalForm === "swim",
				),
		).toBe(false);
	});

	test("rejects commits based on stale revisions", async () => {
		const { storage } = getBootedUpDumdict("en", enSerializedNotes);
		const change = {
			type: "patchReading" as const,
			reading: englishWalkReading,
			ops: [
				{
					kind: "addAttestation" as const,
					value: "They walk before sunrise.",
				},
			],
			preconditions: [
				{
					kind: "revisionMatches" as const,
					revision: "mem-1" as StoreRevision,
				},
				{
					kind: "readingExists" as const,
					reading: englishWalkReading,
				},
			],
		};
		const first = await storage.commitChanges({
			baseRevision: "mem-1" as StoreRevision,
			changes: [change],
		});
		const stale = await storage.commitChanges({
			baseRevision: "mem-1" as StoreRevision,
			changes: [change],
		});

		expect(first.status).toBe("committed");
		expect(stale).toMatchObject({
			status: "conflict",
			code: "revisionConflict",
			latestRevision: "mem-2",
		});
	});
});
