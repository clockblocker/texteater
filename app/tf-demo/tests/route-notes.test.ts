import { expect, test } from "bun:test";

import { get } from "../convex/routeNotes";

type Row = Record<string, unknown> & { _id: string };

class RouteDb {
	readonly indexedQueries: string[] = [];
	readonly paginations: { cursor: string | null; numItems: number }[] = [];
	documentReads = 0;

	constructor(private readonly tables: Record<string, readonly Row[]>) {}

	normalizeId(table: string, id: string) {
		const prefix: Record<string, string> = {
			attestations: "attestation-",
			surfaces: "surface-",
			lemmas: "lemma-",
			readings: "reading-",
		};
		return id.startsWith(prefix[table] ?? `${table}-`) ? id : null;
	}

	async get(id: string) {
		this.documentReads += 1;
		for (const rows of Object.values(this.tables)) {
			const row = rows.find((candidate) => candidate._id === id);
			if (row) return row;
		}
		return null;
	}

	query(table: string) {
		const predicates: Array<(row: Row) => boolean> = [];
		const range = {
			eq(field: string, value: unknown) {
				predicates.push((row) => nestedValue(row, field) === value);
				return range;
			},
		};
		const matches = () =>
			(this.tables[table] ?? []).filter((row) =>
				predicates.every((predicate) => predicate(row)),
			);
		const result = {
			withIndex: (
				index: string,
				build: (value: typeof range) => unknown,
			) => {
				this.indexedQueries.push(`${table}.${index}`);
				build(range);
				return result;
			},
			async take(limit: number) {
				return matches().slice(0, limit);
			},
			paginate: async ({
				cursor,
				numItems,
			}: {
				cursor: string | null;
				numItems: number;
			}) => {
				this.paginations.push({ cursor, numItems });
				const offset = cursor ? Number(cursor) : 0;
				const rows = matches();
				const page = rows.slice(offset, offset + numItems);
				const next = offset + page.length;
				return {
					page,
					continueCursor: String(next),
					isDone: next >= rows.length,
				};
			},
		};
		return result;
	}
}

const routeNoteHandler = (
	get as unknown as {
		_handler: (
			ctx: unknown,
			args: Record<string, unknown>,
		) => Promise<unknown>;
	}
)._handler;

type NoteTarget =
	| { kind: "Attestation"; attestationId: string }
	| { kind: "Surface"; language: "de"; normalizedSurface: string }
	| { kind: "Lemma"; lemmaId: string };

const routeNote = (
	ctx: unknown,
	{
		target,
		contextCursor,
		activeAnalysisKey,
	}: {
		target: NoteTarget;
		contextCursor?: string;
		activeAnalysisKey?: string;
	},
) =>
	routeNoteHandler(ctx, {
		target: {
			...target,
			...(contextCursor ? { contextCursor } : {}),
			...(activeAnalysisKey ? { activeAnalysisKey } : {}),
		},
	});

test("Note locators are strict across Attestation, Surface, and Lemma kinds", async () => {
	const db = new RouteDb({});
	for (const target of [
		{ kind: "Attestation", attestationId: "surface-1" } as const,
		{
			kind: "Surface",
			language: "de",
			normalizedSurface: "missing",
		} as const,
		{ kind: "Lemma", lemmaId: "attestation-1" } as const,
	]) {
		expect(await routeNote({ db }, { target })).toBeNull();
	}
	expect(db.documentReads).toBe(2);
});

