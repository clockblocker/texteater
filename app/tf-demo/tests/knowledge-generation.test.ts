import { expect, test } from "bun:test";
import {
	commitGenerated,
	fail,
	loadInput,
	retry,
	scheduleKnowledgeGeneration,
} from "../convex/knowledgeGeneration";
import {
	generationRequestFor,
	runKnowledgeGeneration as runGeneration,
} from "../convex/knowledgeGenerationActions";
import {
	defaultKnowledgeSettings,
	get as getKnowledgeSettings,
	update as updateKnowledgeSettings,
} from "../convex/knowledgeSettings";
import { replaceAccumulatedKnowledge } from "../convex/model/shadows";
import { applyReadingKnowledgeChange } from "../convex/orchestration";
import { persistKnowledgeChange } from "../convex/persistence";

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

function occurrenceRows(): Record<string, readonly Row[]> {
	return {
		lemmas: [
			{
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
				spelling: "Canonical",
				surfaceKind: "Citation",
				surfaceFeatures: {},
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
			},
		],
		sentences: [
			{
				_id: "sentence-1",
				segmentedSentenceId: "segmented-sentence-1",
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

test("an empty generated batch commits Full and the first Full writer wins", async () => {
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
				record: { knowledge: { definition: "canonical" } },
			},
		],
		knowledgeGenerationAttempts: [
			attempt("attempt-1", "attempt-1"),
			attempt("attempt-2", "attempt-2"),
		],
	});
	const run = handler<
		{ attemptKey: string; plan: unknown; generatedChanges: unknown[] },
		{ status: string }
	>(commitGenerated);
	const ctx = { db };

	expect(
		await run(ctx, {
			attemptKey: "attempt-1",
			plan: { baseRevision: "convex-0", changes: [] },
			generatedChanges: [],
		}),
	).toEqual({ status: "Committed" });
	expect(
		await run(ctx, {
			attemptKey: "attempt-2",
			plan: { baseRevision: "convex-0", changes: [] },
			generatedChanges: [],
		}),
	).toEqual({ status: "AlreadyFull" });
	expect(db.rows("accumulatedKnowledge")).toEqual([
		expect.objectContaining({
			ownerReadingKey: "reading-key",
			knowledge: { definition: "canonical" },
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

test("a manual write applies to Knowledge committed after the action started", async () => {
	const rows = occurrenceRows();
	const lemma = rows.lemmas?.[0];
	if (!lemma) throw new Error("Missing test Lemma.");
	const reading = {
		lemma: {
			language: lemma.language,
			family: lemma.family,
			kind: lemma.kind,
			canonicalForm: lemma.canonicalForm,
			coreFeatures: lemma.coreFeatures,
		},
		emojiDescription: "🏦",
	};
	const db = new GenerationDb({
		...rows,
		readingEntries: [
			{
				_id: "entry-1",
				readingId: "reading-1",
				record: {
					knowledge: {
						definition: "generated definition",
						translations: { en: ["bank"] },
					},
				},
			},
		],
		accumulatedKnowledge: [
			{
				_id: "knowledge-1",
				ownerReadingKey: "reading-key",
				knowledge: {
					definition: "generated definition",
					translations: { en: ["bank"] },
				},
				status: "Full",
				updatedAt: 2,
			},
		],
	});

	await handler<
		{
			knowledgeChangeKey: string;
			ownerReadingKey: string;
			change: unknown;
		},
		unknown
	>(applyReadingKnowledgeChange)(
		{
			async runQuery() {
				return {
					reading,
					knowledge: { definition: "stale definition" },
				};
			},
			async runMutation(_reference: unknown, args: unknown) {
				return handler<unknown, unknown>(persistKnowledgeChange)(
					{ db },
					args,
				);
			},
		},
		{
			knowledgeChangeKey: "manual-1",
			ownerReadingKey: "reading-key",
			change: {
				kind: "Correct",
				aspect: "definition",
				value: "manual definition",
			},
		},
	);

	expect(db.rows("accumulatedKnowledge")[0]).toMatchObject({
		knowledge: {
			definition: "manual definition",
			translations: { en: ["bank"] },
		},
		status: "Full",
	});
});

test("Full is a zero-call cache hit and generation uses the complete German mask", async () => {
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

	const request = generationRequestFor({
		lemma: {
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Bank",
			coreFeatures: { gender: "Fem", hyph: null },
		},
		emojiDescription: "🏦",
	});
	expect(request).toEqual({
		transcription: null,
		definition: null,
		translations: { en: null },
		semanticRelations: {
			synonym: null,
			nearSynonym: null,
			antonym: null,
			hypernym: null,
			hyponym: null,
			meronym: null,
			holonym: null,
		},
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
	const input = {
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
		}),
	]);
	const loaded = await handler<{ attemptKey: string }, unknown>(loadInput)(
		{ db },
		{ attemptKey: "request-1" },
	);
	expect(loaded).toEqual(
		expect.objectContaining({
			kind: "Generate",
			reading: expect.objectContaining({ emojiDescription: "🏦" }),
			markedContext: expect.any(String),
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
				knowledge: {},
				status: "Full",
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
		{ attemptKey: string; plan: unknown; generatedChanges: unknown[] },
		{ status: string }
	>(commitGenerated)(
		{ db },
		{
			attemptKey: "attempt-1",
			plan: { baseRevision: "convex-0", changes: [{}] },
			generatedChanges: [{ kind: "SetDefinition" }],
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
		generationRequestFor({
			lemma: {
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Bank",
				coreFeatures: { gender: "Fem", hyph: null },
			},
			emojiDescription: "🏦",
		}).definition,
	).toBeNull();
});
