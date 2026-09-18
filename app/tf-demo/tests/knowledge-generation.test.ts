import { expect, test } from "bun:test";
import { type FunctionReference, getFunctionName } from "convex/server";
import {
	commitGenerated,
	fail,
	loadInput,
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
import { applyGeneratedKnowledgePlan as applyGeneratedPlan } from "../convex/orchestration";
import { generationRequestFor } from "../server/generatedKnowledgeRequest";
import { missingKnowledgeRequest } from "../server/knowledgeCompletion";

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
				articleReference: null,
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
		readings: [
			{
				_id: "reading-1",
				readingKey: "reading-key",
				lemmaId: "lemma-1",
				emojiDescription: "🏦",
			},
		],
		readingEntries: [
			{
				_id: "entry-1",
				readingId: "reading-1",
				record: {
					knowledge: {
						definition: "canonical",
						translations: { en: ["bank"] },
					},
				},
			},
		],
		knowledgeGenerationAttempts: [
			attempt("attempt-1", "attempt-1"),
			attempt("attempt-2", "attempt-2"),
		],
	});
	const run = handler<
		{
			attemptKey: string;
			plan: unknown;
			baseKnowledgePlan: unknown;
			generatedChanges: unknown[];
			relationPublication: typeof EMPTY_RELATION_RUN;
			productionEvidence: typeof PRODUCTION_EVIDENCE;
		},
		{ status: string }
	>(commitGenerated);
	const ctx = { db };

	expect(
		await run(ctx, {
			attemptKey: "attempt-1",
			plan: { baseRevision: "convex-0", changes: [] },
			baseKnowledgePlan: { baseRevision: "convex-0", changes: [] },
			generatedChanges: [],
			relationPublication: EMPTY_RELATION_RUN,
			productionEvidence: PRODUCTION_EVIDENCE,
		}),
	).toEqual({ status: "Committed" });
	expect(
		await run(ctx, {
			attemptKey: "attempt-2",
			plan: { baseRevision: "convex-0", changes: [] },
			baseKnowledgePlan: { baseRevision: "convex-0", changes: [] },
			generatedChanges: [],
			relationPublication: EMPTY_RELATION_RUN,
			productionEvidence: PRODUCTION_EVIDENCE,
		}),
	).toEqual({ status: "AlreadyFull" });
	expect(db.rows("accumulatedKnowledge")).toEqual([
		expect.objectContaining({
			ownerReadingKey: "reading-key",
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
		readings: [
			{
				_id: "reading-1",
				readingKey: "reading-key",
				lemmaId: "lemma-1",
				emojiDescription: "🏦",
			},
		],
		readingEntries: [
			{
				_id: "entry-1",
				readingId: "reading-1",
				record: { knowledge: { definition: "Ein Geldinstitut." } },
			},
		],
		knowledgeGenerationAttempts: [attempt("attempt-1", "attempt-1")],
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
	const result = await handler<
		{
			attemptKey: string;
			plan: unknown;
			baseKnowledgePlan: unknown;
			generatedChanges: unknown[];
			relationPublication: typeof relationPublication;
			productionEvidence: typeof PRODUCTION_EVIDENCE;
		},
		{ status: string }
	>(commitGenerated)(
		{ db },
		{
			attemptKey: "attempt-1",
			// This relation-bearing plan must never be inspected when blocked.
			plan: { baseRevision: "convex-0", changes: [{ type: "invalid" }] },
			baseKnowledgePlan: { baseRevision: "convex-0", changes: [] },
			generatedChanges: [
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
			relationPublication,
			productionEvidence: PRODUCTION_EVIDENCE,
		},
	);
	expect(result).toEqual({ status: "Committed" });
	expect(db.rows("knowledgeChanges")).toEqual([
		expect.objectContaining({
			change: expect.objectContaining({ aspect: "definition" }),
		}),
	]);
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
	let actionCalls = 0;
	const result = await handler<{ attemptKey: string }, null>(runGeneration)(
		{
			async runMutation() {
				return null;
			},
			async runQuery() {
				return { kind: "Full" };
			},
			async runAction() {
				actionCalls += 1;
				return null;
			},
		},
		{ attemptKey: "already-full" },
	);
	expect(result).toBeNull();
	expect(actionCalls).toBe(0);

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
	const reading = {
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
	};
	const queryInputs: unknown[] = [];
	const mutationInputs: unknown[] = [];
	const inspectionInputs: { step: { name: string; payloadJson: string } }[] =
		[];

	const result = await handler<
		{
			attemptKey: string;
			reading: unknown;
			changes: unknown[];
			pendingRelations: unknown[];
			relationPublication: typeof EMPTY_RELATION_RUN;
			productionEvidence: typeof PRODUCTION_EVIDENCE;
		},
		null
	>(applyGeneratedPlan)(
		{
			async runQuery(_reference: unknown, input: unknown) {
				if (
					getFunctionName(
						_reference as FunctionReference<"query">,
					) === "resolutionInspection:enabled"
				)
					return true;
				queryInputs.push(input);
				return {
					intent: "applyGeneratedKnowledge",
					revision: "convex-0",
					existingReading: {
						reading,
						attestedTranslations: [],
						attestations: [],
						notes: "",
					},
					exactPendingRelations: [],
					relationLemmas: [],
					relationReadings: [],
				};
			},
			async runMutation(_reference: unknown, input: unknown) {
				if (
					getFunctionName(
						_reference as FunctionReference<"mutation">,
					) === "resolutionInspection:recordStep"
				) {
					inspectionInputs.push(
						input as {
							step: { name: string; payloadJson: string };
						},
					);
					return null;
				}
				mutationInputs.push(input);
				return { status: "Committed" };
			},
		},
		{
			attemptKey: "attempt-1",
			reading,
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
			relationPublication: EMPTY_RELATION_RUN,
			productionEvidence: PRODUCTION_EVIDENCE,
		},
	);

	expect(result).toBeNull();
	expect(inspectionInputs.map((input) => input.step.name)).toEqual([
		"Prepare generated Knowledge",
		"Commit generated Knowledge",
		"Publish generated Knowledge",
	]);
	expect(
		JSON.parse(inspectionInputs[1]?.step.payloadJson ?? "null").output,
	).toEqual({ status: "Committed" });
	expect(queryInputs).toEqual([
		expect.objectContaining({
			request: expect.objectContaining({
				intent: "applyGeneratedKnowledge",
				pendingLocatorKeys: [],
			}),
		}),
	]);
	expect(mutationInputs).toEqual([
		expect.objectContaining({
			attemptKey: "attempt-1",
			generatedChanges: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Ein Geldinstitut.",
				},
			],
		}),
	]);
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
	const loaded = await handler<{ attemptKey: string }, unknown>(loadInput)(
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
		await handler<{ attemptKey: string }, unknown>(loadInput)(
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

test("dictionary conflict rolls back the generated commit", async () => {
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
		knowledgeGenerationAttempts: [attempt("attempt-1", "attempt-1")],
		dictionaryState: [
			{ _id: "dictionary-state", key: "global", revision: 1 },
		],
	});
	const result = await handler<
		{
			attemptKey: string;
			plan: unknown;
			baseKnowledgePlan: unknown;
			generatedChanges: unknown[];
			relationPublication: typeof EMPTY_RELATION_RUN;
			productionEvidence: typeof PRODUCTION_EVIDENCE;
		},
		{ status: string }
	>(commitGenerated)(
		{ db },
		{
			attemptKey: "attempt-1",
			plan: { baseRevision: "convex-0", changes: [{}] },
			baseKnowledgePlan: { baseRevision: "convex-0", changes: [{}] },
			generatedChanges: [{ kind: "SetDefinition" }],
			relationPublication: EMPTY_RELATION_RUN,
			productionEvidence: PRODUCTION_EVIDENCE,
		},
	);
	expect(result).toEqual({ status: "DictionaryConflict" });
	expect(db.rows("accumulatedKnowledge")[0]).toMatchObject({
		knowledge: { definition: "partial" },
		status: "Partial",
	});
	expect(db.rows("knowledgeGenerationAttempts")[0]).toMatchObject({
		state: "Running",
	});
	expect(db.rows("knowledgeChanges")).toEqual([]);
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
		const input = await handler<{ attemptKey: string }, unknown>(loadInput)(
			{ db },
			{ attemptKey: "progress" },
		);
		const slow = Promise.withResolvers<void>();
		const published = Promise.withResolvers<void>();
		const publications: Array<{
			publication: { final: boolean };
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
						const name = getFunctionName(reference);
						if (name === "resolutionInspection:enabled")
							return false;
						if (name === "knowledgeGeneration:loadInput")
							return input;
						if (name === "relationPublication:getAuthorization")
							return {
								rollbackStopped: false,
								qualifiedKinds: [],
								artifactPath: null,
								fingerprints: RELATION_PUBLICATION_FINGERPRINTS,
							};
						throw Error(`Unexpected query ${name}`);
					},
					async runMutation() {
						return null;
					},
					async runAction(
						_reference: unknown,
						args: (typeof publications)[number],
					) {
						publications.push(args);
						if (!args.publication.final) published.resolve();
						if (failFirstPublication && publications.length === 1)
							throw Error("Simulated transient commit failure");
						return null;
					},
				},
				{ attemptKey: "progress" },
			).then(() => {
				finished = true;
			});
			await published.promise;
			expect(finished).toBe(false);
			expect(publications[0]?.publication.final).toBe(false);
			slow.resolve();
			await running;
			expect(publications.at(-1)?.publication.final).toBe(true);
			if (failFirstPublication)
				expect(publications.at(-1)?.changes).toEqual(
					publications[0]?.changes,
				);
			else expect(publications.at(-1)?.changes).toEqual([]);
			expect(
				publications
					.slice(failFirstPublication ? 1 : 0)
					.flatMap((item) => item.changes),
			).toHaveLength(3);
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
		const rows = occurrenceRows();
		const db = new GenerationDb({
			...rows,
			knowledgeGenerationAttempts: [attempt("partial", "partial")],
		});
		const lemma = {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
		};
		const reading = { unitKind: "Reading", lemma, emojiDescription: "🏦" };
		const { lemmaIdentityKey, readingIdentityKey } = await import(
			"../server/linguisticIdentity"
		);
		await db.patch("lemma-1", { lemmaKey: lemmaIdentityKey(lemma) });
		const readingKey = readingIdentityKey(reading);
		await db.patch("reading-1", { readingKey });
		await db.patch("partial", { ownerReadingKey: readingKey });
		await db.insert("readingEntries", {
			readingId: "reading-1",
			record: { attestedTranslations: [], attestations: [], notes: "" },
		});

		const change = {
			kind: "Contribute",
			aspect: "definition",
			value: "Ein Geldinstitut.",
		};
		const plan = {
			baseRevision: "convex-0",
			changes: [
				{
					type: "patchReading",
					reading,
					ops: [
						{
							kind: "applyKnowledgeChange",
							envelope: { reading, change },
						},
					],
					preconditions: [],
				},
			],
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
			const commit = handler<unknown, { status: string }>(
				commitGenerated,
			);
			const intermediate = {
				attemptKey: "partial",
				publication: { sequence: 1, final: false },
				plan,
				baseKnowledgePlan: plan,
				generatedChanges: [change],
				relationPublication: EMPTY_RELATION_RUN,
				productionEvidence: {
					...evidence,
					failures: [],
					operationTraces: [],
				},
			};
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
			expect(await commit({ db }, intermediate)).toEqual({
				status: "Ignored",
			});
			expect(
				await commit(
					{ db },
					{
						...intermediate,
						publication: { sequence: 2, final: false },
						relationPublication: {
							...EMPTY_RELATION_RUN,
							runNumber: 999,
						},
					},
				),
			).toEqual({ status: "Ignored" });
			expect(db.rows("knowledgeChanges")).toHaveLength(1);
		}
		const finalPlan = incremental
			? {
					baseRevision: `convex-${db.rows("dictionaryState")[0]?.revision ?? 0}`,
					changes: [],
				}
			: plan;
		const result = await handler<unknown, { status: string }>(
			commitGenerated,
		)(
			{ db },
			{
				attemptKey: "partial",
				...(incremental
					? { publication: { sequence: 2, final: true } }
					: {}),
				plan: finalPlan,
				baseKnowledgePlan: finalPlan,
				generatedChanges: incremental ? [] : [change],
				relationPublication: EMPTY_RELATION_RUN,
				productionEvidence: evidence,
			},
		);
		expect(result.status).toBe("Committed");
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