test("Attestation Route Note preserves ordered members and reaches Surface and Reading", async () => {
	const db = new RouteDb({
		texts: [{ _id: "text-1", sourceText: "Er steht früh auf." }],
		sentences: [
			{
				_id: "sentence-1",
				language: "de",
				segmentedSentenceId: "fixture-sentence",
				textId: "text-1",
				position: 0,
				stitchedText: "Er steht früh auf.",
			},
		],
		segments: [
			{
				_id: "segment-0",
				sentenceId: "sentence-1",
				index: 0,
				kind: "Other",
				text: "Er ",
			},
			{
				_id: "segment-1",
				sentenceId: "sentence-1",
				index: 1,
				kind: "ResolvableText",
				text: "steht",
				attestationMembership: {
					attestationId: "attestation-1",
					orthography: "Standard",
				},
			},
			{
				_id: "segment-2",
				sentenceId: "sentence-1",
				index: 2,
				kind: "Other",
				text: " früh ",
			},
			{
				_id: "segment-3",
				sentenceId: "sentence-1",
				index: 3,
				kind: "ResolvableText",
				text: "auf",
				attestationMembership: {
					attestationId: "attestation-1",
					orthography: "Standard",
				},
			},
		],
		lemmas: [lemma("lemma-1", "de", "aufstehen", "Lexeme", "VERB")],
		surfaces: [surface("surface-1", "lemma-1", "de", "steht auf")],
		readings: [
			{ _id: "reading-1", lemmaId: "lemma-1", emojiDescription: "🧍" },
		],
		attestations: [
			{
				_id: "attestation-1",
				surfaceId: "surface-1",
				readingId: "reading-1",
				realizationCoverage: "Full",
			},
		],
	});
	const note = (await routeNote(
		{ db },
		{
			target: {
				kind: "Attestation",
				attestationId: "attestation-1",
			},
		},
	)) as {
		presented: { members: { attested: string }[] };
		source: { memberSegmentIndices: number[] };
		surfaceTarget: Record<string, string>;
		reading: { target: Record<string, string> };
	};
	expect(note.presented.members.map((member) => member.attested)).toEqual([
		"steht",
		"auf",
	]);
	expect(note.source.memberSegmentIndices).toEqual([1, 3]);
	expect(note.surfaceTarget).toEqual({
		kind: "Surface",
		language: "de",
		normalizedSurface: "steht auf",
	});
	expect(note.reading.target).toEqual({
		kind: "Reading",
		readingId: "reading-1",
	});
});

test("Lemma pages expose all polysemous Readings and exact-language same-form peers", async () => {
	const readings = Array.from({ length: 101 }, (_, index) => ({
		_id: `reading-${index}`,
		lemmaId: "lemma-1",
		emojiDescription: `emoji-${index}`,
	}));
	const lemmaSurfaces = Array.from({ length: 51 }, (_, index) =>
		surface(`surface-${index}`, "lemma-1", "de", `Bank-${index}`),
	);
	const unitPeers = Array.from({ length: 51 }, (_, index) =>
		lemma(`lemma-peer-${index}`, "de", "Bank", "Lexeme", `KIND-${index}`),
	);
	const db = new RouteDb({
		lemmas: [
			lemma("lemma-1", "de", "Bank", "Lexeme", "NOUN"),
			lemma("lemma-construction", "de", "Bank", "Construction", "Fusion"),
			...unitPeers,
			lemma("lemma-he", "he", "Bank", "Lexeme", "NOUN"),
		],
		surfaces: lemmaSurfaces,
		readings,
	});
	const pages = await exhaustRoutePages(db, {
		kind: "Lemma",
		lemmaId: "lemma-1",
	});
	const projectedReadings = pages.flatMap(
		(page) => page.connections.readings,
	);
	const peers = pages.flatMap((page) => page.connections.sameWrittenForm);
	expect(projectedReadings).toHaveLength(101);
	expect(
		new Set(projectedReadings.map((reading) => reading.readingId)).size,
	).toBe(101);
	expect(pages.flatMap((page) => page.connections.surfaces)).toHaveLength(51);
	expect(peers).toHaveLength(51);
	expect(peers.map((peer) => peer.lemmaId)).not.toContain(
		"lemma-construction",
	);
	expect(db.indexedQueries).toContain(
		"lemmas.by_language_and_canonical_form",
	);
	expect(db.paginations.every(({ numItems }) => numItems === 25)).toBe(true);
});

