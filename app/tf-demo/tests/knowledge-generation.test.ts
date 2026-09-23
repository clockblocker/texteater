import { expect, test } from "bun:test";
import { type FunctionReference, getFunctionName } from "convex/server";
import {
	begin,
	fail,
	publish,
	retry,
	scheduleKnowledgeGeneration,
} from "../convex/knowledgeGeneration";
import { runKnowledgeGeneration as runGeneration } from "../convex/knowledgeGenerationActions";
import {
	defaultKnowledgeSettings,
	get as getKnowledgeSettings,
	update as updateKnowledgeSettings,
} from "../convex/knowledgeSettings";
import {
	effectiveRelationPublicationPolicy,
	GENERATED_SEMANTIC_RELATION_POLICY,
	generatedKnowledgeAllowedForPublication,
	RELATION_PUBLICATION_FINGERPRINTS,
} from "../convex/model/generatedKnowledgeContainment";
import { replaceAccumulatedKnowledge } from "../convex/model/shadows";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";

const PRODUCTION_EVIDENCE = {
	request: { definition: null },
	failures: [],
	operationTraces: [],
};

test("retry requests skip saved text and covered translations but retain missing leaves", () => {
	expect(
		missingKnowledgeRequest(
			{
				definition: null,
				transcription: null,
				translations: { en: null, ru: null },
			},
			{
				definition: "Ein Geldinstitut.",
				translations: { en: ["bank"], ru: [] },
			},
		),
	).toEqual({ transcription: null, translations: { ru: null } });
	expect(missingKnowledgeRequest({ definition: null }, {})).toEqual({
		definition: null,
	});
});
type Row = Record<string, unknown> & { _id: string };

class GenerationDb {
	private readonly tables = new Map<string, Map<string, Row>>();
	private nextId = 1;

	constructor(seed: Record<string, readonly Row[]>) {
		for (const [table, rows] of Object.entries(seed)) {
			this.tables.set(
				table,
				new Map(rows.map((row) => [row._id, structuredClone(row)])),
			);
		}
	}

	rows(table: string): Row[] {
		return [...(this.tables.get(table)?.values() ?? [])];
	}

	async get(id: string): Promise<Row | null> {
		for (const rows of this.tables.values()) {
			const row = rows.get(id);
			if (row) return row;
		}
		return null;
	}

	query(table: string) {
		const predicates: Array<(row: Row) => boolean> = [];
		const range = {
			eq(field: string, value: unknown) {
				predicates.push((row) => {
					let member: unknown = row;
					for (const part of field.split(".")) {
						if (!member || typeof member !== "object") return false;
						member = (member as Record<string, unknown>)[part];
					}
					return member === value;
				});
				return range;
			},
		};
		const matches = () =>
			this.rows(table).filter((row) =>
				predicates.every((predicate) => predicate(row)),
			);
		return {
			async take(limit: number) {
				return matches().slice(0, limit);
			},
			async collect() {
				return matches();
			},
			withIndex(_name: string, build: (range: typeof range) => unknown) {
				build(range);
				const indexed = {
					async collect() {
						return matches();
					},
					async unique() {
						const rows = matches();
						if (rows.length > 1)
							throw new Error("Expected a unique row.");
						return rows[0] ?? null;
					},
					async first() {
						return matches()[0] ?? null;
					},
					async take(limit: number) {
						return matches().slice(0, limit);
					},
				};
				return indexed;
			},
		};
	}

	async insert(table: string, value: Record<string, unknown>) {
		const id = `${table}-${this.nextId++}`;
		const rows = this.tables.get(table) ?? new Map<string, Row>();
		rows.set(id, { _id: id, ...structuredClone(value) });
		this.tables.set(table, rows);
		return id;
	}

	async patch(id: string, value: Record<string, unknown>) {
		for (const rows of this.tables.values()) {
			const existing = rows.get(id);
			if (!existing) continue;
			const next = { ...existing, ...structuredClone(value) };
			for (const [key, member] of Object.entries(next)) {
				if (member === undefined) delete next[key];
			}
			rows.set(id, next);
			return;
		}
		throw new Error(`Missing row ${id}.`);
	}

