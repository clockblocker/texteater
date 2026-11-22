import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import type { ActionCtx } from "../convex/_generated/server";
import { scheduleValencyAccumulation } from "../convex/model/valencyAccumulation";
import { accumulateValency } from "../convex/valencyAccumulationActions";
import {
	foldedCanonicalForm,
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import type { ValencyAccumulator } from "../server/valencyAccumulation";
import {
	actionContext,
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

beforeEach(() => {
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const FRAGEN = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "fragen",
		coreFeatures: { hasSepPrefix: null },
	},
	emojiDescription: "❓",
} as const;

const NOM: Dumrel.GermanValencyComplement = {
	kind: "Case",
	governedCase: "Nom",
};
const ACC: Dumrel.GermanValencyComplement = {
	kind: "Case",
	governedCase: "Acc",
};
const NACH_DAT: Dumrel.GermanValencyComplement = {
	kind: "Preposition",
	preposition: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: "nach",
		coreFeatures: {},
	},
	governedCase: "Dat",
};

const PATTERN_NACH: Dumrel.ValencyPattern = [NOM, NACH_DAT];
const PATTERN_ACC: Dumrel.ValencyPattern = [NOM, ACC];

async function seedFragenOccurrences(
	t: TestConvexDb,
	note: { readonly knowledge?: unknown },
	count: number,
) {
	const readingKey = readingIdentityKey(FRAGEN);
	const { lemmaId, readingId, surfaceId } = await t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(FRAGEN.lemma),
			language: "de",
			family: FRAGEN.lemma.family,
			kind: FRAGEN.lemma.kind,
			canonicalForm: FRAGEN.lemma.canonicalForm,
			foldedCanonicalForm: foldedCanonicalForm(FRAGEN.lemma),
			coreFeatures: FRAGEN.lemma.coreFeatures,
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey,
			lemmaId,
			emojiDescription: FRAGEN.emojiDescription,
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: `surface:${readingKey}`,
			lemmaId,
			language: "de",
			normalizedSurface: "fragen",
			inflectionalFeatures: {
				mood: null,
				number: null,
				person: null,
				tense: null,
				verbForm: "Inf",
				expletive: null,
				perfect: null,
				future: null,
				voice: null,
				passive: null,
			},
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
		});
		await ctx.db.insert("dictionaryLemmas", { lemmaId });
		await ctx.db.insert("readingEntries", {
			readingId,
			record: {
				attestedTranslations: [],
				attestations: [],
				notes: "",
				...note,
			},
		});
		if (note.knowledge !== undefined) {
			await ctx.db.insert("accumulatedKnowledge", {
				ownerReadingKey: readingKey,
				knowledge: note.knowledge,
				status: "Full",
				updatedAt: 1,
			});
		}
		return { lemmaId, readingId, surfaceId };
	});
	const attestationIds: Id<"attestations">[] = [];
	const occurrences: {
		readonly segmentId: Id<"segments">;
		readonly sentenceId: Id<"sentences">;
		readonly scrollId: Id<"scrolls">;
	}[] = [];
	for (let index = 0; index < count; index += 1) {
		const { scrollId, sentenceIds, segmentIds } = await submitText(
			t,
			[
				[
					{ kind: "ResolvableText", text: "fragen" },
					{ kind: "OpaqueText", text: ` Satz ${index}` },
				],
			],
			{ submissionKey: `${readingKey}:${index}` },
		);
		const segmentId = segmentIds[0]?.[0];
		const sentenceId = sentenceIds[0];
		if (!segmentId || !sentenceId)
			throw new Error("Missing seeded segment.");
		const attestationId = await t.run(async (ctx) => {
			const id = await ctx.db.insert("attestations", {
				surfaceId,
				readingId,
				realizationCoverage: "Full",
				expletiveEvidence: null,
				valencyEvidence: [],
			});
			await ctx.db.patch(segmentId, {
				attestationMembership: {
					attestationId: id,
					orthography: "Standard",
				},
			});
			return id;
		});
		attestationIds.push(attestationId);
		occurrences.push({ segmentId, sentenceId, scrollId });
	}
	return {
		lemmaId,
		readingId,
		readingKey,
		attestationIds,
		occurrences,
	};
}