test("Surface Note aggregates heterogeneous typed analyses of one written form", async () => {
	const db = new RouteDb({
		lemmas: [
			lemma("lemma-noun", "de", "Bank", "Lexeme", "NOUN"),
			lemma("lemma-verb", "de", "banken", "Lexeme", "VERB"),
		],
		surfaces: [
			surface("surface-noun", "lemma-noun", "de", "Bank"),
			surface("surface-verb", "lemma-verb", "de", "Bank"),
		],
	});
	const note = (await routeNote(
		{ db },
		{
			target: {
				kind: "Surface",
				language: "de",
				normalizedSurface: "Bank",
			},
		},
	)) as {
		kind: "Surface";
		target: { kind: "Surface"; language: "de"; normalizedSurface: string };
		analyses: Array<{
			analysisKey: string;
			surfaceId: string;
			lemmaId: string;
			presented: {
				lemma: { family: string; kind: string; canonicalForm: string };
				surfaceFeatures: unknown;
				inflectionalFeatures: unknown;
			};
			lemmaTarget: { kind: "Lemma"; lemmaId: string };
		}>;
	};
	expect(note.target).toEqual({
		kind: "Surface",
		language: "de",
		normalizedSurface: "Bank",
	});
	expect(note.analyses.map(({ analysisKey }) => analysisKey)).toEqual([
		"surface-noun",
		"surface-verb",
	]);
	expect(note.analyses.map(({ presented }) => presented.lemma.kind)).toEqual([
		"NOUN",
		"VERB",
	]);
	for (const analysis of note.analyses) {
		expect(analysis.analysisKey).toBe(analysis.surfaceId);
		expect(analysis.lemmaTarget).toEqual({
			kind: "Lemma",
			lemmaId: analysis.lemmaId,
		});
		expect(analysis.presented.surfaceFeatures).toEqual({
			historicalStatus: null,
		});
		expect(
			Object.keys(analysis.presented.inflectionalFeatures as object),
		).toEqual([]);
	}
	expect(db.indexedQueries).toContain(
		"surfaces.by_language_and_normalized_surface",
	);
});

test("Surface Note paginates every analysis beyond one query transaction", async () => {
	const lemmas = Array.from({ length: 101 }, (_, index) =>
		lemma(`lemma-${index}`, "de", `Bank-${index}`, "Lexeme", "NOUN"),
	);
	const db = new RouteDb({
		lemmas,
		surfaces: lemmas.map((entry, index) =>
			surface(`surface-${index}`, entry._id, "de", "Bank"),
		),
	});
	const target = {
		kind: "Surface",
		language: "de",
		normalizedSurface: "Bank",
	} as const;
	const first = (await routeNote({ db }, { target })) as {
		analyses: Array<{ analysisKey: string }>;
		continueCursor: string;
		isDone: boolean;
	};
	const second = (await routeNote(
		{ db },
		{ target, contextCursor: first.continueCursor },
	)) as typeof first;
	expect(first.analyses).toHaveLength(100);
	expect(first.isDone).toBe(false);
	expect(second.analyses).toHaveLength(1);
	expect(second.isDone).toBe(true);
	expect(
		new Set(
			[...first.analyses, ...second.analyses].map(
				({ analysisKey }) => analysisKey,
			),
		),
	).toEqual(new Set(lemmas.map((_, index) => `surface-${index}`)));
});