	async replace(id: string, value: Record<string, unknown>) {
		for (const rows of this.tables.values()) {
			if (!rows.has(id)) continue;
			rows.set(id, { _id: id, ...structuredClone(value) });
			return;
		}
		throw new Error(`Missing row ${id}.`);
	}

	async delete(id: string) {
		for (const rows of this.tables.values()) {
			if (rows.delete(id)) return;
		}
	}
}

function handler<TArgs, TResult>(value: unknown) {
	return (
		value as {
			_handler: (ctx: unknown, args: TArgs) => Promise<TResult>;
		}
	)._handler;
}

function attempt(id: string, attemptKey: string): Row {
	return {
		_id: id,
		attemptKey,
		visitorId: "visitor-1",
		ownerReadingKey: "reading-key",
		readingId: "reading-1",
		attestationId: "attestation-1",
		state: "Running",
		createdAt: 1,
		updatedAt: 1,
	};
}

const EMPTY_RELATION_RUN = {
	runNumber: 1,
	requestedKinds: [],
	artifactPath: null,
	fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
	proposals: [],
} as const;

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

/** Dictionary rows the mutation-side planner needs to find the Reading it patches. */
function dictionaryRows(
	record: Record<string, unknown> = {},
): Record<string, readonly Row[]> {
	return {
		lemmas: [
			{
				_id: "lemma-1",
				lemmaKey: lemmaIdentityKey(BANK_LEMMA),
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Bank",
				coreFeatures: { gender: "Fem", hyph: null },
			},
		],
		dictionaryLemmas: [{ _id: "dictionary-lemma-1", lemmaId: "lemma-1" }],
		readings: [
			{
				_id: "reading-1",
				readingKey: BANK_READING_KEY,
				lemmaId: "lemma-1",
				emojiDescription: "🏦",
			},
		],
		readingEntries: [
			{
				_id: "entry-1",
				readingId: "reading-1",
				record: {
					attestedTranslations: [],
					attestations: [],
					notes: "",
					...record,
				},
			},
		],
	};
}

function dictionaryAttempt(id: string, attemptKey: string): Row {
	return { ...attempt(id, attemptKey), ownerReadingKey: BANK_READING_KEY };
}

function publishArgs(
	overrides: Record<string, unknown> & { attemptKey: string },
) {
	return {
		final: true,
		reading: BANK_READING,
		changes: [],
		pendingRelations: [],
		relationPublication: EMPTY_RELATION_RUN,
		productionEvidence: PRODUCTION_EVIDENCE,
		...overrides,
	};
}

function occurrenceRows(): Record<string, readonly Row[]> {
	return {
		lemmas: [
			{
				unitKind: "Lemma",
				_id: "lemma-1",
				lemmaKey: "lemma-key",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Bank",
				coreFeatures: { gender: "Fem", hyph: null },
			},
		],
		surfaces: [
			{
				_id: "surface-1",
				lemmaId: "lemma-1",
				language: "de",
				normalizedSurface: "Bank",
				inflectionalFeatures: null,

				spelling: "Canonical",

				surfaceFeatures: null,
			},
		],
		readings: [
			{
				_id: "reading-1",
				readingKey: "reading-key",
				lemmaId: "lemma-1",
				emojiDescription: "🏦",
			},
		],
		attestations: [
			{
				_id: "attestation-1",
				surfaceId: "surface-1",
				readingId: "reading-1",
				realizationCoverage: "Full",
				articleEvidence: null,
			},
		],
		sentences: [
			{
				_id: "sentence-1",
				segmentedSentenceId: "segmented-sentence-1",
				language: "de",
			},
		],
		segments: [
			{
				_id: "segment-1",
				sentenceId: "sentence-1",
				index: 0,
				kind: "ResolvableText",
				text: "Bank",
				attestationMembership: {
					attestationId: "attestation-1",
					orthography: "Standard",
				},
			},
			{
				_id: "segment-2",
				sentenceId: "sentence-1",
				index: 1,
				kind: "PlainText",
				text: " am Fluss",
			},
		],
	};
}

