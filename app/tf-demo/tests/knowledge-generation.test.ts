import { afterEach, beforeEach, expect, jest, spyOn, test } from "bun:test";
import type { FunctionArgs } from "convex/server";
import { api, internal } from "../convex/_generated/api";
import type { Id, TableNames } from "../convex/_generated/dataModel";
import { scheduleKnowledgeGeneration } from "../convex/knowledgeGeneration";
import { defaultKnowledgeSettings } from "../convex/knowledgeSettings";
import {
	effectiveRelationPublicationPolicy,
	GENERATED_SEMANTIC_RELATION_POLICY,
	generatedKnowledgeAllowedForPublication,
	RELATION_PUBLICATION_FINGERPRINTS,
} from "../convex/model/generatedKnowledgeContainment";
import { STALE_KNOWLEDGE_RUN_AFTER_MS } from "../convex/model/knowledgeAttempts";
import { replaceAccumulatedKnowledge } from "../convex/model/shadows";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import {
	answeredRelationKinds,
	knowledgeRequestComplete,
	missingKnowledgeRequest,
} from "../server/knowledgeCompletion";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

const PRODUCTION_EVIDENCE = {
	request: { definition: null },
	failures: [],
	operationTraces: [],
};

beforeEach(() => {
	// Scheduling a Knowledge attempt queues its action; nothing here runs it.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

test("retry requests skip saved text and covered translations but retain missing leaves", () => {
	expect(
		missingKnowledgeRequest(
			{
				definition: null,
				transcription: null,
				translations: { en: null, ru: null },
			},
			{
				knowledge: {
					definition: "Ein Geldinstitut.",
					translations: { en: ["bank"], ru: [] },
				},
				checkedRelationKinds: [],
			},
		),
	).toEqual({ transcription: null, translations: { ru: null } });
	expect(
		missingKnowledgeRequest(
			{ definition: null },
			{ knowledge: {}, checkedRelationKinds: [] },
		),
	).toEqual({ definition: null });
});

const EMPTY_RELATION_RUN: PublishArgs["relationPublication"] = {
	runNumber: 1,
	requestedKinds: [],
	artifactPath: null,
	fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
	proposals: [],
};

const BANK_LEMMA = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
} as const;
const BANK_READING = {
	unitKind: "Reading",
	lemma: BANK_LEMMA,
	emojiDescription: "🏦",
} as const;
const BANK_READING_KEY = readingIdentityKey(BANK_READING);
const ANGST_READING = {
	...BANK_READING,
	lemma: { ...BANK_LEMMA, canonicalForm: "Angst" },
} as const;

type SeededReading = typeof BANK_READING | typeof ANGST_READING;
type ReadingRecord = Record<string, unknown>;
type Occurrence = {
	readonly readingId: Id<"readings">;
	readonly lemmaId: Id<"lemmas">;
	readonly attestationId: Id<"attestations">;
	readonly textId: Id<"texts">;
	readonly sentenceId: Id<"sentences">;
	readonly segmentId: Id<"segments">;
	readonly readingKey: string;
};

/** "Angst vor Hunden": intake says the NOUN Angst governs vor + Dat. */
function governedAnalysis(segmentedSentenceId: string) {
	const segment = (
		offset: number,
		text: string,
		kind: "ResolvableText" | "Whitespace" = "ResolvableText",
	) => ({ offset, kind, text, surface: text });
	const target = (id: string, offset: number, kind: string) => ({
		id,
		members: [{ offset, role: "Head" as const }],
		routeMass: [{ key: kind, share: 1 }],
		identity: null,
		provenance: "vote",
	});
	return {
		sentenceId: segmentedSentenceId,
		language: "de" as const,
		stitchedText: "Angst vor Hunden",
		segments: [
			segment(0, "Angst"),
			segment(5, " ", "Whitespace"),
			segment(6, "vor"),
			segment(9, " ", "Whitespace"),
			segment(10, "Hunden"),
		],
		targets: [
			target("t1", 0, "NOUN"),
			target("t2", 6, "ADP"),
			target("t3", 10, "NOUN"),
		],
		phrasemes: [],
		fusions: [],
		government: [
			{
				offset: 6,
				preposition: "vor",
				case: "Dat" as const,
				governor: "t1",
			},
		],
	};
}

/**
 * Stores one saved occurrence of a Reading: its Sentence, Lemma, Surface,
 * Reading, and Attestation, with the first Segment as the only member.
 */
async function seedOccurrence(
	t: TestConvexDb,
	reading: SeededReading = BANK_READING,
): Promise<Occurrence> {
	const governed = reading.lemma.canonicalForm === "Angst";
	const { textId, sentenceIds, segmentIds } = await submitText(t, [
		[
			{ kind: "ResolvableText", text: reading.lemma.canonicalForm },
			{
				kind: "OpaqueText",
				text: governed ? " vor Hunden" : " am Fluss",
			},
		],
	]);
	const sentenceId = sentenceIds[0];
	const segmentId = segmentIds[0]?.[0];
	if (!sentenceId || !segmentId) throw new Error("Expected a Segment.");
	const readingKey = readingIdentityKey(reading);
	return t.run(async (ctx) => {
		const lemmaId = await ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(reading.lemma),
			language: "de",
			family: reading.lemma.family,
			kind: reading.lemma.kind,
			canonicalForm: reading.lemma.canonicalForm,
			coreFeatures: reading.lemma.coreFeatures,
		});
		const readingId = await ctx.db.insert("readings", {
			readingKey,
			lemmaId,
			emojiDescription: reading.emojiDescription,
		});
		const surfaceId = await ctx.db.insert("surfaces", {
			surfaceKey: `surface:${readingKey}`,
			lemmaId,
			language: "de",
			normalizedSurface: reading.lemma.canonicalForm,
			inflectionalFeatures: null,
			spelling: "Canonical",
			surfaceFeatures: null,
		});
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId,
			readingId,
			realizationCoverage: "Full",
			articleEvidence: null,
		});
		await ctx.db.patch(segmentId, {
			attestationMembership: { attestationId, orthography: "Standard" },
		});
		if (governed) {
			const sentence = await ctx.db.get(sentenceId);
			if (!sentence) throw new Error("Expected a stored Sentence.");
			await ctx.db.insert("sentenceAnalyses", {
				sentenceId,
				analysis: governedAnalysis(sentence.segmentedSentenceId),
			});
		}
		return {
			readingId,
			lemmaId,
			attestationId,
			textId,
			sentenceId,
			segmentId,
			readingKey,
		};
	});
}

