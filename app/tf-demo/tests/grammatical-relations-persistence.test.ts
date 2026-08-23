import { expect, test } from "bun:test";
import { readingFingerprint } from "dumling/reading";
import { allFixedGrammaticalRelationClaims } from "dumrel/fixed";
import { commitFixedGrammaticalRelation } from "../convex/fixedMemberPersistence";
import { loadGrammaticalRelationProjections } from "../convex/modules/notes/relations";
import { lemmaIdentityKey } from "../server/linguisticIdentity";
import { IndexedTestDb, runTestMutation } from "./support/indexed-db";

test("stores one direct grammatical claim and projects its exact symmetric Reading", async () => {
	const claim = allFixedGrammaticalRelationClaims()[0];
	if (claim?.endpointKind !== "reading") {
		throw new Error("Expected a fixed Reading grammatical claim.");
	}
	const sourceLemmaId = "lemma-source";
	const targetLemmaId = "lemma-target";
	const sourceReadingId = "reading-source";
	const targetReadingId = "reading-target";
	const db = new IndexedTestDb({
		lemmas: [
			{
				_id: sourceLemmaId,
				lemmaKey: lemmaIdentityKey(claim.source.lemma),
				...claim.source.lemma,
			},
			{
				_id: targetLemmaId,
				lemmaKey: lemmaIdentityKey(claim.target.lemma),
				...claim.target.lemma,
			},
		],
		readings: [
			{
				_id: sourceReadingId,
				readingKey: readingFingerprint(claim.source),
				lemmaId: sourceLemmaId,
				emojiDescription: claim.source.emojiDescription,
			},
			{
				_id: targetReadingId,
				readingKey: readingFingerprint(claim.target),
				lemmaId: targetLemmaId,
				emojiDescription: claim.target.emojiDescription,
			},
		],
	});

	expect(
		await runTestMutation(db, commitFixedGrammaticalRelation, { claim }),
	).toEqual({ status: "loaded" });
	expect(
		await runTestMutation(db, commitFixedGrammaticalRelation, { claim }),
	).toEqual({ status: "unchanged" });
	expect(db.rows("grammaticalRelationEdges")).toHaveLength(1);

	await expect(
		loadGrammaticalRelationProjections(
			{ db } as never,
			sourceReadingId as never,
		),
	).resolves.toEqual([
		{
			relation: claim.relation,
			targetCanonicalForm: claim.target.lemma.canonicalForm,
			provenance: "direct",
			target: { kind: "UnitReadingNote", readingId: targetReadingId },
		},
	]);
	await expect(
		loadGrammaticalRelationProjections(
			{ db } as never,
			targetReadingId as never,
		),
	).resolves.toEqual([
		{
			relation: claim.relation,
			targetCanonicalForm: claim.source.lemma.canonicalForm,
			provenance: "inferred",
			target: { kind: "UnitReadingNote", readingId: sourceReadingId },
		},
	]);
});