test("existing requested content completes an empty generated batch and the first complete writer wins", async () => {
	const db = new GenerationDb({
		...dictionaryRows({
			knowledge: {
				definition: "canonical",
				translations: { en: ["bank"] },
			},
		}),
		knowledgeGenerationAttempts: [
			dictionaryAttempt("attempt-1", "attempt-1"),
			dictionaryAttempt("attempt-2", "attempt-2"),
		],
	});
	const run = handler<unknown, { status: string }>(publish);
	const ctx = { db };

	expect(await run(ctx, publishArgs({ attemptKey: "attempt-1" }))).toEqual({
		status: "Committed",
	});
	expect(await run(ctx, publishArgs({ attemptKey: "attempt-2" }))).toEqual({
		status: "AlreadyFull",
	});
	expect(db.rows("accumulatedKnowledge")).toEqual([
		expect.objectContaining({
			ownerReadingKey: BANK_READING_KEY,
			knowledge: {
				definition: "canonical",
				translations: { en: ["bank"] },
			},
			status: "Full",
		}),
	]);
	expect(db.rows("knowledgeGenerationAttempts")).toEqual([
		expect.objectContaining({
			attemptKey: "attempt-1",
			state: "Committed",
		}),
		expect.objectContaining({ attemptKey: "attempt-2", state: "LostRace" }),
	]);
});

