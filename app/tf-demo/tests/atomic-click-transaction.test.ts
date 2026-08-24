import { expect, test } from "bun:test";
import type { DumdictPlan } from "dumdict";
import { makeSurfaceId } from "dumdict";
import { readingFingerprint } from "dumling";
import { fixedMembersFor } from "dumling/fixed";
import { persistResolvedClick } from "../convex/persistence";
import { lemmaIdentityKey } from "../server/linguisticIdentity";

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

async function runTransaction(db: TransactionalDb, args: unknown) {
	const draft = db.fork();
	const result = await handler({ db: draft }, args);
	db.adopt(draft);
	return result;
}

const lemma = {
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
} as const;
const reading = { lemma, emojiDescription: "🏦" } as const;
const surface = {
	language: "de",
	normalizedSurface: "Banken",
	spelling: "Canonical",
	surfaceKind: "Inflection",
	surfaceFeatures: null,
	inflectionalFeatures: { case: "Nom", number: "Plur" },
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
				members: [{ attested: "Banken", orthography: "Standard" }],
				realizationCoverage: "Full",
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
			surfaceKind: surface.surfaceKind,
			surfaceFeatures: surface.surfaceFeatures,
			inflectionalFeatures: surface.inflectionalFeatures,
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

test("ordinary persistence stores every jemand case Surface under the one fixed Lemma", async () => {
	const jemandLemma = fixedMembersFor
		.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
		?.members.find(
			(candidate) =>
				candidate.canonicalForm === "jemand" &&
				candidate.coreFeatures.pronType === "Ind",
		);
	if (!jemandLemma) throw new Error("Expected fixed jemand Lemma.");
	const jemandReading = fixedMembersFor.reading(jemandLemma)?.members[0];
	if (!jemandReading) throw new Error("Expected fixed jemand Reading.");
	const cases = {
		jemand: "Nom",
		jemanden: "Acc",
		jemandem: "Dat",
		jemandes: "Gen",
	} as const;

	for (const [normalizedSurface, grammaticalCase] of Object.entries(cases)) {
		const jemandSurface = {
			language: "de",
			normalizedSurface,
			spelling: "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: null,
			inflectionalFeatures: {
				case: grammaticalCase,
				gender: null,
				number: "Sing",
				reflex: null,
			},
			lemma: jemandLemma,
		} as const;
		const jemandLemmaKey = lemmaIdentityKey(jemandLemma);
		const jemandReadingKey = readingFingerprint(jemandReading);
		const jemandSurfaceKey = makeSurfaceId("de", jemandSurface);
		const revision = "convex-0" as DumdictPlan<"de">["baseRevision"];
		const plan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "createOwnedSurface",
					entry: {
						id: jemandSurfaceKey,
						surface: jemandSurface,
						ownerLemma: jemandLemma,
						...note,
					},
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: jemandReading },
						{ kind: "lemmaExists", lemma: jemandLemma },
						{ kind: "surfaceMissing", surfaceId: jemandSurfaceKey },
					],
				},
			],
		};
		const seed: Record<string, readonly Row[]> = {
			dictionaryState: [
				{ _id: "dictionary-state-1", key: "global", revision: 0 },
			],
			sentences: [
				{
					_id: "sentence-1",
					segmentedSentenceId: "segmented-1",
				},
			],
			segments: [
				{
					_id: "segment-1",
					sentenceId: "sentence-1",
					index: 0,
					kind: "ResolvableText",
					text: normalizedSurface,
				},
			],
			lemmas: [
				{
					_id: "lemma-jemand",
					lemmaKey: jemandLemmaKey,
					...jemandLemma,
				},
			],
			dictionaryLemmas: [
				{ _id: "dictionary-lemma-jemand", lemmaId: "lemma-jemand" },
			],
			readings: [
				{
					_id: "reading-jemand",
					readingKey: jemandReadingKey,
					lemmaId: "lemma-jemand",
					emojiDescription: jemandReading.emojiDescription,
				},
			],
			readingEntries: [
				{
					_id: "reading-entry-jemand",
					readingId: "reading-jemand",
					record: note,
				},
			],
		};
		const db = new TransactionalDb(seed);

		await runTransaction(db, {
			requestId: `request-${normalizedSurface}`,
			visitorId: "visitor-1",
			sentenceId: "sentence-1",
			clickedSegmentIndex: 0,
			reading: jemandReading,
			readingKey: jemandReadingKey,
			dictionaryPlan: plan,
			occurrence: {
				memberSegmentIndices: [0],
				attestation: {
					members: [
						{
							attested: normalizedSurface,
							orthography: "Standard",
						},
					],
					realizationCoverage: "Full",
					surface: jemandSurface,
				},
				surfaceKey: jemandSurfaceKey,
				lemmaKey: jemandLemmaKey,
			},
		});

		expect(db.rows("lemmas")).toHaveLength(1);
		expect(db.rows("readings")).toHaveLength(1);
		expect(db.rows("surfaces")).toEqual([
			expect.objectContaining({
				lemmaId: "lemma-jemand",
				normalizedSurface,
				inflectionalFeatures: expect.objectContaining({
					case: grammaticalCase,
					number: "Sing",
				}),
			}),
		]);
		expect(db.rows("attestations")).toEqual([
			expect.objectContaining({
				readingId: "reading-jemand",
			}),
		]);
	}
});