test("Surface Note includes an active analysis beyond the initial page", async () => {
	const lemmas = Array.from({ length: 101 }, (_, index) =>
		lemma(`lemma-${index}`, "de", `Bank-${index}`, "Lexeme", "NOUN"),
	);
	const db = new RouteDb({
		lemmas,
		surfaces: lemmas.map((entry, index) =>
			surface(`surface-${index}`, entry._id, "de", "Bank"),
		),
	});
	const target = {
		kind: "Surface",
		language: "de",
		normalizedSurface: "Bank",
	} as const;
	const first = (await routeNote(
		{ db },
		{ target, activeAnalysisKey: "surface-100" },
	)) as {
		analyses: Array<{ analysisKey: string }>;
		continueCursor: string;
		isDone: boolean;
	};
	const second = (await routeNote(
		{ db },
		{ target, contextCursor: first.continueCursor },
	)) as typeof first;

	expect(first.analyses).toHaveLength(101);
	expect(
		first.analyses.some(({ analysisKey }) => analysisKey === "surface-100"),
	).toBe(true);
	expect(first.isDone).toBe(false);
	expect(second.analyses.map(({ analysisKey }) => analysisKey)).toEqual([
		"surface-100",
	]);
});

test("Surface Note does not inject an active analysis from another aggregate", async () => {
	const db = new RouteDb({
		lemmas: [
			lemma("lemma-bank", "de", "Bank", "Lexeme", "NOUN"),
			lemma("lemma-banken", "de", "banken", "Lexeme", "VERB"),
		],
		surfaces: [
			surface("surface-bank", "lemma-bank", "de", "Bank"),
			surface("surface-banken", "lemma-banken", "de", "banken"),
		],
	});
	const note = (await routeNote(
		{ db },
		{
			target: {
				kind: "Surface",
				language: "de",
				normalizedSurface: "Bank",
			},
			activeAnalysisKey: "surface-banken",
		},
	)) as { analyses: Array<{ analysisKey: string }> };

	expect(note.analyses.map(({ analysisKey }) => analysisKey)).toEqual([
		"surface-bank",
	]);
});

test("homographic demonstrative and relative Lemma navigation keeps exact Readings separate", async () => {
	const db = new RouteDb({
		lemmas: [
			lemma("lemma-dem-der", "de", "der", "Lexeme", "PRON"),
			lemma("lemma-rel-der", "de", "der", "Lexeme", "PRON"),
		],
		surfaces: [
			surface("surface-dem-der", "lemma-dem-der", "de", "der"),
			surface("surface-rel-der", "lemma-rel-der", "de", "der"),
		],
		readings: [
			{
				_id: "reading-dem-der",
				lemmaId: "lemma-dem-der",
				emojiDescription: "👤",
			},
			{
				_id: "reading-rel-der",
				lemmaId: "lemma-rel-der",
				emojiDescription: "👤",
			},
		],
	});

	for (const pronType of ["dem", "rel"] as const) {
		const pages = await exhaustRoutePages(db, {
			kind: "Lemma",
			lemmaId: `lemma-${pronType}-der`,
		});
		expect(
			pages
				.flatMap((page) => page.connections.surfaces)
				.map(({ surfaceId }) => surfaceId),
		).toEqual([`surface-${pronType}-der`]);
		expect(
			pages
				.flatMap((page) => page.connections.readings)
				.map(({ readingId }) => readingId),
		).toEqual([`reading-${pronType}-der`]);
	}
});

test("Construction records and derived links are consistently unavailable", async () => {
	const db = new RouteDb({
		texts: [{ _id: "text-1", sourceText: "dass" }],
		sentences: [
			{
				_id: "sentence-1",
				language: "de",
				segmentedSentenceId: "fixture-sentence",
				textId: "text-1",
				position: 0,
				stitchedText: "dass",
			},
		],
		segments: [
			{
				_id: "segment-1",
				sentenceId: "sentence-1",
				index: 0,
				kind: "ResolvableText",
				text: "dass",
				attestationMembership: {
					attestationId: "attestation-1",
					orthography: "Standard",
				},
			},
		],
		lemmas: [lemma("lemma-1", "de", "dass", "Construction", "Fusion")],
		surfaces: [
			{
				...surface("surface-1", "lemma-1", "de", "dass"),
				inflectionalFeatures: undefined,
			},
		],
		readings: [
			{ _id: "reading-1", lemmaId: "lemma-1", emojiDescription: "🔗" },
		],
		attestations: [
			{
				_id: "attestation-1",
				surfaceId: "surface-1",
				readingId: "reading-1",
				realizationCoverage: "Full",
			},
		],
	});
	for (const target of [
		{ kind: "Lemma", lemmaId: "lemma-1" } as const,
		{
			kind: "Surface",
			language: "de",
			normalizedSurface: "dass",
		} as const,
		{
			kind: "Attestation",
			attestationId: "attestation-1",
		} as const,
	]) {
		expect(await routeNote({ db }, { target })).toBeNull();
	}
});