/** Registers the Reading in the dictionary the publication planner patches. */
async function addToDictionary(
	t: TestConvexDb,
	occurrence: Occurrence,
	record: ReadingRecord = {},
) {
	await t.run(async (ctx) => {
		await ctx.db.insert("dictionaryLemmas", {
			lemmaId: occurrence.lemmaId,
		});
		await ctx.db.insert("readingEntries", {
			readingId: occurrence.readingId,
			record: {
				attestedTranslations: [],
				attestations: [],
				notes: "",
				...record,
			},
		});
	});
}

async function seedDictionaryReading(
	t: TestConvexDb,
	record: ReadingRecord = {},
) {
	const occurrence = await seedOccurrence(t);
	await addToDictionary(t, occurrence, record);
	return occurrence;
}

async function insertAttempt(
	t: TestConvexDb,
	occurrence: Occurrence,
	attemptKey: string,
	overrides: {
		state?: "Waiting" | "Scheduled" | "Running" | "Failed";
		runNumber?: number;
		failureCode?: string;
		failureMessage?: string;
		createdAt?: number;
	} = {},
) {
	const createdAt = overrides.createdAt ?? 1;
	await t.run((ctx) =>
		ctx.db.insert("knowledgeGenerationAttempts", {
			attemptKey,
			visitorId: "visitor-1",
			ownerReadingKey: occurrence.readingKey,
			readingId: occurrence.readingId,
			attestationId: occurrence.attestationId,
			state: "Running",
			...overrides,
			createdAt,
			updatedAt: createdAt,
		}),
	);
}

async function insertAccumulatedKnowledge(
	t: TestConvexDb,
	occurrence: Occurrence,
	value: {
		knowledge: unknown;
		status: "Partial" | "Full";
		coveredTranslationLanguages?: ("en" | "ru")[];
	},
) {
	await t.run((ctx) =>
		ctx.db.insert("accumulatedKnowledge", {
			ownerReadingKey: occurrence.readingKey,
			...value,
			updatedAt: 1,
		}),
	);
}

function schedule(
	t: TestConvexDb,
	input: Parameters<typeof scheduleKnowledgeGeneration>[1],
) {
	return t.run((ctx) => scheduleKnowledgeGeneration(ctx, input));
}

const RUN_ACTION = "knowledgeGenerationActions:runKnowledgeGeneration";
const WATCHDOG = "knowledgeGeneration:recoverStaleRun";

/** The attempts whose Knowledge action has been queued, in order. */
async function scheduledAttempts(t: TestConvexDb) {
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	return jobs
		.filter(({ name }) => name === RUN_ACTION)
		.map(({ name, args }) => ({ name, args: args[0] }));
}

/** The watchdog runs queued, in order. */
async function scheduledWatchdogs(t: TestConvexDb) {
	const jobs = await t.run((ctx) =>
		ctx.db.system.query("_scheduled_functions").collect(),
	);
	return jobs
		.filter(({ name }) => name === WATCHDOG)
		.map(({ args }) => args[0]);
}

function queued(...attemptKeys: string[]) {
	return attemptKeys.map((attemptKey) => ({
		name: RUN_ACTION,
		args: { attemptKey },
	}));
}

function attempts(t: TestConvexDb) {
	return t.run((ctx) =>
		ctx.db.query("knowledgeGenerationAttempts").collect(),
	);
}

function rows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

