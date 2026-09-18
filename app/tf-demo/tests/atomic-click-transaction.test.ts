import { expect, test } from "bun:test";
import type { DumdictPlan } from "dumdict";
import { makeSurfaceId } from "dumdict";
import { persistResolvedClick } from "../convex/persistence";
import {
	lemmaIdentityKey,
	readingIdentityKey as readingFingerprint,
} from "../server/linguisticIdentity";

type Row = Record<string, unknown> & { _id: string };

function nestedValue(row: Row, path: string): unknown {
	return path.split(".").reduce<unknown>((value, key) => {
		if (value === null || typeof value !== "object") return undefined;
		return (value as Record<string, unknown>)[key];
	}, row);
}

class TransactionalDb {
	private tables = new Map<string, Map<string, Row>>();
	private nextId = 1;

	constructor(seed: Record<string, readonly Row[]> = {}) {
		for (const [table, rows] of Object.entries(seed)) {
			this.tables.set(
				table,
				new Map(rows.map((row) => [row._id, structuredClone(row)])),
			);
		}
	}

	fork(): TransactionalDb {
		const copy = new TransactionalDb(this.snapshot());
		copy.nextId = this.nextId;
		return copy;
	}

	adopt(committed: TransactionalDb): void {
		this.tables = committed.tables;
		this.nextId = committed.nextId;
	}

	snapshot(): Record<string, Row[]> {
		return Object.fromEntries(
			[...this.tables].map(([table, rows]) => [
				table,
				[...rows.values()].map((row) => structuredClone(row)),
			]),
		);
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
		const conditions: Array<[string, unknown]> = [];
		const range = {
			eq(field: string, value: unknown) {
				conditions.push([field, value]);
				return range;
			},
		};
		const matches = () =>
			this.rows(table).filter((row) =>
				conditions.every(
					([field, value]) => nestedValue(row, field) === value,
				),
			);
		return {
			withIndex(_name: string, build: (value: typeof range) => unknown) {
				build(range);
				return {
					async unique() {
						const rows = matches();
						if (rows.length > 1)
							throw new Error("Expected a unique row.");
						return rows[0] ?? null;
					},
					async take(limit: number) {
						return matches().slice(0, limit);
					},
				};
			},
		};
	}

	async insert(
		table: string,
		value: Record<string, unknown>,
	): Promise<string> {
		const id = `${table}-${this.nextId++}`;
		const rows = this.tables.get(table) ?? new Map<string, Row>();
		rows.set(id, { _id: id, ...structuredClone(value) });
		this.tables.set(table, rows);
		return id;
	}

	async patch(id: string, value: Record<string, unknown>): Promise<void> {
		for (const rows of this.tables.values()) {
			const row = rows.get(id);
			if (!row) continue;
			rows.set(id, { ...row, ...structuredClone(value) });
			return;
		}
		throw new Error(`Cannot patch missing row ${id}.`);
	}
}

const handler = (
	persistResolvedClick as unknown as {
		_handler: (ctx: unknown, args: unknown) => Promise<unknown>;
	}
)._handler;

async function runTransaction(
	db: TransactionalDb,
	args: unknown,
	scheduler?: { runAfter: (...args: unknown[]) => Promise<void> },
) {
	const draft = db.fork();
	const result = await handler({ db: draft, scheduler }, args);
	db.adopt(draft);
	return result;
}

const lemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
} as const;
const reading = { unitKind: "Reading", lemma, emojiDescription: "🏦" } as const;
const surface = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "Banken",
	spelling: "Canonical",

	surfaceFeatures: null,
	inflectionalFeatures: { case: "Nom", number: "Plur", article: null },
	articleReference: null,
	lemma,
} as const;
const lemmaKey = lemmaIdentityKey(lemma);
const readingKey = readingFingerprint(reading);
const surfaceKey = makeSurfaceId("de", surface);
const note = { attestedTranslations: [], attestations: [], notes: "" };