test("ordinary persistence stores every niemand case Surface under the one fixed Lemma", async () => {
	const niemandLemma = fixedMembersFor
		.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
		?.members.find(
			(candidate) =>
				candidate.canonicalForm === "niemand" &&
				candidate.coreFeatures.pronType === "Neg",
		);
	if (!niemandLemma) throw new Error("Expected fixed niemand Lemma.");
	const niemandReading = fixedMembersFor.reading(niemandLemma)?.members[0];
	if (!niemandReading) throw new Error("Expected fixed niemand Reading.");
	const cases = {
		niemand: "Nom",
		niemanden: "Acc",
		niemandem: "Dat",
		niemandes: "Gen",
	} as const;

	for (const [normalizedSurface, grammaticalCase] of Object.entries(cases)) {
		const niemandSurface = {
			language: "de",
			normalizedSurface,
			spelling: "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: null,
			inflectionalFeatures: {
				case: grammaticalCase,
				gender: null,
				number: "Sing",
				reflex: null,
			},
			lemma: niemandLemma,
		} as const;
		const niemandLemmaKey = lemmaIdentityKey(niemandLemma);
		const niemandReadingKey = readingFingerprint(niemandReading);
		const niemandSurfaceKey = makeSurfaceId("de", niemandSurface);
		const revision = "convex-0" as DumdictPlan<"de">["baseRevision"];
		const plan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "createOwnedSurface",
					entry: {
						id: niemandSurfaceKey,
						surface: niemandSurface,
						ownerLemma: niemandLemma,
						...note,
					},
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: niemandReading },
						{ kind: "lemmaExists", lemma: niemandLemma },
						{
							kind: "surfaceMissing",
							surfaceId: niemandSurfaceKey,
						},
					],
				},
			],
		};
		const seed: Record<string, readonly Row[]> = {
			dictionaryState: [
				{ _id: "dictionary-state-1", key: "global", revision: 0 },
			],
			sentences: [
				{
					_id: "sentence-1",
					segmentedSentenceId: "segmented-1",
				},
			],
			segments: [
				{
					_id: "segment-1",
					sentenceId: "sentence-1",
					index: 0,
					kind: "ResolvableText",
					text: normalizedSurface,
				},
			],
			lemmas: [
				{
					_id: "lemma-niemand",
					lemmaKey: niemandLemmaKey,
					...niemandLemma,
				},
			],
			dictionaryLemmas: [
				{ _id: "dictionary-lemma-niemand", lemmaId: "lemma-niemand" },
			],
			readings: [
				{
					_id: "reading-niemand",
					readingKey: niemandReadingKey,
					lemmaId: "lemma-niemand",
					emojiDescription: niemandReading.emojiDescription,
				},
			],
			readingEntries: [
				{
					_id: "reading-entry-niemand",
					readingId: "reading-niemand",
					record: note,
				},
			],
		};
		const db = new TransactionalDb(seed);

		await runTransaction(db, {
			requestId: `request-${normalizedSurface}`,
			visitorId: "visitor-1",
			sentenceId: "sentence-1",
			clickedSegmentIndex: 0,
			reading: niemandReading,
			readingKey: niemandReadingKey,
			dictionaryPlan: plan,
			occurrence: {
				memberSegmentIndices: [0],
				attestation: {
					members: [
						{
							attested: normalizedSurface,
							orthography: "Standard",
						},
					],
					realizationCoverage: "Full",
					surface: niemandSurface,
				},
				surfaceKey: niemandSurfaceKey,
				lemmaKey: niemandLemmaKey,
			},
		});

		expect(db.rows("lemmas")).toHaveLength(1);
		expect(db.rows("readings")).toHaveLength(1);
		expect(db.rows("surfaces")).toEqual([
			expect.objectContaining({
				lemmaId: "lemma-niemand",
				normalizedSurface,
				inflectionalFeatures: expect.objectContaining({
					case: grammaticalCase,
					number: "Sing",
				}),
			}),
		]);
		expect(db.rows("attestations")).toEqual([
			expect.objectContaining({
				readingId: "reading-niemand",
			}),
		]);
	}
});