type PublishArgs = FunctionArgs<typeof internal.knowledgeGeneration.publish>;

function publishArgs(
	overrides: Partial<PublishArgs> & { attemptKey: string },
): PublishArgs {
	return {
		final: true,
		reading: BANK_READING,
		changes: [],
		pendingRelations: [],
		productionEvidence: PRODUCTION_EVIDENCE,
		relationPublication: EMPTY_RELATION_RUN,
		...overrides,
	};
}

function publish(t: TestConvexDb, args: PublishArgs) {
	return t.mutation(internal.knowledgeGeneration.publish, args);
}

test("a Full Reading still tops up government its new sentence attests, and only once", async () => {
	const input = (occurrence: Occurrence) => ({
		attemptKey: "government-top-up",
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	});
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t, ANGST_READING);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { translations: { en: ["fear"], ru: ["страх"] } },
		status: "Full",
		coveredTranslationLanguages: ["en", "ru"],
	});
	await schedule(t, input(occurrence));
	expect(await attempts(t)).toHaveLength(1);
	expect(
		await t.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "government-top-up",
		}),
	).toEqual(
		expect.objectContaining({
			kind: "Generate",
			topUpOnly: true,
			translationLanguages: [],
			governedPrepositions: [{ preposition: "vor", case: "Dat" }],
		}),
	);

	const covered = createTestConvex();
	const coveredOccurrence = await seedOccurrence(covered, ANGST_READING);
	await insertAccumulatedKnowledge(covered, coveredOccurrence, {
		knowledge: {
			translations: { en: ["fear"], ru: ["страх"] },
			governedPrepositions: [
				{ preposition: { canonicalForm: "vor" }, case: "Dat" },
			],
		},
		status: "Full",
		coveredTranslationLanguages: ["en", "ru"],
	});
	await schedule(covered, input(coveredOccurrence));
	expect(await attempts(covered)).toEqual([]);
});

test("existing requested content completes an empty generated batch and the first complete writer wins", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t, {
		knowledge: {
			definition: "canonical",
			translations: { en: ["bank"] },
		},
	});
	await insertAttempt(t, occurrence, "attempt-1");
	await insertAttempt(t, occurrence, "attempt-2");

	expect(await publish(t, publishArgs({ attemptKey: "attempt-1" }))).toEqual({
		status: "Committed",
	});
	expect(await publish(t, publishArgs({ attemptKey: "attempt-2" }))).toEqual({
		status: "AlreadyFull",
	});
	expect(await rows(t, "accumulatedKnowledge")).toEqual([
		expect.objectContaining({
			ownerReadingKey: BANK_READING_KEY,
			knowledge: {
				definition: "canonical",
				translations: { en: ["bank"] },
			},
			status: "Full",
		}),
	]);
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "attempt-1",
			state: "Committed",
		}),
		expect.objectContaining({ attemptKey: "attempt-2", state: "LostRace" }),
	]);
});

test("commit-time relation blocking keeps base evidence and records publication failure", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "attempt-1");
	const relationPublication: PublishArgs["relationPublication"] = {
		runNumber: 1,
		requestedKinds: ["synonym"],
		artifactPath: "gate/verdict.json",
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
		proposals: [
			{
				relation: "synonym",
				targetShadow: {
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm: "Geldinstitut",
				},
			},
		],
	};
	const result = await publish(
		t,
		publishArgs({
			attemptKey: "attempt-1",
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Ein Geldinstitut.",
				},
				{
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "synonym",
					value: [],
				},
			],
			pendingRelations: [
				{
					relation: "synonym",
					target: {
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Geldinstitut",
					},
				},
			],
			relationPublication,
		}),
	);
	expect(result).toEqual({ status: "Committed" });
	// The blocked relation never reaches the dictionary: no pending Shadow, no edge.
	expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
	expect(await rows(t, "knowledgeChanges")).toEqual([
		expect.objectContaining({
			change: expect.objectContaining({ aspect: "definition" }),
		}),
	]);
	expect((await rows(t, "readingEntries"))[0]?.record).toMatchObject({
		knowledge: { definition: "Ein Geldinstitut." },
	});
	expect(await rows(t, "generatedRelationRuns")).toEqual([
		expect.objectContaining({
			relation: "synonym",
			generatedTargets: 1,
			publicationFailures: 1,
			directMatches: 0,
			pendingShadows: 0,
		}),
	]);
	expect(await rows(t, "generatedRelationProposals")).toEqual([
		expect.objectContaining({ outcome: "PublicationFailed" }),
	]);
});

test("manual writes never downgrade Full and failures persist only a safe category", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { definition: "winner" },
		status: "Full",
	});
	await insertAttempt(t, occurrence, "attempt-1");
	await t.run((ctx) =>
		replaceAccumulatedKnowledge(ctx, occurrence.readingKey, {
			definition: "manual",
		}),
	);
	await t.mutation(internal.knowledgeGeneration.fail, {
		attemptKey: "attempt-1",
		runNumber: 1,
		failureCode: "providerPayload",
		failureMessage: "secret provider response",
	});
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		knowledge: { definition: "manual" },
		status: "Full",
	});
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureMessage: "Knowledge generation failed. Please retry.",
	});
});