function newReadingPlan(): DumdictPlan<"de"> {
	const revision = "convex-0" as DumdictPlan<"de">["baseRevision"];
	return {
		baseRevision: revision,
		changes: [
			{
				type: "createLemma",
				record: { lemma },
				preconditions: [
					{ kind: "revisionMatches", revision },
					{ kind: "lemmaMissing", lemma },
				],
			},
			{
				type: "createReading",
				entry: { reading, ...note },
				preconditions: [
					{ kind: "revisionMatches", revision },
					{ kind: "lemmaExists", lemma },
					{ kind: "readingMissing", reading },
				],
			},
			{
				type: "createOwnedSurface",
				entry: {
					id: surfaceKey,
					surface,
					ownerLemma: lemma,
					...note,
				},
				preconditions: [
					{ kind: "revisionMatches", revision },
					{ kind: "lemmaExists", lemma },
					{ kind: "surfaceMissing", surfaceId: surfaceKey },
				],
			},
		],
	};
}

function clickArgs(plan: DumdictPlan<"de">) {
	return {
		requestId: "request-1",
		visitorId: "visitor-1",
		sentenceId: "sentence-1",
		clickedSegmentIndex: 0,
		reading,
		readingKey,
		dictionaryPlan: {
			baseRevision: plan.baseRevision,
			changes: [...plan.changes],
		},
		occurrence: {
			memberSegmentIndices: [0],
			attestation: {
				unitKind: "Attestation",
				members: [{ attested: "Banken", orthography: "Standard" }],
				realizationCoverage: "Full",
				articleEvidence: null,
				surface,
			},
			surfaceKey,
			lemmaKey,
		},
	};
}

function sourceSeed(): Record<string, readonly Row[]> {
	return {
		sentences: [
			{
				_id: "sentence-1",
				segmentedSentenceId: "segmented-1",
				language: "de",
			},
		],
		segments: [
			{
				_id: "segment-1",
				sentenceId: "sentence-1",
				index: 0,
				kind: "ResolvableText",
				text: "Banken",
			},
		],
	};
}

test("a non-empty New plan commits dictionary, occurrence membership, and Click in one transaction", async () => {
	const db = new TransactionalDb(sourceSeed());
	const result = await runTransaction(db, clickArgs(newReadingPlan()));

	expect(result).toMatchObject({ status: "Committed", deduplicated: false });
	expect(db.rows("lemmas")).toHaveLength(1);
	expect(db.rows("readings")).toHaveLength(1);
	expect(db.rows("surfaces")).toHaveLength(1);
	expect(db.rows("attestations")).toHaveLength(1);
	expect(db.rows("visitorClicks")).toHaveLength(1);
	expect(db.rows("dictionaryState")[0]?.revision).toBe(1);
	expect(db.rows("segments")[0]?.attestationMembership).toMatchObject({
		orthography: "Standard",
	});
});

test("Knowledge drafts follow the committed occurrence and a late writer cannot replace them", async () => {
	const db = new TransactionalDb(sourceSeed());
	const scheduled: unknown[][] = [];
	const scheduler = {
		async runAfter(...args: unknown[]) {
			scheduled.push(args);
		},
	};
	const knowledgeDraftJson = JSON.stringify({
		sourceFingerprint: "original",
		texts: [],
	});
	const args = { ...clickArgs(newReadingPlan()), knowledgeDraftJson };
	await runTransaction(db, args, scheduler);
	expect(db.rows("knowledgeGenerationAttempts")).toEqual([
		expect.objectContaining({
			knowledgeDraftJson,
			readingId: db.rows("readings")[0]?._id,
		}),
	]);
	const late = await runTransaction(
		db,
		{
			...args,
			requestId: "late-writer",
			knowledgeDraftJson: JSON.stringify({
				sourceFingerprint: "late",
				texts: [],
			}),
		},
		scheduler,
	);
	expect(late).toMatchObject({ status: "Reused" });
	expect(
		db
			.rows("knowledgeGenerationAttempts")
			.find((row) => row.attemptKey === "late-writer")
			?.knowledgeDraftJson,
	).toBeUndefined();
	expect(db.rows("knowledgeGenerationAttempts")[0]?.knowledgeDraftJson).toBe(
		knowledgeDraftJson,
	);
	expect(scheduled).toHaveLength(1);
});