test("persistence keys preserve all sixteen syncretic keiner Surface analyses", () => {
	const keiner = fixedMembersFor
		.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
		?.members.find(({ canonicalForm }) => canonicalForm === "keiner");
	if (!keiner) throw new Error("Expected fixed keiner Lemma.");
	const slots = [
		["keiner", "Nom", "Masc", "Sing"],
		["keine", "Nom", "Fem", "Sing"],
		["keines", "Nom", "Neut", "Sing"],
		["keinen", "Acc", "Masc", "Sing"],
		["keine", "Acc", "Fem", "Sing"],
		["keines", "Acc", "Neut", "Sing"],
		["keinem", "Dat", "Masc", "Sing"],
		["keiner", "Dat", "Fem", "Sing"],
		["keinem", "Dat", "Neut", "Sing"],
		["keines", "Gen", "Masc", "Sing"],
		["keiner", "Gen", "Fem", "Sing"],
		["keines", "Gen", "Neut", "Sing"],
		["keine", "Nom", null, "Plur"],
		["keine", "Acc", null, "Plur"],
		["keinen", "Dat", null, "Plur"],
		["keiner", "Gen", null, "Plur"],
	] as const;
	const keys = slots.map(
		([normalizedSurface, grammaticalCase, gender, number]) =>
			makeSurfaceId("de", {
				language: "de",
				normalizedSurface,
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: grammaticalCase,
					gender,
					number,
					reflex: null,
				},
				lemma: keiner,
			}),
	);
	expect(new Set(keys).size).toBe(16);
});

test("persistence keys distinguish all four jedermann case analyses", () => {
	const lemma = fixedMembersFor
		.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
		?.members.find(({ canonicalForm }) => canonicalForm === "jedermann");
	if (!lemma) throw new Error("Expected fixed jedermann Lemma.");
	const keys = (["Nom", "Acc", "Dat", "Gen"] as const).map(
		(grammaticalCase) =>
			makeSurfaceId("de", {
				language: "de",
				normalizedSurface:
					grammaticalCase === "Gen" ? "jedermanns" : "jedermann",
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: grammaticalCase,
					gender: null,
					number: "Sing",
					reflex: null,
				},
				lemma,
			}),
	);
	expect(new Set(keys).size).toBe(4);
});

test("persistence keys preserve all sixteen mancher Surface analyses", () => {
	const lemma = fixedMembersFor
		.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
		?.members.find(({ canonicalForm }) => canonicalForm === "mancher");
	if (!lemma) throw new Error("Expected fixed mancher Lemma.");
	const slots = [
		["mancher", "Nom", "Masc", "Sing"],
		["manche", "Nom", "Fem", "Sing"],
		["manches", "Nom", "Neut", "Sing"],
		["manchen", "Acc", "Masc", "Sing"],
		["manche", "Acc", "Fem", "Sing"],
		["manches", "Acc", "Neut", "Sing"],
		["manchem", "Dat", "Masc", "Sing"],
		["mancher", "Dat", "Fem", "Sing"],
		["manchem", "Dat", "Neut", "Sing"],
		["manches", "Gen", "Masc", "Sing"],
		["mancher", "Gen", "Fem", "Sing"],
		["manches", "Gen", "Neut", "Sing"],
		["manche", "Nom", null, "Plur"],
		["manche", "Acc", null, "Plur"],
		["manchen", "Dat", null, "Plur"],
		["mancher", "Gen", null, "Plur"],
	] as const;
	const keys = slots.map(
		([normalizedSurface, grammaticalCase, gender, number]) =>
			makeSurfaceId("de", {
				language: "de",
				normalizedSurface,
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: grammaticalCase,
					gender,
					number,
					reflex: null,
				},
				lemma,
			}),
	);
	expect(new Set(keys).size).toBe(16);
});