/** Stubs the model provider and restores it with the fixture API key. */
function stubProvider(respond: (modelInput: ModelInput) => Promise<string>) {
	const previousFetch = globalThis.fetch;
	const previousKey = process.env.OPENAI_API_KEY;
	const requests: ModelInput[] = [];
	process.env.OPENAI_API_KEY = "fixture";
	globalThis.fetch = (async (_url, init) => {
		const body = JSON.parse(String(init?.body));
		const modelInput: ModelInput = JSON.parse(body.input[1].content);
		requests.push(modelInput);
		return Response.json({
			status: "completed",
			output: [
				{
					content: [
						{
							type: "output_text",
							text: JSON.stringify({
								value: { text: await respond(modelInput) },
							}),
						},
					],
				},
			],
		});
	}) as typeof fetch;
	return {
		requests,
		restore() {
			globalThis.fetch = previousFetch;
			if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
			else process.env.OPENAI_API_KEY = previousKey;
		},
	};
}

type ModelInput = { readonly aspect?: string; readonly language?: string };

test("Full is a zero-call cache hit and generation keeps the complete German base mask", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { translations: { en: ["bank"], ru: ["банк"] } },
		status: "Full",
		coveredTranslationLanguages: ["en", "ru"],
	});
	await insertAttempt(t, occurrence, "already-full", { state: "Scheduled" });
	const provider = stubProvider(async () => {
		throw new Error("A Full attempt needs no model call.");
	});
	try {
		expect(
			await t.action(
				internal.knowledgeGenerationActions.runKnowledgeGeneration,
				{ attemptKey: "already-full" },
			),
		).toBeNull();
	} finally {
		provider.restore();
	}
	expect(provider.requests).toEqual([]);
	expect(await attempts(t)).toEqual([
		expect.objectContaining({ state: "LostRace" }),
	]);
	expect(await rows(t, "knowledgeChanges")).toEqual([]);

	const request = generationRequestFor(
		{
			unitKind: "Reading",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Bank",
				coreFeatures: { gender: "Fem", hyph: null },
			},
			emojiDescription: "🏦",
		},
		[],
	);
	// Government is asked only when intake attested it in the sentence.
	expect(request).toEqual({
		transcription: null,
		definition: null,
		translations: { en: null, ru: null },
	});
	expect(
		generationRequestFor(
			{
				unitKind: "Reading",
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm: "Bank",
					coreFeatures: { gender: "Fem", hyph: null },
				},
				emojiDescription: "🏦",
			},
			[],
			{
				translationLanguages: ["ru"],
				topUpOnly: true,
			},
		),
	).toEqual({ translations: { ru: null } });
	const angst = {
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Angst",
			coreFeatures: { gender: "Fem", hyph: null },
		},
		emojiDescription: "😨",
	} as const;
	expect(
		generationRequestFor(angst, [], { attestsGovernment: true }),
	).toEqual({
		transcription: null,
		definition: null,
		translations: { en: null, ru: null },
		governedPrepositions: null,
	});
	expect(
		generationRequestFor(angst, [], {
			translationLanguages: [],
			topUpOnly: true,
			attestsGovernment: true,
		}),
	).toEqual({ governedPrepositions: null });
});

test("production publication remains empty without a reviewed verdict", () => {
	expect(GENERATED_SEMANTIC_RELATION_POLICY).toEqual({
		productionRequest: "reviewedAllowlist",
		productionPublication: "reviewedAllowlist",
		rollback: "serverSideCommitGate",
		verdictIssue: 193,
		publicationIssue: 194,
	});
	expect(effectiveRelationPublicationPolicy()).toMatchObject({
		artifactPath: null,
		qualifiedKinds: [],
		invalidationReasons: [
			"archivedRunEvidence",
			"missingReviewedVerdictArtifact",
			"historicalCandidateRequiresReevaluation",
		],
	});
	const publishable = generatedKnowledgeAllowedForPublication({
		changes: [
			{
				kind: "Contribute",
				aspect: "transcription",
				value: "bank",
			},
			{
				kind: "Contribute",
				aspect: "semanticRelations",
				relation: "synonym",
				value: [],
			},
			{
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
		],
		pendingRelations: [
			{
				relation: "synonym",
				target: {
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm: "Geldinstitut",
				},
			},
		],
	});

	expect(publishable).toEqual({
		changes: [
			{
				kind: "Contribute",
				aspect: "transcription",
				value: "bank",
			},
			{
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
		],
		pendingRelations: [],
	});
});

test("the production application path keeps generated relations outside Dumdict", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t);
	await insertAttempt(t, occurrence, "attempt-1");
	const result = await publish(
		t,
		publishArgs({
			attemptKey: "attempt-1",
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Ein Geldinstitut.",
				},
				{
					kind: "Contribute",
					aspect: "semanticRelations",
					relation: "synonym",
					value: [],
				},
			],
			pendingRelations: [
				{
					relation: "synonym",
					target: {
						language: "de",
						family: "Lexeme",
						kind: "NOUN",
						canonicalForm: "Geldinstitut",
					},
				},
			],
		}),
	);

	expect(result).toEqual({ status: "Committed" });
	expect(await rows(t, "knowledgeChanges")).toEqual([
		expect.objectContaining({
			knowledgeChangeKey: "attempt-1:1:1:0",
			change: {
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
		}),
	]);
	expect(await rows(t, "pendingSemanticRelations")).toEqual([]);
	expect(await rows(t, "semanticRelationEdges")).toEqual([]);
	expect((await attempts(t))[0]).toMatchObject({
		state: "Committed",
		publicationSequence: 1,
	});
});

