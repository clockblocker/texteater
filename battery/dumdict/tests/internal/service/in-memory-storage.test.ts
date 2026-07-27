import { describe, expect, test } from "bun:test";
import {
	englishRunLemmaId,
	englishSwimLemma,
	englishSwimLemmaSurface,
	englishWalkLemmaId,
	enSerializedNotes,
	getBootedUpDumdict,
	makeDumlingIdFor,
	type StoreRevision,
} from "./helpers";

describe("configured service", () => {
	test("in-memory storage does not publish partial commits after a failed precondition", async () => {
		const { storage } = getBootedUpDumdict("en", enSerializedNotes);
		const swimLemmaId = makeDumlingIdFor("en", englishSwimLemma);
		const swimSurfaceId = makeDumlingIdFor("en", englishSwimLemmaSurface);

		const result = await storage.commitChanges({
			baseRevision: "mem-1" as StoreRevision,
			changes: [
				{
					type: "createLemma",
					entry: {
						id: swimLemmaId,
						lemma: englishSwimLemma,
						lexicalRelations: {},
						morphologicalRelations: {},
						attestedTranslations: ["swim"],
						attestations: ["They swim every morning."],
						notes: "Move through water by moving the body.",
					},
					preconditions: [
						{ kind: "revisionMatches", revision: "mem-1" as StoreRevision },
						{ kind: "lemmaMissing", lemmaId: swimLemmaId },
					],
				},
				{
					type: "createOwnedSurface",
					entry: {
						id: swimSurfaceId,
						surface: englishSwimLemmaSurface,
						ownerLemmaId: englishRunLemmaId,
						attestedTranslations: ["swim"],
						attestations: ["They swim every morning."],
						notes: "Plain present form.",
					},
					preconditions: [
						{ kind: "revisionMatches", revision: "mem-1" as StoreRevision },
						{ kind: "lemmaExists", lemmaId: englishRunLemmaId },
						{ kind: "surfaceMissing", surfaceId: swimSurfaceId },
					],
				},
			],
		});

		expect(result).toMatchObject({
			status: "conflict",
			code: "semanticPreconditionFailed",
		});
		expect(
			storage.loadAll().some(({ lemmaEntry }) => lemmaEntry.id === swimLemmaId),
		).toBe(false);
	});

	test("in-memory storage rejects commits based on stale revisions", async () => {
		const { storage } = getBootedUpDumdict("en", enSerializedNotes);

		const firstCommit = await storage.commitChanges({
			baseRevision: "mem-1" as StoreRevision,
			changes: [
				{
					type: "patchLemma",
					lemmaId: englishWalkLemmaId,
					ops: [
						{
							kind: "addAttestation",
							value: "They walk before sunrise.",
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision: "mem-1" as StoreRevision },
						{ kind: "lemmaExists", lemmaId: englishWalkLemmaId },
						{
							kind: "lemmaAttestationMissing",
							lemmaId: englishWalkLemmaId,
							value: "They walk before sunrise.",
						},
					],
				},
			],
		});

		const staleCommit = await storage.commitChanges({
			baseRevision: "mem-1" as StoreRevision,
			changes: [
				{
					type: "patchLemma",
					lemmaId: englishWalkLemmaId,
					ops: [
						{
							kind: "addAttestation",
							value: "They walk after midnight.",
						},
					],
					preconditions: [
						{ kind: "revisionMatches", revision: "mem-1" as StoreRevision },
						{ kind: "lemmaExists", lemmaId: englishWalkLemmaId },
						{
							kind: "lemmaAttestationMissing",
							lemmaId: englishWalkLemmaId,
							value: "They walk after midnight.",
						},
					],
				},
			],
		});

		expect(firstCommit).toMatchObject({
			status: "committed",
			nextRevision: "mem-2",
		});
		expect(staleCommit).toMatchObject({
			status: "conflict",
			code: "revisionConflict",
			latestRevision: "mem-2",
		});
		expect(storage.loadAll()[0]?.lemmaEntry.attestations).not.toContain(
			"They walk after midnight.",
		);
	});
});