async function exhaustRoutePages(db: RouteDb, target: NoteTarget) {
	const pages: CollectedRoutePage[] = [];
	let cursor: string | undefined;
	for (let pageNumber = 0; pageNumber < 30; pageNumber += 1) {
		const page = (await routeNote(
			{ db },
			{ target, ...(cursor ? { contextCursor: cursor } : {}) },
		)) as {
			connections: {
				occurrences?: { attestationId: string }[];
				surfaces?: { surfaceId: string }[];
				readings?: { readingId: string }[];
				sameWrittenForm?: { lemmaId?: string; surfaceId?: string }[];
				continueCursor: string;
				isDone: boolean;
			};
		};
		if (!page) throw new Error("Expected a Route Note page.");
		pages.push({
			connections: {
				occurrences: page.connections.occurrences ?? [],
				surfaces: page.connections.surfaces ?? [],
				readings: page.connections.readings ?? [],
				sameWrittenForm: page.connections.sameWrittenForm ?? [],
				continueCursor: page.connections.continueCursor,
				isDone: page.connections.isDone,
			},
		});
		if (page.connections.isDone) return pages;
		cursor = page.connections.continueCursor;
	}
	throw new Error("Route Note pagination did not terminate.");
}

type CollectedRoutePage = {
	connections: {
		occurrences: { attestationId: string }[];
		surfaces: { surfaceId: string }[];
		readings: { readingId: string }[];
		sameWrittenForm: { lemmaId?: string; surfaceId?: string }[];
		continueCursor: string;
		isDone: boolean;
	};
};

function lemma(
	_id: string,
	language: "de" | "he",
	canonicalForm: string,
	family: string,
	kind: string,
) {
	return {
		unitKind: "Lemma",
		_id,
		lemmaKey: `${_id}-key`,
		language,
		canonicalForm,
		family,
		kind,
		coreFeatures: lemmaCoreFeatures(_id, canonicalForm, kind),
	};
}

function surface(
	_id: string,
	lemmaId: string,
	language: "de" | "he",
	normalizedSurface: string,
) {
	return {
		_id,
		surfaceKey: `${_id}-key`,
		lemmaId,
		language,
		normalizedSurface,
		spelling: "Canonical",

		surfaceFeatures: null,
		inflectionalFeatures: null,
	};
}

function lemmaCoreFeatures(_id: string, canonicalForm: string, kind: string) {
	if (kind === "NOUN") return { gender: null, hyph: null };
	if (kind === "VERB") {
		return {
			verbType: null,
			lexicallyReflexive: null,
			hasSepPrefix: null,
			hasGovPrep: null,
		};
	}
	if (kind !== "PRON") return {};
	const pronType = _id.includes("rel-")
		? "Rel"
		: _id.includes("dem-")
			? "Dem"
			: ["niemand", "nichts", "keiner"].includes(canonicalForm)
				? "Neg"
				: ["alles", "alle", "jeder", "jedweder", "jeglicher"].includes(
							canonicalForm,
						)
					? "Tot"
					: "Ind";
	return {
		pronType,
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		case: "Nom",
		number: "Sing",
		gender: "Masc",
		"gender[psor]": null,
		referenceNumber: null,
	};
}

function nestedValue(row: Row, path: string): unknown {
	return path.split(".").reduce<unknown>((value, key) => {
		if (!value || typeof value !== "object") return undefined;
		return (value as Record<string, unknown>)[key];
	}, row);
}
