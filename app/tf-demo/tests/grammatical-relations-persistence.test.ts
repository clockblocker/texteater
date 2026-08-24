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

test("stores and projects the fixed total NumberCounterpart as an ordinary typed relation", async () => {
	const claim = allFixedGrammaticalRelationClaims().find(
		(candidate) => candidate.relation === "NumberCounterpart",
	);
	if (claim?.endpointKind !== "reading") {
		throw new Error("Expected the fixed Reading NumberCounterpart.");
	}
	const sourceLemmaId = "lemma-total-source";
	const targetLemmaId = "lemma-total-target";
	const sourceReadingId = "reading-total-source";
	const targetReadingId = "reading-total-target";
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

	await expect(
		runTestMutation(db, commitFixedGrammaticalRelation, { claim }),
	).resolves.toEqual({ status: "loaded" });
	await expect(
		loadGrammaticalRelationProjections(
			{ db } as never,
			sourceReadingId as never,
		),
	).resolves.toEqual([
		{
			relation: "NumberCounterpart",
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
			relation: "NumberCounterpart",
			targetCanonicalForm: claim.source.lemma.canonicalForm,
			provenance: "inferred",
			target: { kind: "UnitReadingNote", readingId: sourceReadingId },
		},
	]);
});

test("stores one formal-address number edge per spelling and navigates both exact Readings", async () => {
	const claims = allFixedGrammaticalRelationClaims().filter(
		(candidate) =>
			candidate.relation === "NumberCounterpart" &&
			candidate.endpointKind === "reading" &&
			candidate.source.lemma.coreFeatures.polite === "Form",
	);
	expect(
		claims.map(({ source, target }) => ({
			canonicalForm: source.lemma.canonicalForm,
			sourceNumber: source.lemma.coreFeatures.referenceNumber,
			targetNumber: target.lemma.coreFeatures.referenceNumber,
		})),
	).toEqual([
		{
			canonicalForm: "Sie",
			sourceNumber: "Plur",
			targetNumber: "Sing",
		},
		{
			canonicalForm: "Ihnen",
			sourceNumber: "Plur",
			targetNumber: "Sing",
		},
		{
			canonicalForm: "Ihrer",
			sourceNumber: "Plur",
			targetNumber: "Sing",
		},
	]);

	for (const [index, claim] of claims.entries()) {
		if (claim.endpointKind !== "reading") {
			throw new Error("Expected exact formal-address Reading endpoints.");
		}
		const sourceLemmaId = `lemma-formal-source-${index}`;
		const targetLemmaId = `lemma-formal-target-${index}`;
		const sourceReadingId = `reading-formal-source-${index}`;
		const targetReadingId = `reading-formal-target-${index}`;
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

		expect(readingFingerprint(claim.source)).not.toBe(
			readingFingerprint(claim.target),
		);
		await expect(
			runTestMutation(db, commitFixedGrammaticalRelation, { claim }),
		).resolves.toEqual({ status: "loaded" });
		expect(db.rows("grammaticalRelationEdges")).toHaveLength(1);
		await expect(
			loadGrammaticalRelationProjections(
				{ db } as never,
				sourceReadingId as never,
			),
		).resolves.toEqual([
			{
				relation: "NumberCounterpart",
				targetCanonicalForm: claim.target.lemma.canonicalForm,
				provenance: "direct",
				target: {
					kind: "UnitReadingNote",
					readingId: targetReadingId,
				},
			},
		]);
		await expect(
			loadGrammaticalRelationProjections(
				{ db } as never,
				targetReadingId as never,
			),
		).resolves.toEqual([
			{
				relation: "NumberCounterpart",
				targetCanonicalForm: claim.source.lemma.canonicalForm,
				provenance: "inferred",
				target: {
					kind: "UnitReadingNote",
					readingId: sourceReadingId,
				},
			},
		]);
	}
});

test("persists and navigates exact der-population Case and Number endpoints", async () => {
	const claims = [
		allFixedGrammaticalRelationClaims().find(
			(candidate) =>
				candidate.relation === "CaseCounterpart" &&
				candidate.endpointKind === "reading" &&
				candidate.source.lemma.coreFeatures.pronType === "Dem",
		),
		allFixedGrammaticalRelationClaims().find(
			(candidate) =>
				candidate.relation === "NumberCounterpart" &&
				candidate.endpointKind === "reading" &&
				candidate.source.lemma.coreFeatures.pronType === "Rel",
		),
	];
	expect(claims.every(Boolean)).toBe(true);

	for (const [index, claim] of claims.entries()) {
		if (claim?.endpointKind !== "reading") {
			throw new Error("Expected exact der-population Reading endpoints.");
		}
		const sourceLemmaId = `lemma-der-source-${index}`;
		const targetLemmaId = `lemma-der-target-${index}`;
		const sourceReadingId = `reading-der-source-${index}`;
		const targetReadingId = `reading-der-target-${index}`;
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

		await expect(
			runTestMutation(db, commitFixedGrammaticalRelation, { claim }),
		).resolves.toEqual({ status: "loaded" });
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
				target: {
					kind: "UnitReadingNote",
					readingId: targetReadingId,
				},
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
				target: {
					kind: "UnitReadingNote",
					readingId: sourceReadingId,
				},
			},
		]);
	}
});