test("scheduling is exact, idempotent, skips Full, and retries Failed", async () => {
	const knowledgeDraftJson = JSON.stringify({
		sourceFingerprint: "draft-source",
		texts: [],
	});
	const inputFor = (occurrence: Occurrence, attemptKey: string) => ({
		knowledgeDraftJson,
		attemptKey,
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	});

	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	const input = inputFor(occurrence, "request-1");
	await schedule(t, input);
	await schedule(t, input);
	expect(await scheduledAttempts(t)).toEqual(queued("request-1"));
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "request-1",
			ownerReadingKey: BANK_READING_KEY,
			state: "Scheduled",
			knowledgeDraftJson,
		}),
	]);
	const loaded = await t.mutation(internal.knowledgeGeneration.begin, {
		attemptKey: "request-1",
	});
	expect(loaded).toEqual(
		expect.objectContaining({
			kind: "Generate",
			knowledgeDraftJson,
			reading: expect.objectContaining({ emojiDescription: "🏦" }),
			encounter: expect.objectContaining({
				target: {
					family: "Lexeme",
					kind: "NOUN",
					memberSegmentIndices: [0],
				},
			}),
			attestation: expect.objectContaining({ unitKind: "Attestation" }),
		}),
	);
	expect(JSON.stringify(loaded)).toContain("Bank");
	expect(JSON.stringify(loaded)).toContain("am Fluss");

	const otherReadingId = await t.run((ctx) =>
		ctx.db.insert("readings", {
			readingKey: "reading-other",
			lemmaId: occurrence.lemmaId,
			emojiDescription: "🪑",
		}),
	);
	await expect(
		schedule(t, { ...input, readingId: otherReadingId }),
	).rejects.toThrow("exact saved occurrence");

	const full = createTestConvex();
	const fullOccurrence = await seedOccurrence(full);
	await insertAccumulatedKnowledge(full, fullOccurrence, {
		knowledge: { translations: { en: ["bank"], ru: ["банк"] } },
		status: "Full",
		coveredTranslationLanguages: ["en", "ru"],
	});
	await schedule(full, inputFor(fullOccurrence, "full-request"));
	expect(await scheduledAttempts(full)).toEqual([]);
	expect(await attempts(full)).toEqual([]);

	const supplement = createTestConvex();
	const supplementOccurrence = await seedOccurrence(supplement);
	await insertAccumulatedKnowledge(supplement, supplementOccurrence, {
		knowledge: { translations: { en: ["bank"] } },
		status: "Full",
		coveredTranslationLanguages: ["en"],
	});
	await schedule(
		supplement,
		inputFor(supplementOccurrence, "russian-supplement"),
	);
	expect(
		await supplement.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "russian-supplement",
		}),
	).toEqual(
		expect.objectContaining({
			kind: "Generate",
			translationLanguages: ["ru"],
			topUpOnly: true,
			governedPrepositions: [],
		}),
	);

	const retry = createTestConvex();
	const retryOccurrence = await seedOccurrence(retry);
	await retry.run((ctx) =>
		ctx.db.insert("visitorClicks", {
			requestId: "click-request",
			visitorId: "visitor-1",
			textId: retryOccurrence.textId,
			sentenceId: retryOccurrence.sentenceId,
			segmentId: retryOccurrence.segmentId,
			attestationId: retryOccurrence.attestationId,
			clickedAt: 1,
		}),
	);
	await insertAttempt(retry, retryOccurrence, "retry-request", {
		state: "Failed",
		failureCode: "generationFailed",
		failureMessage: "Knowledge generation failed. Please retry.",
	});
	await retry.mutation(internal.knowledgeGeneration.retry, {
		attemptKey: "retry-request",
		visitorId: "visitor-1",
		readingId: retryOccurrence.readingId,
		attestationId: retryOccurrence.attestationId,
	});
	expect(await scheduledAttempts(retry)).toEqual(queued("retry-request"));
	const [retried] = await attempts(retry);
	expect(retried).toEqual(expect.objectContaining({ state: "Scheduled" }));
	expect(retried).not.toHaveProperty("failureMessage");
});