test("a New plan adopts canonical-only Lemma, Reading, and Surface rows", async () => {
	const seed = sourceSeed();
	seed.lemmas = [{ _id: "lemma-canonical", lemmaKey, ...lemma }];
	seed.readings = [
		{
			_id: "reading-canonical",
			readingKey,
			lemmaId: "lemma-canonical",
			emojiDescription: reading.emojiDescription,
		},
	];
	seed.surfaces = [
		{
			_id: "surface-canonical",
			surfaceKey,
			lemmaId: "lemma-canonical",
			language: surface.language,
			normalizedSurface: surface.normalizedSurface,
			spelling: surface.spelling,
			surfaceFeatures: surface.surfaceFeatures,
			inflectionalFeatures: surface.inflectionalFeatures,
			articleReference: surface.articleReference,
		},
	];
	const db = new TransactionalDb(seed);

	const result = await runTransaction(db, clickArgs(newReadingPlan()));

	expect(result).toMatchObject({
		status: "Committed",
		readingId: "reading-canonical",
	});
	expect(db.rows("lemmas")).toHaveLength(1);
	expect(db.rows("readings")).toHaveLength(1);
	expect(db.rows("surfaces")).toHaveLength(1);
	expect(db.rows("dictionaryLemmas")).toEqual([
		expect.objectContaining({ lemmaId: "lemma-canonical" }),
	]);
	expect(db.rows("readingEntries")).toEqual([
		expect.objectContaining({ readingId: "reading-canonical" }),
	]);
	expect(db.rows("ownedSurfaces")).toEqual([
		expect.objectContaining({ surfaceId: "surface-canonical" }),
	]);
	expect(db.rows("attestations")[0]).toMatchObject({
		readingId: "reading-canonical",
		surfaceId: "surface-canonical",
	});
});

test("a Reuse plan creates a previously unseen Surface in the occurrence transaction", async () => {
	const seed = sourceSeed();
	seed.dictionaryState = [
		{ _id: "dictionary-state-1", key: "global", revision: 0 },
	];
	seed.lemmas = [{ _id: "lemma-1", lemmaKey, ...lemma }];
	seed.dictionaryLemmas = [{ _id: "dictionary-lemma-1", lemmaId: "lemma-1" }];
	seed.readings = [
		{
			_id: "reading-1",
			readingKey,
			lemmaId: "lemma-1",
			emojiDescription: reading.emojiDescription,
		},
	];
	seed.readingEntries = [
		{ _id: "reading-entry-1", readingId: "reading-1", record: note },
	];
	const db = new TransactionalDb(seed);
	const revision = "convex-0" as DumdictPlan<"de">["baseRevision"];
	const plan: DumdictPlan<"de"> = {
		baseRevision: revision,
		changes: [
			{
				type: "createOwnedSurface",
				entry: {
					id: surfaceKey,
					surface,
					ownerLemma: lemma,
					...note,
				},
				preconditions: [
					{ kind: "revisionMatches", revision },
					{ kind: "readingExists", reading },
					{ kind: "lemmaExists", lemma },
					{ kind: "surfaceMissing", surfaceId: surfaceKey },
				],
			},
		],
	};

	const result = await runTransaction(db, clickArgs(plan));

	expect(result).toMatchObject({
		status: "Committed",
		readingId: "reading-1",
	});
	expect(db.rows("readings")).toHaveLength(1);
	expect(db.rows("surfaces")).toHaveLength(1);
	expect(db.rows("ownedSurfaces")).toHaveLength(1);
	expect(db.rows("attestations")[0]?.readingId).toBe("reading-1");
	expect(db.rows("dictionaryState")[0]?.revision).toBe(1);
});

test("a post-plan host failure rolls back dictionary and occurrence writes", async () => {
	const db = new TransactionalDb(sourceSeed());
	const before = db.snapshot();
	const plan = newReadingPlan();
	const args = clickArgs({
		...plan,
		changes: plan.changes.filter(
			(change) => change.type !== "createOwnedSurface",
		),
	});

	await expect(runTransaction(db, args)).rejects.toThrow(
		"Canonical Lemma, Surface, and Reading must be committed first.",
	);
	expect(db.snapshot()).toEqual(before);
	expect(db.rows("dictionaryState")).toEqual([]);
	expect(db.rows("attestations")).toEqual([]);
	expect(db.rows("visitorClicks")).toEqual([]);
});