test("ordinary persistence keeps canonical nichts and Variant nix under one fixed Lemma", async () => {
	const nichtsLemma = fixedMembersFor
		.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
		?.members.find(
			(candidate) =>
				candidate.canonicalForm === "nichts" &&
				candidate.coreFeatures.pronType === "Neg",
		);
	if (!nichtsLemma) throw new Error("Expected fixed nichts Lemma.");
	const nichtsReading = fixedMembersFor.reading(nichtsLemma)?.members[0];
	if (!nichtsReading) throw new Error("Expected fixed nichts Reading.");

	for (const [normalizedSurface, spelling] of [
		["nichts", "Canonical"],
		["nix", "Variant"],
	] as const) {
		const nichtsSurface = {
			language: "de",
			normalizedSurface,
			spelling,
			surfaceKind: "Citation",
			surfaceFeatures: null,
			lemma: nichtsLemma,
		} as const;
		const nichtsLemmaKey = lemmaIdentityKey(nichtsLemma);
		const nichtsReadingKey = readingFingerprint(nichtsReading);
		const nichtsSurfaceKey = makeSurfaceId("de", nichtsSurface);
		const revision = "convex-0" as DumdictPlan<"de">["baseRevision"];
		const plan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "createOwnedSurface",
					entry: {
						id: nichtsSurfaceKey,
						surface: nichtsSurface,
						ownerLemma: nichtsLemma,
						...note,
					},
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: nichtsReading },
						{ kind: "lemmaExists", lemma: nichtsLemma },
						{ kind: "surfaceMissing", surfaceId: nichtsSurfaceKey },
					],
				},
			],
		};
		const db = new TransactionalDb({
			dictionaryState: [
				{ _id: "dictionary-state-1", key: "global", revision: 0 },
			],
			sentences: [
				{
					_id: "sentence-1",
					segmentedSentenceId: "segmented-1",
				},
			],
			segments: [
				{
					_id: "segment-1",
					sentenceId: "sentence-1",
					index: 0,
					kind: "ResolvableText",
					text: normalizedSurface,
				},
			],
			lemmas: [
				{
					_id: "lemma-nichts",
					lemmaKey: nichtsLemmaKey,
					...nichtsLemma,
				},
			],
			dictionaryLemmas: [
				{ _id: "dictionary-lemma-nichts", lemmaId: "lemma-nichts" },
			],
			readings: [
				{
					_id: "reading-nichts",
					readingKey: nichtsReadingKey,
					lemmaId: "lemma-nichts",
					emojiDescription: nichtsReading.emojiDescription,
				},
			],
			readingEntries: [
				{
					_id: "reading-entry-nichts",
					readingId: "reading-nichts",
					record: note,
				},
			],
		});

		await runTransaction(db, {
			requestId: `request-${normalizedSurface}`,
			visitorId: "visitor-1",
			sentenceId: "sentence-1",
			clickedSegmentIndex: 0,
			reading: nichtsReading,
			readingKey: nichtsReadingKey,
			dictionaryPlan: plan,
			occurrence: {
				memberSegmentIndices: [0],
				attestation: {
					members: [
						{
							attested: normalizedSurface,
							orthography: "Standard",
						},
					],
					realizationCoverage: "Full",
					surface: nichtsSurface,
				},
				surfaceKey: nichtsSurfaceKey,
				lemmaKey: nichtsLemmaKey,
			},
		});

		expect(db.rows("lemmas")).toHaveLength(1);
		expect(db.rows("readings")).toHaveLength(1);
		expect(db.rows("surfaces")).toEqual([
			expect.objectContaining({
				lemmaId: "lemma-nichts",
				normalizedSurface,
				spelling,
				surfaceKind: "Citation",
			}),
		]);
		expect(db.rows("surfaces")[0]).not.toHaveProperty(
			"inflectionalFeatures",
		);
		expect(db.rows("attestations")).toEqual([
			expect.objectContaining({ readingId: "reading-nichts" }),
		]);
	}
});