test("a second Knowledge demand for the same Reading waits for the active attempt", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	const input = {
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	};

	await schedule(t, { ...input, attemptKey: "resolution-request" });
	await schedule(t, { ...input, attemptKey: "coverage-request" });

	expect(await scheduledAttempts(t)).toEqual(queued("resolution-request"));
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "resolution-request",
			state: "Scheduled",
		}),
		expect.objectContaining({
			attemptKey: "coverage-request",
			state: "Waiting",
		}),
	]);
});

test("settling an active Knowledge attempt schedules the next waiting demand", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAttempt(t, occurrence, "resolution-request");
	await insertAttempt(t, occurrence, "coverage-request", {
		state: "Waiting",
		createdAt: 2,
	});

	await t.mutation(internal.knowledgeGeneration.fail, {
		attemptKey: "resolution-request",
		runNumber: 1,
		failureCode: "generationFailed",
		failureMessage: "failed",
	});

	expect(await scheduledAttempts(t)).toEqual(queued("coverage-request"));
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "resolution-request",
			state: "Failed",
		}),
		expect.objectContaining({
			attemptKey: "coverage-request",
			state: "Scheduled",
		}),
	]);
});

test("a late action cannot end the run that replaced it", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await insertAttempt(t, occurrence, "attempt-1", { runNumber: 2 });
	const failure = {
		attemptKey: "attempt-1",
		failureCode: "generationFailed",
		failureMessage: "failed",
	};

	// Run 1's action, and an action that never claimed a run, come back late.
	await t.mutation(internal.knowledgeGeneration.fail, {
		...failure,
		runNumber: 1,
	});
	await t.mutation(internal.knowledgeGeneration.fail, {
		...failure,
		runNumber: null,
	});
	await t.mutation(internal.catalogGrowthSignals.recordKnowledgeCatalogMiss, {
		attemptKey: "attempt-1",
		runNumber: 1,
		miss: {
			decision: "CatalogMiss",
			route: "de/Lexeme/NOUN",
			stage: "produceKnowledge",
			message: "No reviewed member matches",
		},
	});
	expect(
		await publish(
			t,
			publishArgs({
				attemptKey: "attempt-1",
				relationPublication: { ...EMPTY_RELATION_RUN, runNumber: 1 },
			}),
		),
	).toEqual({ status: "Ignored" });
	// Only a Scheduled attempt has a run to claim.
	expect(
		await t.mutation(internal.knowledgeGeneration.begin, {
			attemptKey: "attempt-1",
		}),
	).toBe(null);
	expect(await attempts(t)).toEqual([
		expect.objectContaining({ state: "Running", runNumber: 2 }),
	]);
	expect(await rows(t, "catalogGrowthSignals")).toEqual([]);

	await t.mutation(internal.knowledgeGeneration.fail, {
		...failure,
		runNumber: 2,
	});
	expect(await attempts(t)).toEqual([
		expect.objectContaining({ state: "Failed", runNumber: 2 }),
	]);
});

test("a run whose action died fails as interrupted, starts the next demand, and retries", async () => {
	const t = createTestConvex();
	const occurrence = await seedOccurrence(t);
	await t.run((ctx) =>
		ctx.db.insert("visitorClicks", {
			requestId: "click-request",
			visitorId: "visitor-1",
			textId: occurrence.textId,
			sentenceId: occurrence.sentenceId,
			segmentId: occurrence.segmentId,
			attestationId: occurrence.attestationId,
			clickedAt: 1,
		}),
	);
	const input = {
		visitorId: "visitor-1",
		readingId: occurrence.readingId,
		attestationId: occurrence.attestationId,
	};
	await schedule(t, { ...input, attemptKey: "stuck" });
	await schedule(t, { ...input, attemptKey: "behind" });
	expect(await scheduledWatchdogs(t)).toEqual([
		{ attemptKey: "stuck", runNumber: 1 },
	]);
	await t.mutation(internal.knowledgeGeneration.begin, {
		attemptKey: "stuck",
	});

	// A run still inside an action's lifetime is left alone and checked again.
	expect(
		await t.mutation(internal.knowledgeGeneration.recoverStaleRun, {
			attemptKey: "stuck",
			runNumber: 1,
		}),
	).toBe(false);
	expect(await scheduledWatchdogs(t)).toHaveLength(2);

	jest.setSystemTime(Date.now() + STALE_KNOWLEDGE_RUN_AFTER_MS);
	expect(
		await t.mutation(internal.knowledgeGeneration.recoverStaleRun, {
			attemptKey: "stuck",
			runNumber: 1,
		}),
	).toBe(true);
	expect(await attempts(t)).toEqual([
		expect.objectContaining({
			attemptKey: "stuck",
			state: "Failed",
			failureCode: "interrupted",
		}),
		expect.objectContaining({ attemptKey: "behind", state: "Scheduled" }),
	]);
	expect(await scheduledAttempts(t)).toEqual(queued("stuck", "behind"));

	// The dead action's own late failure no longer owns the attempt.
	await t.mutation(internal.knowledgeGeneration.fail, {
		attemptKey: "stuck",
		runNumber: 1,
		failureCode: "generationFailed",
		failureMessage: "failed",
	});
	expect((await attempts(t))[0]).toMatchObject({
		failureCode: "interrupted",
	});

	await t.mutation(internal.knowledgeGeneration.retry, {
		...input,
		attemptKey: "stuck",
	});
	expect((await attempts(t))[0]).toMatchObject({ state: "Waiting" });
});