test("an unknown surfaceKey is rejected without durable writes", async () => {
	const db = new TransactionalDb(sourceSeed());
	const before = db.snapshot();
	const args = clickArgs(newReadingPlan());
	args.occurrence.surfaceKey = makeSurfaceId("de", {
		...surface,
		normalizedSurface: "Bank",
	});

	await expect(runTransaction(db, args)).rejects.toThrow(
		"Canonical Lemma, Surface, and Reading must be committed first.",
	);
	expect(db.snapshot()).toEqual(before);
});

test("a readingKey for a different Reading is rejected without durable writes", async () => {
	const db = new TransactionalDb(sourceSeed());
	const before = db.snapshot();
	const args = clickArgs(newReadingPlan());
	args.readingKey = readingFingerprint({
		...reading,
		emojiDescription: "🏧",
	});

	await expect(runTransaction(db, args)).rejects.toThrow(
		"readingKey does not match the selected Reading identity.",
	);
	expect(db.snapshot()).toEqual(before);
});

test("a noun article materializes its Reading without a second occurrence", async () => {
	const articleLemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "DET",
		canonicalForm: "die",
		coreFeatures: {
			definite: "Def",
			extPos: null,
			foreign: null,
			numType: null,
			person: null,
			polite: null,
			poss: null,
			pronType: "Art",
		},
	} as const;
	const articleReading = {
		unitKind: "Reading",
		lemma: articleLemma,
		emojiDescription: "👉",
	} as const;
	const articleReference = {
		reading: articleReading,
		surface: {
			unitKind: "Surface",
			language: "de",
			lemma: articleLemma,
			normalizedSurface: "die",
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: {
				case: "Nom",
				number: "Plur",
				gender: "Fem",
				degree: null,
				"gender[psor]": null,
				"number[psor]": null,
			},
		},
	} as const;
	const nounSurface = {
		...surface,
		normalizedSurface: "die Banken",
		inflectionalFeatures: {
			...surface.inflectionalFeatures,
			article: "Definite",
		},
		articleReference,
	} as const;
	const nounKey = makeSurfaceId("de", nounSurface);
	const original = newReadingPlan();
	const plan: DumdictPlan<"de"> = {
		...original,
		changes: original.changes.map((change) =>
			change.type === "createOwnedSurface"
				? {
						...change,
						entry: {
							...change.entry,
							id: nounKey,
							surface: nounSurface,
						},
						preconditions: change.preconditions.map((condition) =>
							condition.kind === "surfaceMissing"
								? { ...condition, surfaceId: nounKey }
								: condition,
						),
					}
				: change,
		),
	};
	const seed = sourceSeed();
	seed.segments = [
		{
			_id: "article-segment",
			sentenceId: "sentence-1",
			index: 0,
			kind: "ResolvableText",
			text: "die",
		},
		{
			_id: "noun-segment",
			sentenceId: "sentence-1",
			index: 2,
			kind: "ResolvableText",
			text: "Banken",
		},
	];
	const db = new TransactionalDb(seed);
	const args = clickArgs(plan);
	await runTransaction(db, {
		...args,
		clickedSegmentIndex: 2,
		occurrence: {
			...args.occurrence,
			surfaceKey: nounKey,
			memberSegmentIndices: [0, 2],
			attestation: {
				...args.occurrence.attestation,
				surface: nounSurface,
				articleEvidence: { attested: "die", orthography: "Standard" },
				members: [
					{ attested: "die", orthography: "Standard" },
					{ attested: "Banken", orthography: "Standard" },
				],
			},
		},
	});
	expect(db.rows("lemmas")).toHaveLength(2);
	expect(db.rows("readings")).toHaveLength(2);
	expect(db.rows("surfaces")).toHaveLength(2);
	expect(db.rows("attestations")).toHaveLength(1);
	expect(db.rows("visitorClicks")).toHaveLength(1);
	const attestation = db.rows("attestations")[0]!;
	expect(
		db
			.rows("segments")
			.every(
				(row) =>
					(row.attestationMembership as { attestationId: string })
						.attestationId === attestation._id,
			),
	).toBe(true);
	const component = db
		.rows("readings")
		.find((row) => row.readingKey === readingFingerprint(articleReading));
	expect(component).toBeDefined();
	expect(attestation.readingId).not.toBe(component?._id);
});
