import { describe, expect, test } from "bun:test";
import {
	clearVisitorDataBatch,
	resetDemoDataBatch,
	stripTextAnalysisGraphBatch,
} from "../convex/demoReset";
import {
	assertResolutionLifecycle,
	assertResolutionProgressTransition,
	loadResolutionNote,
	projectResolutionGrammar,
	projectResolutionReading,
	settleComplete,
} from "../convex/model/resolutionSessions";
import { runResolutionSession } from "../convex/orchestration";
import {
	persistSubmittedText,
	persistUnresolvedClick,
} from "../convex/persistence";
import {
	advance,
	cleanup,
	MAX_RESOLUTION_RUNS,
	recordRunFailure,
	recoverStaleRun,
	retryResolution,
	STALE_RUN_AFTER_MS,
	selectSegment,
	settleAfterRun,
} from "../convex/resolutionSessions";

type Row = Record<string, unknown> & { _id: string };

class SessionDb {
	private readonly tables = new Map<string, Map<string, Row>>();
	private nextId = 1;
	readonly queriedIndexes: string[] = [];

	constructor(seed: Record<string, readonly Row[]> = {}) {
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
		const queriedIndexes = this.queriedIndexes;
		const predicates: Array<(row: Row) => boolean> = [];
		const range = {
			eq(field: string, value: unknown) {
				predicates.push((row) => nestedValue(row, field) === value);
				return range;
			},
			lte(field: string, value: number) {
				predicates.push(
					(row) => Number(nestedValue(row, field)) <= value,
				);
				return range;
			},
		};
		const matches = () =>
			this.rows(table).filter((row) =>
				predicates.every((predicate) => predicate(row)),
			);
		return {
			withIndex(name: string, build: (range: typeof range) => unknown) {
				queriedIndexes.push(name);
				build(range);
				return queryResult(matches);
			},
			take: async (limit: number) => this.rows(table).slice(0, limit),
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
			const row = rows.get(id);
			if (!row) continue;
			const next = { ...row, ...structuredClone(value) };
			for (const [key, member] of Object.entries(next)) {
				if (member === undefined) delete next[key];
			}
			rows.set(id, next);
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

function queryResult(matches: () => Row[]) {
	return {
		async unique() {
			const rows = matches();
			if (rows.length > 1) throw new Error("Expected unique row.");
			return rows[0] ?? null;
		},
		async take(limit: number) {
			return matches().slice(0, limit);
		},
	};
}

function nestedValue(row: Row, path: string): unknown {
	return path.split(".").reduce<unknown>((value, key) => {
		if (!value || typeof value !== "object") return undefined;
		return (value as Record<string, unknown>)[key];
	}, row);
}

function handler<TArgs, TResult>(value: unknown) {
	return (
		value as {
			_handler: (ctx: unknown, args: TArgs) => Promise<TResult>;
		}
	)._handler;
}

function ordinaryDbContext(db: SessionDb) {
	return { db } as never;
}

function sourceSeed(): Record<string, readonly Row[]> {
	return {
		texts: [{ _id: "text-1", sourceText: "Die Banken." }],
		sentences: [
			{
				_id: "sentence-1",
				textId: "text-1",
				stitchedText: "Die Banken.",
			},
		],
		segments: [
			{
				_id: "segment-1",
				sentenceId: "sentence-1",
				index: 2,
				kind: "ResolvableText",
				text: "Banken",
			},
		],
	};
}

function resolvedSourceSeed(): Record<string, readonly Row[]> {
	const seed = sourceSeed();
	return {
		...seed,
		segments: [
			{
				_id: "segment-0",
				sentenceId: "sentence-1",
				index: 0,
				kind: "ResolvableText",
				text: "Die",
			},
			{
				_id: "segment-space",
				sentenceId: "sentence-1",
				index: 1,
				kind: "Whitespace",
				text: " ",
			},
			...(seed.segments ?? []).map((segment) => ({
				...segment,
				attestationMembership: {
					attestationId: "attestation-1",
					orthography: "Standard",
				},
			})),
		],
		attestations: [
			{
				_id: "attestation-1",
				readingId: "reading-1",
				surfaceId: "surface-1",
				realizationCoverage: "Full",
			},
		],
		readings: [
			{
				_id: "reading-1",
				readingKey: "reading-1-key",
				lemmaId: "lemma-1",
				emojiDescription: "🏦",
			},
		],
		lemmas: [
			{
				_id: "lemma-1",
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
				normalizedSurface: "Banken",
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: {},
				inflectionalFeatures: {},
			},
		],
	};
}

const beginArgs = {
	requestId: "request-1",
	visitorId: "visitor-1",
	sentenceId: "sentence-1",
	clickedSegmentIndex: 2,
	routeNoteRequested: false,
};

describe("Resolution Session", () => {
	test("a committed occurrence opens its canonical Note directly and records only the first Visitor Encounter", async () => {
		const db = new SessionDb(resolvedSourceSeed());
		const scheduled: unknown[] = [];
		const ctx = {
			db,
			scheduler: {
				async runAfter(...args: unknown[]) {
					scheduled.push(args);
				},
			},
		};
		const run = handler<typeof beginArgs, unknown>(selectSegment);

		expect(await run(ctx, beginArgs)).toEqual({
			kind: "Available",
			target: {
				kind: "UnitReadingNote",
				readingId: "reading-1",
			},
		});
		expect(
			await run(ctx, {
				...beginArgs,
				requestId: "request-2",
				routeNoteRequested: true,
			}),
		).toEqual({
			kind: "Available",
			target: {
				kind: "RouteNote",
				routeKind: "Attestation",
				id: "attestation-1",
			},
		});
		expect(db.rows("visitorClicks")).toHaveLength(1);
		expect(db.rows("knowledgeGenerationAttempts")).toHaveLength(2);
		expect(db.rows("resolutionSessions")).toEqual([]);
		expect(scheduled).toHaveLength(2);
	});

	test("begin captures one exact Segment and schedules orchestration once", async () => {
		const db = new SessionDb(sourceSeed());
		const scheduled: unknown[] = [];
		const ctx = {
			db,
			scheduler: {
				async runAfter(...args: unknown[]) {
					scheduled.push(args);
				},
			},
		};
		const run = handler<typeof beginArgs, unknown>(selectSegment);

		expect(await run(ctx, beginArgs)).toMatchObject({
			kind: "Resolving",
			progress: "Starting",
			deduplicated: false,
		});
		expect(await run(ctx, beginArgs)).toMatchObject({
			kind: "Resolving",
			progress: "Starting",
			deduplicated: true,
		});
		expect(db.rows("resolutionSessions")).toHaveLength(1);
		expect(db.rows("resolutionSessions")[0]).toMatchObject({
			segmentId: "segment-1",
			route: {
				textId: "text-1",
				selectedSegment: "Banken",
			},
		});
		expect(scheduled).toHaveLength(2);
	});

	test("same request with a different click is rejected", async () => {
		const db = new SessionDb(sourceSeed());
		const ctx = {
			db,
			scheduler: { async runAfter() {} },
		};
		const run = handler<typeof beginArgs, unknown>(selectSegment);
		await run(ctx, beginArgs);

		await expect(
			run(ctx, { ...beginArgs, visitorId: "visitor-2" }),
		).rejects.toThrow("different click");
		await expect(
			run(ctx, { ...beginArgs, routeNoteRequested: true }),
		).rejects.toThrow("different click");
	});

	test("terminal navigation preserves ordinary and one-shot Route Note intent", async () => {
		const common = {
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId: "sentence-1",
			segmentId: "segment-1",
			clickedSegmentIndex: 2,
			runToken: "run-1",
			lifecycle: {
				state: "Terminal",
				progress: "Committing",
				outcome: "Complete",
			},
			route: {
				textId: "text-1",
				sentenceId: "sentence-1",
				stitchedText: "Die Banken.",
				clickedSegmentIndex: 2,
				selectedSegment: "Banken",
			},
			readingId: "reading-1",
			attestationId: "attestation-1",
			createdAt: 1,
			updatedAt: 2,
		};
		const ordinaryDb = new SessionDb({
			resolutionSessions: [{ _id: "session-1", ...common }],
		});
		const routeDb = new SessionDb({
			resolutionSessions: [
				{ _id: "session-2", ...common, routeNoteRequested: true },
			],
		});
		expect(
			(
				await loadResolutionNote(
					ordinaryDbContext(ordinaryDb),
					"request-1",
				)
			)?.terminal,
		).toMatchObject({
			kind: "Complete",
			target: { kind: "UnitReadingNote", readingId: "reading-1" },
		});
		expect(
			(await loadResolutionNote(ordinaryDbContext(routeDb), "request-1"))
				?.terminal,
		).toMatchObject({
			kind: "Complete",
			target: {
				kind: "RouteNote",
				routeKind: "Attestation",
				id: "attestation-1",
			},
		});
	});

	test("progress is ordered and duplicate or regressive runner updates are harmless", async () => {
		const db = new SessionDb(sourceSeed());
		const scheduled: unknown[] = [];
		const ctx = {
			db,
			scheduler: {
				async runAfter(...args: unknown[]) {
					scheduled.push(args);
				},
			},
		};
		await handler<typeof beginArgs, unknown>(selectSegment)(ctx, beginArgs);
		const session = db.rows("resolutionSessions")[0];
		if (!session) throw new Error("Expected a Resolution Session.");
		const guard = {
			requestId: "request-1",
			runToken: String(session.runToken),
			segmentId: "segment-1",
		};
		const run = handler<
			{
				guard: typeof guard;
				progress:
					| "RouteAvailable"
					| "GrammarAvailable"
					| "ReadingAvailable"
					| "Committing";
				grammar?: ReturnType<typeof grammarProjection>;
				reading?: ReturnType<typeof readingProjection>;
			},
			boolean
		>(advance);

		expect(await run(ctx, { guard, progress: "RouteAvailable" })).toBe(
			true,
		);
		expect(
			await run(ctx, {
				guard,
				progress: "GrammarAvailable",
				grammar: grammarProjection(),
			}),
		).toBe(true);
		expect(await run(ctx, { guard, progress: "RouteAvailable" })).toBe(
			false,
		);
		expect(
			await run(ctx, {
				guard,
				progress: "GrammarAvailable",
				grammar: grammarProjection(),
			}),
		).toBe(false);
		expect(
			run(ctx, {
				guard: { ...guard, runToken: "old" },
				progress: "Committing",
			}),
		).rejects.toThrow("no longer active");
	});

	test("completion accepts an Encounter first recorded by an earlier request", async () => {
		const db = new SessionDb({
			...resolvedSourceSeed(),
			resolutionSessions: [
				{
					_id: "session-1",
					requestId: "request-later",
					runToken: "run-1",
					visitorId: "visitor-1",
					sentenceId: "sentence-1",
					segmentId: "segment-1",
					clickedSegmentIndex: 2,
					lifecycle: {
						state: "Active",
						progress: "RouteAvailable",
						activity: "Running",
					},
					createdAt: 1,
					updatedAt: 1,
				},
			],
			visitorClicks: [
				{
					_id: "click-1",
					requestId: "request-earlier",
					visitorId: "visitor-1",
					segmentId: "segment-1",
					attestationId: "attestation-1",
					clickedAt: 1,
				},
			],
		});

		expect(
			await handler<
				{
					guard: {
						requestId: string;
						runToken: string;
						segmentId: string;
					};
					result: {
						kind: "Complete";
						readingId: string;
						attestationId: string;
						grammar: ReturnType<typeof grammarProjection>;
						reading: ReturnType<typeof readingProjection>;
					};
				},
				boolean
			>(settleAfterRun)(
				{ db },
				{
					guard: {
						requestId: "request-later",
						runToken: "run-1",
						segmentId: "segment-1",
					},
					result: {
						kind: "Complete",
						readingId: "reading-1",
						attestationId: "attestation-1",
						grammar: grammarProjection("Bank"),
						reading: readingProjection("🏦", "Bank"),
					},
				},
			),
		).toBe(true);
		expect(db.rows("resolutionSessions")[0]).toMatchObject({
			lifecycle: {
				state: "Terminal",
				progress: "Committing",
				outcome: "Complete",
			},
			readingId: "reading-1",
			attestationId: "attestation-1",
		});
	});

	test("terminal convergence replaces provisional projections with the canonical winner", async () => {
		const db = new SessionDb({
			resolutionSessions: [
				{
					_id: "session-1",
					lifecycle: {
						state: "Active",
						progress: "Committing",
						activity: "Running",
					},
					grammar: grammarProjection("loser"),
					reading: readingProjection("🧪", "loser"),
				},
			],
		});
		await settleComplete(
			{ db } as never,
			{ _id: "session-1" as never },
			{
				readingId: "reading-winner" as never,
				attestationId: "attestation-winner" as never,
				grammar: grammarProjection("Bank"),
				reading: readingProjection("🏦", "Bank"),
			},
		);

		expect(db.rows("resolutionSessions")[0]).toMatchObject({
			lifecycle: {
				state: "Terminal",
				progress: "Committing",
				outcome: "Complete",
			},
			readingId: "reading-winner",
			attestationId: "attestation-winner",
			grammar: { canonicalForm: "Bank" },
			reading: { emojiDescription: "🏦", canonicalForm: "Bank" },
		});
	});

	test("a stale run rotates its token and is rescheduled", async () => {
		const db = new SessionDb({
			resolutionSessions: [
				{
					_id: "session-1",
					requestId: "request-1",
					runToken: "old-token",
					segmentId: "segment-1",
					lifecycle: {
						state: "Active",
						progress: "ReadingAvailable",
						activity: "Running",
					},
					updatedAt: Date.now() - STALE_RUN_AFTER_MS - 1,
				},
			],
		});
		const scheduled: unknown[] = [];
		const result = await handler<
			{ requestId: string; runToken: string },
			boolean
		>(recoverStaleRun)(
			{
				db,
				scheduler: {
					async runAfter(...args: unknown[]) {
						scheduled.push(args);
					},
				},
			},
			{ requestId: "request-1", runToken: "old-token" },
		);

		expect(result).toBe(true);
		expect(db.rows("resolutionSessions")[0]?.runToken).not.toBe(
			"old-token",
		);
		expect(db.rows("resolutionSessions")[0]).toMatchObject({
			lifecycle: {
				state: "Active",
				activity: "Scheduled",
				progress: "ReadingAvailable",
			},
		});
		expect(scheduled).toHaveLength(2);
	});

	for (const budgetCase of ["run limit", "deadline"] as const) {
		test(`a stale run becomes permanent when its ${budgetCase} is exhausted`, async () => {
			const now = Date.now();
			const runNumber =
				budgetCase === "run limit" ? MAX_RESOLUTION_RUNS : 1;
			const db = new SessionDb({
				resolutionSessions: [
					{
						_id: "session-1",
						requestId: "request-1",
						runToken: "stale-token",
						runNumber,
						retryDeadlineAt:
							budgetCase === "deadline" ? now - 1 : now + 60_000,
						segmentId: "segment-1",
						lifecycle: {
							state: "Active",
							progress: "GrammarAvailable",
							activity: "Running",
						},
						updatedAt: now - STALE_RUN_AFTER_MS - 1,
					},
				],
				resolutionRuns: [
					{
						_id: "run-1",
						requestId: "request-1",
						runToken: "stale-token",
						runNumber,
						phase: "Reading",
						state: "Running",
						startedAt: 1,
						expiresAt: now + 60_000,
					},
				],
			});
			const scheduled: unknown[] = [];

			expect(
				await handler<{ requestId: string; runToken: string }, boolean>(
					recoverStaleRun,
				)(
					{
						db,
						scheduler: {
							async runAfter(...args: unknown[]) {
								scheduled.push(args);
							},
						},
					},
					{ requestId: "request-1", runToken: "stale-token" },
				),
			).toBe(true);
			expect(scheduled).toEqual([]);
			expect(db.rows("resolutionSessions")[0]).toMatchObject({
				lifecycle: {
					state: "Terminal",
					outcome: "PermanentFailure",
					progress: "GrammarAvailable",
				},
				failureCode: "Internal",
			});
			expect(db.rows("resolutionSessions")[0]?.diagnosticId).toBeString();
			expect(db.rows("resolutionRuns")[0]).toMatchObject({
				failureCode: "Internal",
				state: "Failed",
			});
			expect(db.rows("resolutionRuns")[0]?.diagnosticId).toBe(
				db.rows("resolutionSessions")[0]?.diagnosticId,
			);
		});
	}

	test("a retryable Reading failure preserves Grammar and schedules a durable retry", async () => {
		const db = new SessionDb({
			...sourceSeed(),
			resolutionSessions: [
				{
					_id: "session-1",
					requestId: "request-1",
					visitorId: "visitor-1",
					sentenceId: "sentence-1",
					segmentId: "segment-1",
					clickedSegmentIndex: 2,
					runToken: "run-1",
					runNumber: 1,
					lifecycle: {
						state: "Active",
						progress: "GrammarAvailable",
						activity: "Running",
					},
					grammar: grammarProjection(),
					grammaticalCheckpoint: grammaticalInput(),
					readingCheckpoint: readingCheckpoint(),
					retryDeadlineAt: Date.now() + 60_000,
					createdAt: 1,
					updatedAt: 1,
				},
			],
			resolutionRuns: [
				{
					_id: "resolution-run-1",
					requestId: "request-1",
					runToken: "run-1",
					runNumber: 1,
					phase: "Reading",
					state: "Running",
					startedAt: 1,
				},
			],
		});
		const scheduled: unknown[] = [];

		const result = await handler<
			{
				guard: {
					requestId: string;
					runToken: string;
					segmentId: string;
				};
				failure: {
					attempts: number;
					category: "ProviderUnavailable";
					providerRequestId: string;
					retryable: true;
					status: number;
				};
				generationEvents?: readonly Record<string, unknown>[];
				phase: "Reading";
			},
			{ scheduled: boolean }
		>(recordRunFailure)(
			{
				db,
				scheduler: {
					async runAfter(...args: unknown[]) {
						scheduled.push(args);
					},
				},
			},
			{
				guard: {
					requestId: "request-1",
					runToken: "run-1",
					segmentId: "segment-1",
				},
				failure: {
					attempts: 3,
					category: "ProviderUnavailable",
					providerRequestId: "provider-request-1",
					retryable: true,
					status: 500,
				},
				generationEvents: [
					{
						kind: "AttemptFailed",
						requestId: "request-1",
						runToken: "run-1",
						phase: "Reading",
						failure: {
							attempts: 3,
							category: "ProviderUnavailable",
							providerRequestId: "provider-request-1",
							retryable: true,
							status: 500,
						},
					},
				],
				phase: "Reading",
			},
		);

		expect(result).toMatchObject({ scheduled: true });
		expect(db.rows("resolutionSessions")[0]).toMatchObject({
			lifecycle: {
				state: "Active",
				activity: "WaitingForRetry",
				progress: "GrammarAvailable",
			},
			failureCode: "ProviderUnavailable",
			grammar: grammarProjection(),
			grammaticalCheckpoint: grammaticalInput(),
			readingCheckpoint: readingCheckpoint(),
			runNumber: 2,
		});
		expect(db.rows("resolutionSessions")[0]?.runToken).not.toBe("run-1");
		expect(db.rows("resolutionRuns")[0]).toMatchObject({
			failure: {
				category: "ProviderUnavailable",
				providerRequestId: "provider-request-1",
				status: 500,
			},
			generationEvents: [
				{
					kind: "AttemptFailed",
					requestId: "request-1",
					runToken: "run-1",
				},
			],
			state: "Failed",
		});
		expect(scheduled).toHaveLength(2);
	});

	test("durable retry preserves a provider Retry-After beyond the local window", async () => {
		const db = new SessionDb({
			...sourceSeed(),
			resolutionSessions: [
				{
					_id: "session-1",
					requestId: "request-1",
					visitorId: "visitor-1",
					sentenceId: "sentence-1",
					segmentId: "segment-1",
					clickedSegmentIndex: 2,
					runToken: "run-1",
					runNumber: 1,
					lifecycle: {
						state: "Active",
						progress: "GrammarAvailable",
						activity: "Running",
					},
					retryDeadlineAt: Date.now() + 5 * 60_000,
					createdAt: 1,
					updatedAt: 1,
				},
			],
		});
		const scheduled: unknown[][] = [];

		expect(
			await handler<Record<string, unknown>, { scheduled: boolean }>(
				recordRunFailure,
			)(
				{
					db,
					scheduler: {
						async runAfter(...args: unknown[]) {
							scheduled.push(args);
						},
					},
				},
				{
					guard: {
						requestId: "request-1",
						runToken: "run-1",
						segmentId: "segment-1",
					},
					failure: {
						attempts: 1,
						category: "RateLimited",
						retryAfterMs: 120_000,
						retryable: true,
						status: 429,
					},
					phase: "Reading",
				},
			),
		).toEqual({ scheduled: true });
		expect(scheduled[0]?.[0]).toBe(120_000);
		expect(db.rows("resolutionRuns")[0]).toMatchObject({
			delayMs: 120_000,
			failure: { retryAfterMs: 120_000 },
		});
	});

	test("an exhausted retryable failure becomes a safe PermanentFailure", async () => {
		const db = new SessionDb({
			...sourceSeed(),
			resolutionSessions: [
				{
					_id: "session-1",
					requestId: "request-1",
					visitorId: "visitor-1",
					sentenceId: "sentence-1",
					segmentId: "segment-1",
					clickedSegmentIndex: 2,
					runToken: "run-3",
					runNumber: 3,
					lifecycle: {
						state: "Active",
						progress: "GrammarAvailable",
						activity: "Running",
					},
					retryDeadlineAt: Date.now() + 60_000,
					createdAt: 1,
					updatedAt: 1,
				},
			],
		});

		const result = await handler<
			Record<string, unknown>,
			{ scheduled: boolean }
		>(recordRunFailure)(
			{ db, scheduler: { async runAfter() {} } },
			{
				guard: {
					requestId: "request-1",
					runToken: "run-3",
					segmentId: "segment-1",
				},
				failure: {
					attempts: 3,
					category: "ProviderUnavailable",
					retryable: true,
					status: 500,
				},
				phase: "Reading",
			},
		);

		expect(result).toEqual({ scheduled: false });
		expect(db.rows("resolutionSessions")[0]).toMatchObject({
			lifecycle: {
				state: "Terminal",
				outcome: "PermanentFailure",
				progress: "GrammarAvailable",
			},
			failureCode: "ProviderUnavailable",
			failureMessage: "Reading generation is temporarily unavailable.",
		});
		expect(db.rows("resolutionSessions")[0]?.diagnosticId).toBeString();
	});

	test("public failure projection omits operational provider diagnostics", async () => {
		const db = new SessionDb({
			resolutionSessions: [
				{
					_id: "session-1",
					requestId: "request-1",
					visitorId: "visitor-1",
					sentenceId: "sentence-1",
					segmentId: "segment-1",
					clickedSegmentIndex: 2,
					runToken: "run-3",
					lifecycle: {
						state: "Terminal",
						progress: "GrammarAvailable",
						outcome: "PermanentFailure",
					},
					failureCode: "ProviderUnavailable",
					diagnosticId: "diagnostic-1",
					failureMessage:
						"Reading generation is temporarily unavailable.",
					route: {
						textId: "text-1",
						sentenceId: "sentence-1",
						stitchedText: "Die Banken.",
						clickedSegmentIndex: 2,
						selectedSegment: "Banken",
					},
					createdAt: 1,
					updatedAt: 2,
				},
			],
			resolutionRuns: [
				{
					_id: "resolution-run-1",
					requestId: "request-1",
					providerRequestId: "provider-secret-reference",
				},
			],
		});

		const note = await loadResolutionNote(
			ordinaryDbContext(db),
			"request-1",
		);
		expect(note?.terminal).toEqual({
			kind: "PermanentFailure",
			failureCode: "ProviderUnavailable",
			diagnosticId: "diagnostic-1",
			message: "Reading generation is temporarily unavailable.",
		});
		expect(JSON.stringify(note)).not.toContain("provider-secret-reference");
	});

	test("an explicit retry reactivates an exhausted session without losing Grammar", async () => {
		const db = new SessionDb({
			...sourceSeed(),
			resolutionSessions: [
				{
					_id: "session-1",
					requestId: "request-1",
					visitorId: "visitor-1",
					sentenceId: "sentence-1",
					segmentId: "segment-1",
					clickedSegmentIndex: 2,
					runToken: "run-3",
					lifecycle: {
						state: "Terminal",
						progress: "GrammarAvailable",
						outcome: "PermanentFailure",
					},
					grammar: grammarProjection(),
					grammaticalCheckpoint: grammaticalInput(),
					failureCode: "ProviderUnavailable",
					diagnosticId: "diagnostic-1",
					failureMessage:
						"Reading generation is temporarily unavailable.",
					createdAt: 1,
					updatedAt: 2,
				},
			],
		});
		const scheduled: unknown[] = [];

		expect(
			await handler<
				{ requestId: string; visitorId: string },
				{ retried: boolean }
			>(retryResolution)(
				{
					db,
					scheduler: {
						async runAfter(...args: unknown[]) {
							scheduled.push(args);
						},
					},
				},
				{ requestId: "request-1", visitorId: "visitor-1" },
			),
		).toEqual({ retried: true });
		expect(db.rows("resolutionSessions")[0]).toMatchObject({
			lifecycle: {
				state: "Active",
				activity: "Scheduled",
				progress: "GrammarAvailable",
			},
			grammar: grammarProjection(),
			grammaticalCheckpoint: grammaticalInput(),
			runNumber: 1,
		});
		expect(db.rows("resolutionSessions")[0]?.lifecycle).not.toHaveProperty(
			"outcome",
		);
		expect(scheduled).toHaveLength(2);
	});

	test("cleanup removes stale active and old terminal sessions but keeps a completed target that vanished", async () => {
		const old = Date.now() - 10_000;
		const db = new SessionDb({
			resolutionSessions: [
				{
					_id: "stale",
					lifecycle: {
						state: "Active",
						progress: "Starting",
						activity: "Scheduled",
					},
					updatedAt: old,
				},
				{
					_id: "failed",
					lifecycle: {
						state: "Terminal",
						progress: "Starting",
						outcome: "PermanentFailure",
					},
					updatedAt: old,
				},
				{
					_id: "complete-missing",
					lifecycle: {
						state: "Terminal",
						progress: "Committing",
						outcome: "Complete",
					},
					updatedAt: old,
					readingId: "reading-missing",
				},
			],
		});
		const result = await handler<
			{ staleBefore: number; terminalBefore: number },
			{ deleted: number; hasMore: boolean }
		>(cleanup)(
			{ db },
			{ staleBefore: Date.now() - 1, terminalBefore: Date.now() - 1 },
		);

		expect(result.deleted).toBe(2);
		expect(db.rows("resolutionSessions").map(({ _id }) => _id)).toEqual([
			"complete-missing",
		]);
		expect(db.queriedIndexes).toContain(
			"by_lifecycle_state_and_updated_at",
		);
		expect(db.queriedIndexes).not.toContain("by_stage_and_updated_at");
	});

	test("projection exposes learner-safe fields only", () => {
		const grammar = projectResolutionGrammar(grammaticalInput("Bank"));
		const reading = projectResolutionReading(readingInput("🏦", "Bank"));
		expect(grammar).toEqual(grammarProjection("Bank"));
		expect(reading).toEqual(readingProjection("🏦", "Bank"));
		expect(JSON.stringify({ grammar, reading })).not.toContain("provider");
		expect(JSON.stringify({ grammar, reading })).not.toContain("plan");
	});

	test("an invalidated session cannot write even an Unresolved Click", async () => {
		const db = new SessionDb(sourceSeed());
		await expect(
			handler<
				typeof beginArgs & {
					sessionGuard: {
						requestId: string;
						runToken: string;
						segmentId: string;
					};
				},
				unknown
			>(persistUnresolvedClick)(
				{ db },
				{
					...beginArgs,
					sessionGuard: {
						requestId: "request-1",
						runToken: "deleted-run",
						segmentId: "segment-1",
					},
				},
			),
		).rejects.toThrow("no longer active");
		expect(db.rows("visitorClicks")).toEqual([]);
	});

	test("strip, visitor clear, and full reset invalidate sessions before source writes", async () => {
		const seededSession = {
			_id: "session-1",
			requestId: "request-1",
			visitorId: "visitor-1",
			sentenceId: "sentence-1",
			segmentId: "segment-1",
			lifecycle: {
				state: "Active",
				progress: "Starting",
				activity: "Scheduled",
			},
			updatedAt: 1,
		};
		const stripDb = new SessionDb({
			...sourceSeed(),
			resolutionSessions: [seededSession],
		});
		const stripped = await handler<
			{ textId: string },
			{ deleted: number; hasMore: boolean }
		>(stripTextAnalysisGraphBatch)({ db: stripDb }, { textId: "text-1" });
		expect(stripped).toEqual({ deleted: 1, hasMore: true });
		expect(stripDb.rows("resolutionSessions")).toEqual([]);
		expect(stripDb.rows("segments")).toHaveLength(1);

		const visitorDb = new SessionDb({
			resolutionSessions: [seededSession],
			visitorClicks: [
				{
					_id: "click-1",
					visitorId: "visitor-1",
					clickedAt: 1,
				},
			],
		});
		await handler<
			{ visitorId: string },
			{ deleted: number; hasMore: boolean }
		>(clearVisitorDataBatch)({ db: visitorDb }, { visitorId: "visitor-1" });
		expect(visitorDb.rows("resolutionSessions")).toEqual([]);
		expect(visitorDb.rows("visitorClicks")).toEqual([]);

		const resetDb = new SessionDb({
			...sourceSeed(),
			resolutionSessions: [seededSession],
		});
		const reset = await handler<
			Record<string, never>,
			{ deleted: number; hasMore: boolean }
		>(resetDemoDataBatch)({ db: resetDb }, {});
		expect(reset).toEqual({ deleted: 1, hasMore: true });
		expect(resetDb.rows("resolutionSessions")).toEqual([]);
		expect(resetDb.rows("segments")).toHaveLength(1);
	});

	test("a partial analysis cannot masquerade as a deduplicated reanalysis", async () => {
		const db = new SessionDb({
			texts: [
				{
					_id: "text-1",
					submissionKey: "submission-1",
					sourceText: "Die Banken.",
				},
			],
			sentences: [
				{
					_id: "sentence-1",
					textId: "text-1",
					position: 0,
					segmentedSentenceId: "segmented-1",
					language: "de",
					stitchedText: "Die Banken.",
				},
			],
			segments: [
				{
					_id: "segment-1",
					sentenceId: "sentence-1",
					index: 0,
					kind: "ResolvableText",
					text: "Die",
				},
			],
		});
		await expect(
			handler<
				{
					submissionKey: string;
					sourceText: string;
					sentences: Array<{
						segmentedSentenceId: string;
						position: number;
						language: "de";
						stitchedText: string;
						segments: Array<{
							kind:
								| "ResolvableText"
								| "Whitespace"
								| "Punctuation";
							text: string;
						}>;
					}>;
				},
				unknown
			>(persistSubmittedText)(
				{ db },
				{
					submissionKey: "submission-1",
					sourceText: "Die Banken.",
					sentences: [
						{
							segmentedSentenceId: "segmented-1",
							position: 0,
							language: "de",
							stitchedText: "Die Banken.",
							segments: [
								{ kind: "ResolvableText", text: "Die" },
								{ kind: "Whitespace", text: " " },
								{ kind: "ResolvableText", text: "Banken" },
								{ kind: "Punctuation", text: "." },
							],
						},
					],
				},
			),
		).rejects.toThrow("analysis is incomplete");
	});

	test("the scheduled action completes cached resolved and unresolved Clicks without model work", async () => {
		for (const recorded of [
			{
				status: "Resolved",
				clickId: "click-1",
				readingId: "reading-1",
				occurrence: {
					attestationId: "attestation-1",
					grammatical: grammaticalInput("Bank"),
					reading: readingInput("🏦", "Bank"),
				},
			},
			{ status: "Unresolved", clickId: "click-2" },
		] as const) {
			let queryCount = 0;
			const queryArgs: unknown[] = [];
			const mutationArgs: unknown[] = [];
			await handler<
				{ requestId: string; runToken: string; segmentId: string },
				null
			>(runResolutionSession)(
				{
					async runQuery(_reference: unknown, args: unknown) {
						queryCount += 1;
						queryArgs.push(args);
						return queryCount === 1
							? {
									selection: {
										requestId: "request-1",
										visitorId: "visitor-1",
										sentenceId: "sentence-1",
										clickedSegmentIndex: 2,
									},
									checkpoints: {},
									runNumber: 2,
								}
							: recorded;
					},
					async runMutation(_reference: unknown, args: unknown) {
						mutationArgs.push(args);
						return true;
					},
				},
				{
					requestId: "request-1",
					runToken: "run-1",
					segmentId: "segment-1",
				},
			);

			expect(queryCount).toBe(2);
			expect(queryArgs[1]).toEqual({
				requestId: "request-1",
				visitorId: "visitor-1",
				sentenceId: "sentence-1",
				clickedSegmentIndex: 2,
			});
			expect(mutationArgs[1]).toMatchObject({
				progress: "RouteAvailable",
			});
			if (recorded.status === "Resolved") {
				expect(
					mutationArgs.flatMap((args) =>
						"progress" in (args as object)
							? [(args as { progress: string }).progress]
							: [],
					),
				).toEqual(["RouteAvailable"]);
				expect(
					mutationArgs.find(
						(args) => "result" in (args as Record<string, unknown>),
					),
				).toMatchObject({
					result: {
						kind: "Complete",
						readingId: "reading-1",
						attestationId: "attestation-1",
					},
				});
			} else {
				expect(mutationArgs).toHaveLength(4);
				expect(
					mutationArgs.find(
						(args) => "result" in (args as Record<string, unknown>),
					),
				).toMatchObject({
					result: { kind: "Unresolved" },
				});
			}
		}
	});

	test("the scheduled action records unexpected failures without leaking their message", async () => {
		let queryCount = 0;
		const mutationArgs: unknown[] = [];
		const errorLogs: string[] = [];
		const originalConsoleError = console.error;
		console.error = (...values: unknown[]) => {
			errorLogs.push(values.map(String).join(" "));
		};
		try {
			await handler<
				{ requestId: string; runToken: string; segmentId: string },
				null
			>(runResolutionSession)(
				{
					async runQuery() {
						queryCount += 1;
						if (queryCount === 1) {
							return {
								selection: {
									requestId: "request-1",
									visitorId: "visitor-1",
									sentenceId: "sentence-1",
									clickedSegmentIndex: 2,
								},
								checkpoints: {},
							};
						}
						throw new TypeError("secret checkpoint payload");
					},
					async runMutation(_reference: unknown, args: unknown) {
						mutationArgs.push(args);
						return true;
					},
				},
				{
					requestId: "request-1",
					runToken: "run-1",
					segmentId: "segment-1",
				},
			);
		} finally {
			console.error = originalConsoleError;
		}

		expect(mutationArgs.at(-1)).toMatchObject({
			diagnosticId: expect.any(String),
			errorFingerprint: expect.stringContaining("fnv1a-"),
			errorName: "TypeError",
			generationEvents: [],
			guard: {
				requestId: "request-1",
				runToken: "run-1",
			},
			phase: "Grammar",
		});
		expect(errorLogs.join("\n")).toContain("ResolutionRunInternalFailure");
		expect(errorLogs.join("\n")).not.toContain("secret checkpoint payload");
	});
});

test("progress cannot skip", () => {
	expect(() =>
		assertResolutionProgressTransition(
			"RouteAvailable",
			"GrammarAvailable",
		),
	).not.toThrow();
	expect(() =>
		assertResolutionProgressTransition(
			"RouteAvailable",
			"ReadingAvailable",
		),
	).toThrow("cannot follow");
});

test("every legal Resolution lifecycle variant is accepted", () => {
	const progresses = [
		"Starting",
		"RouteAvailable",
		"GrammarAvailable",
		"ReadingAvailable",
		"Committing",
	] as const;
	for (const progress of progresses) {
		for (const activity of [
			"Scheduled",
			"Running",
			"WaitingForRetry",
		] as const) {
			expect(() =>
				assertResolutionLifecycle({
					state: "Active",
					progress,
					activity,
				}),
			).not.toThrow();
		}
		for (const outcome of ["Unresolved", "PermanentFailure"] as const) {
			expect(() =>
				assertResolutionLifecycle({
					state: "Terminal",
					progress,
					outcome,
				}),
			).not.toThrow();
		}
	}
	expect(() =>
		assertResolutionLifecycle({
			state: "Terminal",
			progress: "Committing",
			outcome: "Complete",
		}),
	).not.toThrow();
});

test("impossible active and terminal lifecycle combinations are rejected", () => {
	for (const impossible of [
		{
			state: "Active",
			progress: "Starting",
			activity: "Scheduled",
			outcome: "Complete",
		},
		{
			state: "Terminal",
			progress: "Starting",
			activity: "Running",
			outcome: "Unresolved",
		},
		{ state: "Terminal", progress: "Starting", outcome: "Complete" },
	] as const) {
		expect(() => assertResolutionLifecycle(impossible)).toThrow();
	}
});

function grammaticalInput(canonicalForm = "Bank") {
	return {
		decision: "Resolved" as const,
		attestation: {
			members: [{ attested: "Banken", orthography: "Standard" as const }],
			realizationCoverage: "Full" as const,
			surface: {
				normalizedSurface: "Banken",
				spelling: "Canonical" as const,
				surfaceKind: "Inflection" as const,
				lemma: { canonicalForm, family: "Lexeme", kind: "NOUN" },
			},
		},
		provider: { raw: "must not leak" },
	};
}

function readingInput(emojiDescription = "🏦", canonicalForm = "Bank") {
	return {
		emojiDescription,
		lemma: { canonicalForm, family: "Lexeme", kind: "NOUN" },
		plan: { raw: "must not leak" },
	};
}

function readingCheckpoint() {
	return {
		resolution: { decision: "New" as const, emojiDescription: "🏦" },
		reading: readingInput(),
	};
}

function grammarProjection(canonicalForm = "Bank") {
	return {
		members: [{ attested: "Banken", orthography: "Standard" as const }],
		realizationCoverage: "Full" as const,
		normalizedSurface: "Banken",
		spelling: "Canonical" as const,
		surfaceKind: "Inflection" as const,
		canonicalForm,
		family: "Lexeme",
		kind: "NOUN",
	};
}

function readingProjection(emojiDescription = "🏦", canonicalForm = "Bank") {
	return {
		emojiDescription,
		canonicalForm,
		family: "Lexeme",
		kind: "NOUN",
	};
}