test("an answered relation kind covers the request even with no stored target", async () => {
	const request = {
		definition: null,
		semanticRelations: { synonym: null, antonym: null },
	};
	const knowledge = { definition: "Ein Geldinstitut." };
	expect(
		knowledgeRequestComplete(
			{ knowledge, checkedRelationKinds: [] },
			request,
			[],
		),
	).toBe(false);
	expect(
		knowledgeRequestComplete(
			{ knowledge, checkedRelationKinds: ["synonym", "antonym"] },
			request,
			[],
		),
	).toBe(true);
	expect(
		missingKnowledgeRequest(request, {
			knowledge,
			checkedRelationKinds: ["synonym"],
		}),
	).toEqual({ semanticRelations: { antonym: null } });

	expect(answeredRelationKinds(["synonym", "antonym"], false, [])).toEqual(
		[],
	);
	expect(
		answeredRelationKinds(["synonym", "antonym"], true, [
			{ aspect: "semanticRelations", leaf: "antonym" },
		]),
	).toEqual(["synonym"]);
	expect(
		answeredRelationKinds(["synonym"], true, [
			{ aspect: "semanticRelations" },
		]),
	).toEqual([]);
});

test("recorded relation evidence lets a Reading whose relations live as edges reach Full", async () => {
	const t = createTestConvex();
	const occurrence = await seedDictionaryReading(t, {
		knowledge: { definition: "Ein Geldinstitut." },
	});
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { definition: "Ein Geldinstitut." },
		status: "Partial",
	});
	await t.run(async (ctx) => {
		const row = await ctx.db.query("accumulatedKnowledge").first();
		if (row)
			await ctx.db.patch(row._id, { checkedRelationKinds: ["synonym"] });
	});
	await insertAttempt(t, occurrence, "attempt-1");
	const evidence = {
		...PRODUCTION_EVIDENCE,
		request: { definition: null, semanticRelations: { synonym: null } },
	};

	await publish(
		t,
		publishArgs({ attemptKey: "attempt-1", productionEvidence: evidence }),
	);
	// Replacing the content keeps the evidence recorded beside it.
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		status: "Full",
		checkedRelationKinds: ["synonym"],
	});
});

test("a rejected dictionary plan fails the final publication without recording changes", async () => {
	const t = createTestConvex();
	// The attempt's Reading is not in the dictionary, so planning is rejected.
	const occurrence = await seedOccurrence(t);
	await insertAccumulatedKnowledge(t, occurrence, {
		knowledge: { definition: "partial" },
		status: "Partial",
	});
	await insertAttempt(t, occurrence, "attempt-1");
	const result = await publish(
		t,
		publishArgs({
			attemptKey: "attempt-1",
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Ein Geldinstitut.",
				},
			],
		}),
	);
	expect(result).toMatchObject({ status: "Rejected" });
	expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
		knowledge: { definition: "partial" },
		status: "Partial",
	});
	expect((await attempts(t))[0]).toMatchObject({
		state: "Failed",
		failureCode: "generationFailed",
	});
	expect(await rows(t, "knowledgeChanges")).toEqual([]);
	expect(await publish(t, publishArgs({ attemptKey: "attempt-1" }))).toEqual({
		status: "Ignored",
	});
});

test("Knowledge settings default enabled and persist independently per visitor", async () => {
	const t = createTestConvex();
	const defaults = defaultKnowledgeSettings();
	expect(defaults.semanticRelations.nearAntonym).toBe(true);
	expect(defaults.translations).toEqual({ en: true, ru: true });
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-1" }),
	).toEqual(defaults);
	const hiddenDefinition = { ...defaults, definition: false };
	expect(
		await t.mutation(api.knowledgeSettings.update, {
			visitorId: "visitor-1",
			settings: hiddenDefinition,
		}),
	).toEqual(hiddenDefinition);
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-1" }),
	).toEqual(hiddenDefinition);
	expect(
		await t.query(api.knowledgeSettings.get, { visitorId: "visitor-2" }),
	).toEqual(defaults);

	expect(
		generationRequestFor(
			{
				unitKind: "Reading",
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm: "Bank",
					coreFeatures: { gender: "Fem", hyph: null },
				},
				emojiDescription: "🏦",
			},
			[],
		).definition,
	).toBeNull();
});