test("commit-time relation blocking keeps base evidence and records publication failure", async () => {
	const db = new GenerationDb({
		...dictionaryRows(),
		knowledgeGenerationAttempts: [
			dictionaryAttempt("attempt-1", "attempt-1"),
		],
	});
	const relationPublication = {
		runNumber: 1,
		requestedKinds: ["synonym"] as const,
		artifactPath: "gate/verdict.json",
		fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
		proposals: [
			{
				relation: "synonym" as const,
				targetShadow: {
					language: "de" as const,
					family: "Lexeme" as const,
					kind: "NOUN",
					canonicalForm: "Geldinstitut",
				},
			},
		],
	};
	const result = await handler<unknown, { status: string }>(publish)(
		{ db },
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
	expect(db.rows("pendingSemanticRelations")).toEqual([]);
	expect(db.rows("knowledgeChanges")).toEqual([
		expect.objectContaining({
			change: expect.objectContaining({ aspect: "definition" }),
		}),
	]);
	expect(db.rows("readingEntries")[0]?.record).toMatchObject({
		knowledge: { definition: "Ein Geldinstitut." },
	});
	expect(db.rows("generatedRelationRuns")).toEqual([
		expect.objectContaining({
			relation: "synonym",
			generatedTargets: 1,
			publicationFailures: 1,
			directMatches: 0,
			pendingShadows: 0,
		}),
	]);
	expect(db.rows("generatedRelationProposals")).toEqual([
		expect.objectContaining({ outcome: "PublicationFailed" }),
	]);
});

test("manual writes never downgrade Full and failures persist only a safe category", async () => {
	const db = new GenerationDb({
		accumulatedKnowledge: [
			{
				_id: "knowledge-1",
				ownerReadingKey: "reading-key",
				knowledge: { definition: "winner" },
				status: "Full",
				updatedAt: 1,
			},
		],
		knowledgeGenerationAttempts: [attempt("attempt-1", "attempt-1")],
	});
	await replaceAccumulatedKnowledge({ db } as never, "reading-key", {
		definition: "manual",
	});
	await handler<
		{ attemptKey: string; failureCode: string; failureMessage: string },
		null
	>(fail)(
		{ db },
		{
			attemptKey: "attempt-1",
			failureCode: "providerPayload",
			failureMessage: "secret provider response",
		},
	);
	expect(db.rows("accumulatedKnowledge")[0]).toMatchObject({
		knowledge: { definition: "manual" },
		status: "Full",
	});
	expect(db.rows("knowledgeGenerationAttempts")[0]).toMatchObject({
		state: "Failed",
		failureMessage: "Knowledge generation failed. Please retry.",
	});
});

test("Full is a zero-call cache hit and generation keeps the complete German base mask", async () => {
	const mutations: string[] = [];
	const result = await handler<{ attemptKey: string }, null>(runGeneration)(
		{
			async runMutation(reference: FunctionReference<"mutation">) {
				mutations.push(getFunctionName(reference));
				return { kind: "Full" };
			},
			async runQuery() {
				throw new Error("Full attempts need no query hop.");
			},
		},
		{ attemptKey: "already-full" },
	);
	expect(result).toBeNull();
	expect(mutations).toEqual(["knowledgeGeneration:begin"]);

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
	expect(request).toEqual({
		transcription: null,
		definition: null,
		translations: { en: null, ru: null },
		governedPrepositions: null,
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
				translationsOnly: true,
			},
		),
	).toEqual({ translations: { ru: null } });
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
	const db = new GenerationDb({
		...dictionaryRows(),
		knowledgeGenerationAttempts: [
			dictionaryAttempt("attempt-1", "attempt-1"),
		],
	});
	const result = await handler<unknown, { status: string }>(publish)(
		{ db },
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
	expect(db.rows("knowledgeChanges")).toEqual([
		expect.objectContaining({
			knowledgeChangeKey: "attempt-1:1:1:0",
			change: {
				kind: "Contribute",
				aspect: "definition",
				value: "Ein Geldinstitut.",
			},
		}),
	]);
	expect(db.rows("pendingSemanticRelations")).toEqual([]);
	expect(db.rows("semanticRelationEdges")).toEqual([]);
	expect(db.rows("knowledgeGenerationAttempts")[0]).toMatchObject({
		state: "Committed",
		publicationSequence: 1,
	});
});

test("scheduling is exact, idempotent, skips Full, and retries Failed", async () => {
	const scheduled: Array<{ attemptKey: string }> = [];
	const db = new GenerationDb(occurrenceRows());
	const ctx = {
		db,
		scheduler: {
			async runAfter(
				_delay: number,
				_reference: unknown,
				args: { attemptKey: string },
			) {
				scheduled.push(args);
			},
		},
	};
	const knowledgeDraftJson = JSON.stringify({
		sourceFingerprint: "draft-source",
		texts: [],
	});
	const input = {
		knowledgeDraftJson,
		attemptKey: "request-1",
		visitorId: "visitor-1",
		readingId: "reading-1",
		attestationId: "attestation-1",
	} as never;

	await scheduleKnowledgeGeneration(ctx as never, input);
	await scheduleKnowledgeGeneration(ctx as never, input);
	expect(scheduled).toEqual([{ attemptKey: "request-1" }]);
	expect(db.rows("knowledgeGenerationAttempts")).toEqual([
		expect.objectContaining({
			attemptKey: "request-1",
			ownerReadingKey: "reading-key",
			state: "Scheduled",
			knowledgeDraftJson,
		}),
	]);
	const loaded = await handler<{ attemptKey: string }, unknown>(begin)(
		{ db },
		{ attemptKey: "request-1" },
	);
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

	await expect(
		scheduleKnowledgeGeneration(
			ctx as never,
			{
				...input,
				readingId: "reading-other",
			} as never,
		),
	).rejects.toThrow("exact saved occurrence");

	const fullDb = new GenerationDb({
		...occurrenceRows(),
		accumulatedKnowledge: [
			{
				_id: "knowledge-full",
				ownerReadingKey: "reading-key",
				knowledge: { translations: { en: ["bank"], ru: ["банк"] } },
				status: "Full",
				coveredTranslationLanguages: ["en", "ru"],
				updatedAt: 1,
			},
		],
	});
	const fullSchedules: unknown[] = [];
	await scheduleKnowledgeGeneration(
		{
			db: fullDb,
			scheduler: {
				async runAfter(...args: unknown[]) {
					fullSchedules.push(args);
				},
			},
		} as never,
		{ ...input, attemptKey: "full-request" } as never,
	);
	expect(fullSchedules).toEqual([]);
	expect(fullDb.rows("knowledgeGenerationAttempts")).toEqual([]);

	const supplementDb = new GenerationDb({
		...occurrenceRows(),
		accumulatedKnowledge: [
			{
				_id: "knowledge-english",
				ownerReadingKey: "reading-key",
				knowledge: { translations: { en: ["bank"] } },
				status: "Full",
				coveredTranslationLanguages: ["en"],
				updatedAt: 1,
			},
		],
	});
	await scheduleKnowledgeGeneration(
		{ db: supplementDb, scheduler: { async runAfter() {} } } as never,
		{ ...input, attemptKey: "russian-supplement" } as never,
	);
	expect(
		await handler<{ attemptKey: string }, unknown>(begin)(
			{ db: supplementDb },
			{ attemptKey: "russian-supplement" },
		),
	).toEqual(
		expect.objectContaining({
			kind: "Generate",
			translationLanguages: ["ru"],
			translationsOnly: true,
		}),
	);

	const retryDb = new GenerationDb({
		...occurrenceRows(),
		visitorClicks: [
			{
				_id: "click-1",
				visitorId: "visitor-1",
				attestationId: "attestation-1",
			},
		],
		knowledgeGenerationAttempts: [
			{
				...attempt("attempt-1", "retry-request"),
				state: "Failed",
				failureCode: "generationFailed",
				failureMessage: "Knowledge generation failed. Please retry.",
			},
		],
	});
	const retrySchedules: Array<{ attemptKey: string }> = [];
	await handler<
		{
			attemptKey: string;
			visitorId: string;
			readingId: string;
			attestationId: string;
		},
		null
	>(retry)(
		{
			db: retryDb,
			scheduler: {
				async runAfter(
					_delay: number,
					_reference: unknown,
					args: { attemptKey: string },
				) {
					retrySchedules.push(args);
				},
			},
		},
		{
			attemptKey: "retry-request",
			visitorId: "visitor-1",
			readingId: "reading-1",
			attestationId: "attestation-1",
		},
	);
	expect(retrySchedules).toEqual([{ attemptKey: "retry-request" }]);
	expect(retryDb.rows("knowledgeGenerationAttempts")[0]).toEqual(
		expect.objectContaining({ state: "Scheduled" }),
	);
	expect(retryDb.rows("knowledgeGenerationAttempts")[0]).not.toHaveProperty(
		"failureMessage",
	);
});

test("a second Knowledge demand for the same Reading waits for the active attempt", async () => {
	const scheduled: Array<{ attemptKey: string }> = [];
	const db = new GenerationDb(occurrenceRows());
	const ctx = {
		db,
		scheduler: {
			async runAfter(
				_delay: number,
				_reference: unknown,
				args: { attemptKey: string },
			) {
				scheduled.push(args);
			},
		},
	};
	const input = {
		visitorId: "visitor-1",
		readingId: "reading-1",
		attestationId: "attestation-1",
	} as const;

	await scheduleKnowledgeGeneration(
		ctx as never,
		{
			...input,
			attemptKey: "resolution-request",
		} as never,
	);
	await scheduleKnowledgeGeneration(
		ctx as never,
		{
			...input,
			attemptKey: "coverage-request",
		} as never,
	);

	expect(scheduled).toEqual([{ attemptKey: "resolution-request" }]);
	expect(db.rows("knowledgeGenerationAttempts")).toEqual([
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
	const db = new GenerationDb({
		...occurrenceRows(),
		knowledgeGenerationAttempts: [
			attempt("active-attempt", "resolution-request"),
			{
				...attempt("waiting-attempt", "coverage-request"),
				state: "Waiting",
				createdAt: 2,
				updatedAt: 2,
			},
		],
	});
	const scheduled: Array<{ attemptKey: string }> = [];

	await handler<
		{
			attemptKey: string;
			failureCode: string;
			failureMessage: string;
		},
		null
	>(fail)(
		{
			db,
			scheduler: {
				async runAfter(
					_delay: number,
					_reference: unknown,
					args: { attemptKey: string },
				) {
					scheduled.push(args);
				},
			},
		},
		{
			attemptKey: "resolution-request",
			failureCode: "generationFailed",
			failureMessage: "failed",
		},
	);

	expect(scheduled).toEqual([{ attemptKey: "coverage-request" }]);
	expect(db.rows("knowledgeGenerationAttempts")).toEqual([
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

test("a rejected dictionary plan fails the final publication without recording changes", async () => {
	const db = new GenerationDb({
		...occurrenceRows(),
		accumulatedKnowledge: [
			{
				_id: "knowledge-1",
				ownerReadingKey: "reading-key",
				knowledge: { definition: "partial" },
				status: "Partial",
				updatedAt: 1,
			},
		],
		// The attempt's Reading is not in the dictionary, so planning is rejected.
		knowledgeGenerationAttempts: [attempt("attempt-1", "attempt-1")],
	});
	const result = await handler<unknown, { status: string }>(publish)(
		{ db },
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
	expect(db.rows("accumulatedKnowledge")[0]).toMatchObject({
		knowledge: { definition: "partial" },
		status: "Partial",
	});
	expect(db.rows("knowledgeGenerationAttempts")[0]).toMatchObject({
		state: "Failed",
		failureCode: "generationFailed",
	});
	expect(db.rows("knowledgeChanges")).toEqual([]);
	expect(
		await handler<unknown, { status: string }>(publish)(
			{ db },
			publishArgs({ attemptKey: "attempt-1" }),
		),
	).toEqual({ status: "Ignored" });
});

test("Knowledge settings default enabled and persist independently per visitor", async () => {
	const db = new GenerationDb({});
	const getSettings = handler<{ visitorId: string }, unknown>(
		getKnowledgeSettings,
	);
	const updateSettings = handler<
		{
			visitorId: string;
			settings: ReturnType<typeof defaultKnowledgeSettings>;
		},
		unknown
	>(updateKnowledgeSettings);
	const defaults = defaultKnowledgeSettings();
	expect(defaults.semanticRelations.nearAntonym).toBe(true);
	expect(defaults.translations).toEqual({ en: true, ru: true });
	expect(await getSettings({ db }, { visitorId: "visitor-1" })).toEqual(
		defaults,
	);
	const hiddenDefinition = { ...defaults, definition: false };
	expect(
		await updateSettings(
			{ db },
			{ visitorId: "visitor-1", settings: hiddenDefinition },
		),
	).toEqual(hiddenDefinition);
	expect(await getSettings({ db }, { visitorId: "visitor-1" })).toEqual(
		hiddenDefinition,
	);
	expect(await getSettings({ db }, { visitorId: "visitor-2" })).toEqual(
		defaults,
	);

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
		const db = new GenerationDb({
			...occurrenceRows(),
			knowledgeGenerationAttempts: [attempt("progress", "progress")],
		});
		await db.patch("segment-2", { kind: "OpaqueText" });
		const slow = Promise.withResolvers<void>();
		const published = Promise.withResolvers<void>();
		const publications: Array<{
			final: boolean;
			changes: unknown[];
		}> = [];
		const previousFetch = globalThis.fetch;
		const previousKey = process.env.OPENAI_API_KEY;
		process.env.OPENAI_API_KEY = "fixture";
		globalThis.fetch = (async (_url, init) => {
			const body = JSON.parse(String(init?.body));
			const modelInput = JSON.parse(body.input[1].content);
			if (modelInput.language === "en") await slow.promise;
			return Response.json({
				status: "completed",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: JSON.stringify({
									value: {
										text:
											modelInput.aspect === "definition"
												? "Ein Geldinstitut."
												: modelInput.language === "ru"
													? "банк"
													: "bank",
									},
								}),
							},
						],
					},
				],
			});
		}) as typeof fetch;
		let finished = false;
		try {
			const running = handler<{ attemptKey: string }, null>(
				runGeneration,
			)(
				{
					async runQuery(reference: FunctionReference<"query">) {
						throw Error(
							`Unexpected query ${getFunctionName(reference)}`,
						);
					},
					async runMutation(
						reference: FunctionReference<"mutation">,
						args: (typeof publications)[number],
					) {
						const name = getFunctionName(reference);
						if (name === "knowledgeGeneration:begin")
							return handler<{ attemptKey: string }, unknown>(
								begin,
							)({ db }, { attemptKey: "progress" });
						if (name !== "knowledgeGeneration:publish")
							throw Error(`Unexpected mutation ${name}`);
						publications.push(args);
						if (!args.final) published.resolve();
						if (failFirstPublication && publications.length === 1)
							throw Error("Simulated transient commit failure");
						return { status: "Committed" };
					},
				},
				{ attemptKey: "progress" },
			).then(() => {
				finished = true;
			});
			await published.promise;
			expect(finished).toBe(false);
			expect(publications[0]?.final).toBe(false);
			expect(publications[0]?.changes.length).toBeLessThan(3);
			slow.resolve();
			await running;
			// The final publication always carries every change; the mutation
			// drops what this run already published.
			expect(publications.at(-1)?.final).toBe(true);
			expect(publications.at(-1)?.changes).toHaveLength(3);
			expect(publications.length).toBeGreaterThan(1);
		} finally {
			slow.resolve();
			globalThis.fetch = previousFetch;
			if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
			else process.env.OPENAI_API_KEY = previousKey;
		}
	},
);

test.each([false, true])(
	"partial generation commits valid changes and retains its final trace (incremental=%s)",
	async (incremental) => {
		const db = new GenerationDb({
			...dictionaryRows(),
			knowledgeGenerationAttempts: [
				dictionaryAttempt("partial", "partial"),
			],
		});
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
		const commit = handler<unknown, { status: string }>(publish);
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
			expect(await commit({ db }, intermediate)).toEqual({
				status: "Committed",
			});
			expect(db.rows("accumulatedKnowledge")[0]).toMatchObject({
				knowledge: { definition: "Ein Geldinstitut." },
				status: "Partial",
			});
			expect(db.rows("knowledgeGenerationAttempts")[0]).toMatchObject({
				state: "Running",
				publicationSequence: 1,
			});
			expect(db.rows("knowledgeProductionRuns")).toEqual([]);
			// A repeated contribution is deduplicated by content, not by sequence.
			expect(await commit({ db }, intermediate)).toEqual({
				status: "Committed",
			});
			expect(db.rows("knowledgeChanges")).toHaveLength(1);
			expect(
				await commit(
					{ db },
					{
						...intermediate,
						relationPublication: {
							...EMPTY_RELATION_RUN,
							runNumber: 999,
						},
					},
				),
			).toEqual({ status: "Ignored" });
			expect(db.rows("knowledgeChanges")).toHaveLength(1);
		}
		const result = await commit(
			{ db },
			publishArgs({
				attemptKey: "partial",
				changes: [change],
				productionEvidence: evidence,
			}),
		);
		expect(result.status).toBe("Committed");
		expect(db.rows("knowledgeChanges")).toHaveLength(1);
		expect(db.rows("accumulatedKnowledge")[0]).toMatchObject({
			status: "Partial",
			knowledge: { definition: "Ein Geldinstitut." },
			coveredTranslationLanguages: [],
		});
		expect(db.rows("knowledgeGenerationAttempts")[0]).toMatchObject({
			state: "Failed",
			failureCode: "partialKnowledge",
		});
		expect(db.rows("knowledgeProductionRuns")[0]).toMatchObject({
			outcome: "Partial",
			evidence,
		});
	},
);