test("ordinary persistence keeps all twelve jeder analyses as distinct Surfaces", async () => {
	const jederLemma = fixedMembersFor
		.lemma({ language: "de", family: "Lexeme", kind: "PRON" })
		?.members.find(
			(candidate) =>
				candidate.canonicalForm === "jeder" &&
				candidate.coreFeatures.pronType === "Tot",
		);
	if (!jederLemma) throw new Error("Expected fixed jeder Lemma.");
	const jederReading = fixedMembersFor.reading(jederLemma)?.members[0];
	if (!jederReading) throw new Error("Expected fixed jeder Reading.");
	const slots = [
		["jeder", "Nom", "Masc"],
		["jede", "Nom", "Fem"],
		["jedes", "Nom", "Neut"],
		["jeden", "Acc", "Masc"],
		["jede", "Acc", "Fem"],
		["jedes", "Acc", "Neut"],
		["jedem", "Dat", "Masc"],
		["jeder", "Dat", "Fem"],
		["jedem", "Dat", "Neut"],
		["jedes", "Gen", "Masc"],
		["jeder", "Gen", "Fem"],
		["jedes", "Gen", "Neut"],
	] as const;
	const persistedIds = new Set<string>();
	for (const [normalizedSurface, grammaticalCase, gender] of slots) {
		const jederSurface = {
			language: "de",
			normalizedSurface,
			spelling: "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: null,
			inflectionalFeatures: {
				case: grammaticalCase,
				gender,
				number: "Sing",
				reflex: null,
			},
			lemma: jederLemma,
		} as const;
		const lemmaKey = lemmaIdentityKey(jederLemma);
		const readingKey = readingFingerprint(jederReading);
		const surfaceKey = makeSurfaceId("de", jederSurface);
		const revision = "convex-0" as DumdictPlan<"de">["baseRevision"];
		const plan: DumdictPlan<"de"> = {
			baseRevision: revision,
			changes: [
				{
					type: "createOwnedSurface",
					entry: {
						id: surfaceKey,
						surface: jederSurface,
						ownerLemma: jederLemma,
						...note,
					},
					preconditions: [
						{ kind: "revisionMatches", revision },
						{ kind: "readingExists", reading: jederReading },
						{ kind: "lemmaExists", lemma: jederLemma },
						{ kind: "surfaceMissing", surfaceId: surfaceKey },
					],
				},
			],
		};
		const db = new TransactionalDb({
			dictionaryState: [
				{ _id: "dictionary-state-1", key: "global", revision: 0 },
			],
			sentences: [
				{ _id: "sentence-1", segmentedSentenceId: "segmented-1" },
			],
			segments: [
				{
					_id: "segment-1",
					sentenceId: "sentence-1",
					index: 0,
					kind: "ResolvableText",
					text: normalizedSurface,
				},
			],
			lemmas: [{ _id: "lemma-jeder", lemmaKey, ...jederLemma }],
			dictionaryLemmas: [
				{ _id: "dictionary-lemma-jeder", lemmaId: "lemma-jeder" },
			],
			readings: [
				{
					_id: "reading-jeder",
					readingKey,
					lemmaId: "lemma-jeder",
					emojiDescription: jederReading.emojiDescription,
				},
			],
			readingEntries: [
				{
					_id: "reading-entry-jeder",
					readingId: "reading-jeder",
					record: note,
				},
			],
		});
		await runTransaction(db, {
			requestId: `request-${grammaticalCase}-${gender}`,
			visitorId: "visitor-1",
			sentenceId: "sentence-1",
			clickedSegmentIndex: 0,
			reading: jederReading,
			readingKey,
			dictionaryPlan: plan,
			occurrence: {
				memberSegmentIndices: [0],
				attestation: {
					members: [
						{
							attested: normalizedSurface,
							orthography: "Standard",
						},
					],
					realizationCoverage: "Full",
					surface: jederSurface,
				},
				surfaceKey,
				lemmaKey,
			},
		});
		persistedIds.add(surfaceKey);
		expect(db.rows("surfaces")).toEqual([
			expect.objectContaining({
				lemmaId: "lemma-jeder",
				normalizedSurface,
				inflectionalFeatures: {
					case: grammaticalCase,
					gender,
					number: "Sing",
					reflex: null,
				},
			}),
		]);
	}
	expect(persistedIds.size).toBe(12);
});