test.each([false, true])(
	"the generation action publishes before a slow translation and retries failed publication (failure=%s)",
	async (failFirstPublication) => {
		// Nothing is scheduled here; the action is run directly and polled.
		jest.useRealTimers();
		const t = createTestConvex();
		const occurrence = await seedOccurrence(t);
		// A Reading missing from the dictionary rejects the first publication,
		// a transient failure the final publication recovers from.
		if (!failFirstPublication) await addToDictionary(t, occurrence);
		await insertAttempt(t, occurrence, "progress", { state: "Scheduled" });
		const slow = Promise.withResolvers<void>();
		const firstPublication = Promise.withResolvers<void>();
		const errors = spyOn(console, "error").mockImplementation(
			(message: unknown) => {
				if (message === "Incremental Knowledge publication failed")
					firstPublication.resolve();
			},
		);
		const provider = stubProvider(async (modelInput) => {
			if (modelInput.language === "en") await slow.promise;
			return modelInput.aspect === "definition"
				? "Ein Geldinstitut."
				: modelInput.language === "ru"
					? "банк"
					: "bank";
		});
		const committedChanges = () =>
			t.run((ctx) => ctx.db.query("knowledgeChanges").take(10));
		let finished = false;
		try {
			const running = t
				.action(
					internal.knowledgeGenerationActions.runKnowledgeGeneration,
					{ attemptKey: "progress" },
				)
				.then(() => {
					finished = true;
				});
			if (!failFirstPublication) {
				void (async () => {
					while (!finished && (await committedChanges()).length === 0)
						await Bun.sleep(1);
					firstPublication.resolve();
				})();
			}
			await firstPublication.promise;
			expect(finished).toBe(false);
			expect((await committedChanges()).length).toBeLessThan(3);
			expect((await attempts(t))[0]).toMatchObject({ state: "Running" });
			if (failFirstPublication) {
				expect(await committedChanges()).toEqual([]);
				await addToDictionary(t, occurrence);
			}
			slow.resolve();
			await running;
			// The final publication always carries every change; the mutation
			// drops what this run already published.
			const changes = await committedChanges();
			expect(changes).toHaveLength(3);
			const sequences = new Set(
				changes.map(
					({ knowledgeChangeKey }) =>
						knowledgeChangeKey.split(":")[2],
				),
			);
			expect(sequences.size).toBeGreaterThan(1);
			expect((await attempts(t))[0]).toMatchObject({
				state: "Committed",
			});
		} finally {
			slow.resolve();
			provider.restore();
			errors.mockRestore();
		}
	},
);

test.each([false, true])(
	"partial generation commits valid changes and retains its final trace (incremental=%s)",
	async (incremental) => {
		const t = createTestConvex();
		const occurrence = await seedDictionaryReading(t);
		await insertAttempt(t, occurrence, "partial");
		const change = {
			kind: "Contribute",
			aspect: "definition",
			value: "Ein Geldinstitut.",
		};
		const evidence = {
			request: { definition: null, translations: { ru: null } },
			failures: [
				{
					aspect: "translations",
					leaf: "ru",
					code: "ProviderFailure",
					message: "offline",
				},
			],
			operationTraces: [
				JSON.stringify({
					operation: "produceKnowledge",
					outcome: "Partial",
					calls: [],
				}),
			],
		};
		if (incremental) {
			const intermediate = publishArgs({
				attemptKey: "partial",
				final: false,
				changes: [change],
				productionEvidence: {
					...evidence,
					failures: [],
					operationTraces: [],
				},
			});
			expect(await publish(t, intermediate)).toEqual({
				status: "Committed",
			});
			expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
				knowledge: { definition: "Ein Geldinstitut." },
				status: "Partial",
			});
			expect((await attempts(t))[0]).toMatchObject({
				state: "Running",
				publicationSequence: 1,
			});
			expect(await rows(t, "knowledgeProductionRuns")).toEqual([]);
			// A repeated contribution is deduplicated by content, not by sequence.
			expect(await publish(t, intermediate)).toEqual({
				status: "Committed",
			});
			expect(await rows(t, "knowledgeChanges")).toHaveLength(1);
			expect(
				await publish(t, {
					...intermediate,
					relationPublication: {
						...intermediate.relationPublication,
						runNumber: 999,
					},
				}),
			).toEqual({ status: "Ignored" });
			expect(await rows(t, "knowledgeChanges")).toHaveLength(1);
		}
		const result = await publish(
			t,
			publishArgs({
				attemptKey: "partial",
				changes: [change],
				productionEvidence: evidence,
			}),
		);
		expect(result.status).toBe("Committed");
		expect(await rows(t, "knowledgeChanges")).toHaveLength(1);
		expect((await rows(t, "accumulatedKnowledge"))[0]).toMatchObject({
			status: "Partial",
			knowledge: { definition: "Ein Geldinstitut." },
			coveredTranslationLanguages: [],
		});
		expect((await attempts(t))[0]).toMatchObject({
			state: "Failed",
			failureCode: "partialKnowledge",
		});
		expect((await rows(t, "knowledgeProductionRuns"))[0]).toMatchObject({
			outcome: "Partial",
			evidence,
		});
	},
);