async function recordEncounter(
	t: TestConvexDb,
	visitorId: string,
	occurrence: {
		readonly segmentId: Id<"segments">;
		readonly sentenceId: Id<"sentences">;
		readonly scrollId: Id<"scrolls">;
	},
	attestationId: Id<"attestations">,
	readingId: Id<"readings">,
) {
	await t.run(async (ctx) => {
		await ctx.db.insert("visitorEncounters", {
			visitorId,
			requestId: `${visitorId}:${occurrence.segmentId}`,
			scrollId: occurrence.scrollId,
			sentenceId: occurrence.sentenceId,
			segmentId: occurrence.segmentId,
			attestationId,
			readingId,
			encounteredAt: Date.now(),
		});
	});
}

const ACCUMULATE = "valencyAccumulationActions:accumulate";

async function queuedValencyRuns(t: TestConvexDb) {
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	return jobs
		.filter(({ name }) => name === ACCUMULATE)
		.map(({ args }) => args[0]);
}

test("scheduleValencyAccumulation skips the first unauthored occurrence and schedules reused occurrences", async () => {
	const t = createTestConvex();
	const { attestationIds } = await seedFragenOccurrences(t, {}, 2);
	const [first, second] = attestationIds;
	if (!first || !second) throw new Error("Expected two attestations.");

	await t.run((ctx) =>
		scheduleValencyAccumulation(ctx, { attestationId: first }),
	);
	expect(await queuedValencyRuns(t)).toEqual([]);

	await t.run((ctx) =>
		scheduleValencyAccumulation(ctx, { attestationId: second }),
	);
	expect(await queuedValencyRuns(t)).toEqual([{ attestationId: second }]);
});

test("accumulateValency adds new patterns to the Reading, records realizedValencyPattern per Attestation, and projects per Visitor", async () => {
	const t = createTestConvex();
	const { readingId, attestationIds, occurrences } =
		await seedFragenOccurrences(
			t,
			{ knowledge: { valency: [PATTERN_NACH] } },
			3,
		);
	const [att1, att2, att3] = attestationIds;
	const [occ1, occ2, occ3] = occurrences;
	if (!att1 || !att2 || !att3 || !occ1 || !occ2 || !occ3)
		throw new Error("Expected three seeded occurrences.");

	// Visitor A's first encounter realized `nach + Dat` (creating occurrence).
	await t.run((ctx) =>
		ctx.db.patch(att1, { realizedValencyPattern: PATTERN_NACH }),
	);
	await recordEncounter(t, "visitor-a", occ1, att1, readingId);

	// Before meeting Acc, Visitor A sees only `nach + Dat`.
	const noteA1 = await t.query(api.readingNotes.get, {
		readingId,
		visitorId: "visitor-a",
	});
	expect(noteA1?.knowledge.valency).toEqual([PATTERN_NACH]);

	// Visitor A meets `Du hast mich gefragt` (new pattern `Nom + Acc`).
	const addAcc: ValencyAccumulator = () =>
		Effect.succeed({
			changes: [
				{
					kind: "Contribute",
					aspect: "valency",
					value: [PATTERN_ACC],
				},
			],
			realizedPattern: PATTERN_ACC,
			failures: [],
		});
	await accumulateValency(
		actionContext(t) as unknown as Pick<
			ActionCtx,
			"runQuery" | "runMutation"
		>,
		{ attestationId: att2 },
		addAcc,
	);
	await recordEncounter(t, "visitor-a", occ2, att2, readingId);

	// Visitor A now sees both encountered patterns in arrival order.
	const noteA2 = await t.query(api.readingNotes.get, {
		readingId,
		visitorId: "visitor-a",
	});
	expect(noteA2?.knowledge.valency).toEqual([PATTERN_NACH, PATTERN_ACC]);

	// Visitor B meets ONLY `Du hast mich gefragt` (matched against stored patterns, no Knowledge Change).
	const matchAcc: ValencyAccumulator = ({ valency }) => {
		expect(valency).toEqual([PATTERN_NACH, PATTERN_ACC]);
		return Effect.succeed({
			changes: [],
			realizedPattern: PATTERN_ACC,
			failures: [],
		});
	};
	await accumulateValency(
		actionContext(t) as unknown as Pick<
			ActionCtx,
			"runQuery" | "runMutation"
		>,
		{ attestationId: att3 },
		matchAcc,
	);
	await recordEncounter(t, "visitor-b", occ3, att3, readingId);

	// Visitor B sees ONLY `Nom + Acc` — no spoilers from Visitor A's `nach + Dat`.
	const noteB = await t.query(api.readingNotes.get, {
		readingId,
		visitorId: "visitor-b",
	});
	expect(noteB?.knowledge.valency).toEqual([PATTERN_ACC]);
});