test("persistence keys keep jedweder Surfaces distinct from each other and from jeder", () => {
	const catalog = fixedMembersFor.lemma({
		language: "de",
		family: "Lexeme",
		kind: "PRON",
	});
	const jedweder = catalog?.members.find(
		({ canonicalForm }) => canonicalForm === "jedweder",
	);
	const jeder = catalog?.members.find(
		({ canonicalForm }) => canonicalForm === "jeder",
	);
	if (!jedweder || !jeder)
		throw new Error("Expected fixed total PRON Lemmas.");
	const slots = [
		["jedweder", "Nom", "Masc"],
		["jedwede", "Nom", "Fem"],
		["jedwedes", "Nom", "Neut"],
		["jedweden", "Acc", "Masc"],
		["jedwede", "Acc", "Fem"],
		["jedwedes", "Acc", "Neut"],
		["jedwedem", "Dat", "Masc"],
		["jedweder", "Dat", "Fem"],
		["jedwedem", "Dat", "Neut"],
		["jedwedes", "Gen", "Masc"],
		["jedweder", "Gen", "Fem"],
		["jedwedes", "Gen", "Neut"],
	] as const;
	const ids = slots.map(([normalizedSurface, grammaticalCase, gender]) =>
		makeSurfaceId("de", {
			language: "de",
			normalizedSurface,
			spelling: "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: null,
			inflectionalFeatures: {
				case: grammaticalCase,
				gender,
				number: "Sing",
				reflex: null,
			},
			lemma: jedweder,
		}),
	);
	expect(new Set(ids).size).toBe(12);
	expect(ids).not.toContain(
		makeSurfaceId("de", {
			language: "de",
			normalizedSurface: "jeder",
			spelling: "Canonical",
			surfaceKind: "Inflection",
			surfaceFeatures: null,
			inflectionalFeatures: {
				case: "Nom",
				gender: "Masc",
				number: "Sing",
				reflex: null,
			},
			lemma: jeder,
		}),
	);
});

test("persistence keys preserve all sixteen jeglicher analyses without merging synonyms", () => {
	const catalog = fixedMembersFor.lemma({
		language: "de",
		family: "Lexeme",
		kind: "PRON",
	});
	const lemma = catalog?.members.find(
		({ canonicalForm }) => canonicalForm === "jeglicher",
	);
	if (!lemma) throw new Error("Expected fixed jeglicher Lemma.");
	const slots = [
		["jeglicher", "Nom", "Masc", "Sing"],
		["jegliche", "Nom", "Fem", "Sing"],
		["jegliches", "Nom", "Neut", "Sing"],
		["jeglichen", "Acc", "Masc", "Sing"],
		["jegliche", "Acc", "Fem", "Sing"],
		["jegliches", "Acc", "Neut", "Sing"],
		["jeglichem", "Dat", "Masc", "Sing"],
		["jeglicher", "Dat", "Fem", "Sing"],
		["jeglichem", "Dat", "Neut", "Sing"],
		["jegliches", "Gen", "Masc", "Sing"],
		["jeglicher", "Gen", "Fem", "Sing"],
		["jegliches", "Gen", "Neut", "Sing"],
		["jegliche", "Nom", null, "Plur"],
		["jegliche", "Acc", null, "Plur"],
		["jeglichen", "Dat", null, "Plur"],
		["jeglicher", "Gen", null, "Plur"],
	] as const;
	const ids = slots.map(
		([normalizedSurface, grammaticalCase, gender, number]) =>
			makeSurfaceId("de", {
				language: "de",
				normalizedSurface,
				spelling: "Canonical",
				surfaceKind: "Inflection",
				surfaceFeatures: null,
				inflectionalFeatures: {
					case: grammaticalCase,
					gender,
					number,
					reflex: null,
				},
				lemma,
			}),
	);
	expect(new Set(ids).size).toBe(16);
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
