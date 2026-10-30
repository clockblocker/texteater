import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { authoredFor } from "dumcorpus/inventories";
import { makeSurfaceId } from "dumdict";
import type * as Dumling from "dumling/types";
import { internal } from "../convex/_generated/api";
import type schema from "../convex/schema";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import { createTestConvex, type TestConvexDb } from "./support/convex";
import {
	bankOccurrenceCommit,
	dieBankenOccurrenceCommit,
	expectCompleted,
	selectIn,
} from "./support/occurrences";

/**
 * Occurrence commits of particular realizations: an owned article, subject
 * es, and an exact authored Reading. The commit path itself is
 * `atomic-click-transaction.test.ts`.
 */

type TableName = keyof typeof schema.tables;

beforeEach(() => {
	// A Segment Selection schedules its Resolution Session; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

function rows<Table extends TableName>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

test("a noun's owned article is a member of its one occurrence, and derives no DET Reading until #683", async () => {
	const t = createTestConvex();
	const { selection, guard, segmentIds } = await selectIn(
		t,
		["die", " ", "Banken"],
		2,
	);

	const result = await t.mutation(
		internal.persistence.persistResolvedClick,
		dieBankenOccurrenceCommit(selection, guard, [0, 2]),
	);

	if (result.status !== "Committed") throw new Error("Expected a commit.");
	// The article's DET cell comes from dumcorpus once #683 rebuilds it
	// (system ADR 0040); a noun Surface no longer carries an article.
	expect(await rows(t, "lemmas")).toHaveLength(1);
	expect(await rows(t, "readings")).toHaveLength(1);
	expect(await rows(t, "attestations")).toHaveLength(1);
	expect(await rows(t, "visitorEncounters")).toHaveLength(1);
	const members = (await rows(t, "segments")).filter(({ _id }) =>
		[segmentIds[0], segmentIds[2]].includes(_id),
	);
	expect(members).toHaveLength(2);
	for (const member of members) {
		expect(member.attestationMembership?.attestationId).toBe(
			result.attestationId,
		);
		expect(member.resolutionState).toBeUndefined();
	}
	await expectCompleted(t, "request-1", result.attestationId);
});

test("subject es materializes its exact Reading and Knowledge while retaining one verbal occurrence", async () => {
	const verbLemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "geben",
		coreFeatures: {
			hasSepPrefix: null,
		},
	} as const;
	const verbReading = {
		unitKind: "Reading",
		lemma: verbLemma,
		emojiDescription: "🌍",
	} as const;
	const verbSurface = {
		unitKind: "Surface",
		language: "de",
		lemma: verbLemma,
		normalizedSurface: "es gibt",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: {
			verbForm: "Fin",
			tense: "Pres",
			mood: "Ind",
			person: "3",
			number: "Sing",
			expletive: "Subject",
			perfect: null,
			future: null,
			passive: null,
			voice: null,
		},
	} as const;
	const t = createTestConvex();
	const { selection, guard, segmentIds } = await selectIn(t, [
		"Es",
		" ",
		"gibt",
	]);

	const result = await t.mutation(internal.persistence.persistResolvedClick, {
		...bankOccurrenceCommit(selection, guard, "New"),
		reading: verbReading,
		readingKey: readingIdentityKey(verbReading),
		occurrence: {
			surfaceKey: makeSurfaceId("de", verbSurface),
			lemmaKey: lemmaIdentityKey(verbLemma),
			memberSegmentIndices: [0, 2],
			attestation: {
				unitKind: "Attestation",
				surface: verbSurface,
				members: [
					{ attested: "Es", orthography: "Standard" },
					{ attested: "gibt", orthography: "Standard" },
				],
				realizationCoverage: "Full",
				expletiveEvidence: { attested: "Es", orthography: "Standard" },
				valencyEvidence: [],
			},
		},
	});

	if (result.status !== "Committed") throw new Error("Expected a commit.");
	const attestations = await rows(t, "attestations");
	expect(attestations).toHaveLength(1);
	expect(attestations[0]).toMatchObject({
		expletiveEvidence: { attested: "Es", orthography: "Standard" },
		valencyEvidence: [],
	});
	const componentLemma = (await rows(t, "lemmas")).find(
		(row) => row.kind === "PRON",
	);
	const componentReading = (await rows(t, "readings")).find(
		(row) => row.lemmaId === componentLemma?._id,
	);
	expect(componentReading?.emojiDescription).toBe("⚪");
	expect(
		(await rows(t, "accumulatedKnowledge")).some(
			(row) => row.ownerReadingKey === componentReading?.readingKey,
		),
	).toBe(true);
	const members = (await rows(t, "segments")).filter(({ _id }) =>
		[segmentIds[0], segmentIds[2]].includes(_id),
	);
	expect(
		members.map((row) => row.attestationMembership?.attestationId),
	).toEqual([result.attestationId, result.attestationId]);
	await expectCompleted(t, "request-1", result.attestationId);
});

test("an exact authored Reading publishes its authored Knowledge at commit and asks for no Knowledge run", async () => {
	const t = createTestConvex();
	const { selection, guard } = await selectIn(t, ["ich"]);
	const [authored] = authoredFor({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "PRON",
		canonicalForm: "ich",
		coreFeatures: {
			person: "1",
			polite: null,
			poss: null,
			pronType: "Prs",
			case: "Nom",
			number: "Sing",
			gender: null,
		},
	});
	if (!authored) throw new Error("Expected the authored ich.");
	if (authored.lemma.family !== "Lexeme" || authored.lemma.kind !== "PRON")
		throw new Error("Expected the authored ich to be a Lexeme PRON.");
	const ichSurface = {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "ich",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: null,
		lemma: authored.lemma,
	} satisfies Dumling.Surface<"de">;
	const commit = bankOccurrenceCommit(selection, guard, "New");

	const result = await t.mutation(internal.persistence.persistResolvedClick, {
		...commit,
		reading: authored.reading,
		readingKey: readingIdentityKey(authored.reading),
		occurrence: {
			...commit.occurrence,
			attestation: {
				unitKind: "Attestation" as const,
				members: [
					{ attested: "ich", orthography: "Standard" as const },
				],
				realizationCoverage: "Full" as const,
				articleEvidence: null,
				surface: ichSurface,
			},
			surfaceKey: makeSurfaceId("de", ichSurface),
			lemmaKey: lemmaIdentityKey(authored.lemma),
		},
	});

	if (result.status !== "Committed") throw new Error("Expected a commit.");
	const [accumulated] = await rows(t, "accumulatedKnowledge");
	expect(accumulated?.ownerReadingKey).toBe(
		readingIdentityKey(authored.reading),
	);
	expect(accumulated?.knowledge).toMatchObject({
		definition: authored.knowledge.definition,
		transcription: "ɪç",
		translations: {
			en: [[{ kind: "Text", text: "I" }]],
			ru: [[{ kind: "Text", text: "я" }]],
		},
	});
	expect(accumulated?.status).toBe("Full");
	// Resolving an exact authored Reading calls no model (ADR 0021).
	expect(await rows(t, "knowledgeGenerationAttempts")).toEqual([]);
});
