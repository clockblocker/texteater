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

const routeNote = (
	ctx: unknown,
	{
		target,
		contextCursor,
	}: {
		target: { routeKind: "Attestation" | "Surface" | "Lemma"; id: string };
		contextCursor?: string;
	},
) =>
	routeNoteHandler(ctx, {
		routeKind: target.routeKind,
		id: target.id,
		...(contextCursor ? { contextCursor } : {}),
	});

test("Route Note IDs are strict across Attestation, Surface, and Lemma kinds", async () => {
	const db = new RouteDb({});
	for (const target of [
		{ kind: "RouteNote", routeKind: "Attestation", id: "surface-1" },
		{ kind: "RouteNote", routeKind: "Surface", id: "lemma-1" },
		{ kind: "RouteNote", routeKind: "Lemma", id: "attestation-1" },
	]) {
		expect(await routeNote({ db }, { target })).toBeNull();
	}
	expect(db.documentReads).toBe(0);
});

test("Attestation Route Note preserves ordered members and reaches Surface and Reading", async () => {
	const db = new RouteDb({
		texts: [{ _id: "text-1", sourceText: "Er steht früh auf." }],
		sentences: [
			{
				_id: "sentence-1",
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
				kind: "RouteNote",
				routeKind: "Attestation",
				id: "attestation-1",
			},
		},
	)) as {
		members: { attested: string }[];
		source: { memberSegmentIndices: number[] };
		surface: { target: Record<string, string> };
		reading: { target: Record<string, string> };
	};
	expect(note.members.map((member) => member.attested)).toEqual([
		"steht",
		"auf",
	]);
	expect(note.source.memberSegmentIndices).toEqual([1, 3]);
	expect(note.surface.target).toEqual({
		kind: "RouteNote",
		routeKind: "Surface",
		id: "surface-1",
	});
	expect(note.reading.target).toEqual({
		kind: "UnitReadingNote",
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
			lemma("lemma-construction", "de", "Bank", "Construction", "CLAUSE"),
			...unitPeers,
			lemma("lemma-he", "he", "Bank", "Lexeme", "NOUN"),
		],
		surfaces: lemmaSurfaces,
		readings,
	});
	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-1",
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

test("jemand Lemma navigation infers all four persisted case Surfaces", async () => {
	const db = new RouteDb({
		lemmas: [lemma("lemma-jemand", "de", "jemand", "Lexeme", "PRON")],
		surfaces: ["jemand", "jemanden", "jemandem", "jemandes"].map(
			(normalizedSurface, index) =>
				surface(
					`surface-jemand-${index}`,
					"lemma-jemand",
					"de",
					normalizedSurface,
				),
		),
		readings: [
			{
				_id: "reading-jemand",
				lemmaId: "lemma-jemand",
				emojiDescription: "👤",
			},
		],
	});

	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-jemand",
	});
	expect(
		pages
			.flatMap((page) => page.connections.surfaces)
			.map(({ surfaceId }) => surfaceId),
	).toEqual([
		"surface-jemand-0",
		"surface-jemand-1",
		"surface-jemand-2",
		"surface-jemand-3",
	]);
	expect(pages.flatMap((page) => page.connections.readings)).toEqual([
		expect.objectContaining({ readingId: "reading-jemand" }),
	]);
});

test("niemand Lemma navigation infers all four persisted case Surfaces", async () => {
	const db = new RouteDb({
		lemmas: [lemma("lemma-niemand", "de", "niemand", "Lexeme", "PRON")],
		surfaces: ["niemand", "niemanden", "niemandem", "niemandes"].map(
			(normalizedSurface, index) =>
				surface(
					`surface-niemand-${index}`,
					"lemma-niemand",
					"de",
					normalizedSurface,
				),
		),
		readings: [
			{
				_id: "reading-niemand",
				lemmaId: "lemma-niemand",
				emojiDescription: "🚫",
			},
		],
	});

	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-niemand",
	});
	expect(
		pages
			.flatMap((page) => page.connections.surfaces)
			.map(({ surfaceId }) => surfaceId),
	).toEqual([
		"surface-niemand-0",
		"surface-niemand-1",
		"surface-niemand-2",
		"surface-niemand-3",
	]);
	expect(pages.flatMap((page) => page.connections.readings)).toEqual([
		expect.objectContaining({ readingId: "reading-niemand" }),
	]);
});

test("keiner Lemma navigation exposes all sixteen persisted Surface analyses", async () => {
	const forms = [
		"keiner",
		"keine",
		"keines",
		"keinen",
		"keine",
		"keines",
		"keinem",
		"keiner",
		"keinem",
		"keines",
		"keiner",
		"keines",
		"keine",
		"keine",
		"keinen",
		"keiner",
	];
	const db = new RouteDb({
		lemmas: [lemma("lemma-keiner", "de", "keiner", "Lexeme", "PRON")],
		surfaces: forms.map((form, index) =>
			surface(`surface-keiner-${index}`, "lemma-keiner", "de", form),
		),
		readings: [
			{
				_id: "reading-keiner",
				lemmaId: "lemma-keiner",
				emojiDescription: "🚫",
			},
		],
	});
	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-keiner",
	});
	expect(
		pages
			.flatMap((page) => page.connections.surfaces)
			.map(({ surfaceId }) => surfaceId),
	).toEqual(forms.map((_, index) => `surface-keiner-${index}`));
	expect(pages.flatMap((page) => page.connections.readings)).toEqual([
		expect.objectContaining({ readingId: "reading-keiner" }),
	]);
});

test("jedermann Lemma navigation exposes its four case Surfaces", async () => {
	const db = new RouteDb({
		lemmas: [lemma("lemma-jedermann", "de", "jedermann", "Lexeme", "PRON")],
		surfaces: ["jedermann", "jedermann", "jedermann", "jedermanns"].map(
			(form, index) =>
				surface(
					`surface-jedermann-${index}`,
					"lemma-jedermann",
					"de",
					form,
				),
		),
		readings: [
			{
				_id: "reading-jedermann",
				lemmaId: "lemma-jedermann",
				emojiDescription: "🌐",
			},
		],
	});
	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-jedermann",
	});
	expect(pages.flatMap((page) => page.connections.surfaces)).toHaveLength(4);
	expect(pages.flatMap((page) => page.connections.readings)).toEqual([
		expect.objectContaining({ readingId: "reading-jedermann" }),
	]);
});

test("mancher Lemma navigation exposes all sixteen persisted analyses", async () => {
	const forms = [
		"mancher",
		"manche",
		"manches",
		"manchen",
		"manche",
		"manches",
		"manchem",
		"mancher",
		"manchem",
		"manches",
		"mancher",
		"manches",
		"manche",
		"manche",
		"manchen",
		"mancher",
	];
	const db = new RouteDb({
		lemmas: [lemma("lemma-mancher", "de", "mancher", "Lexeme", "PRON")],
		surfaces: forms.map((form, index) =>
			surface(`surface-mancher-${index}`, "lemma-mancher", "de", form),
		),
		readings: [
			{
				_id: "reading-mancher",
				lemmaId: "lemma-mancher",
				emojiDescription: "🌐",
			},
		],
	});
	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-mancher",
	});
	expect(pages.flatMap((page) => page.connections.surfaces)).toHaveLength(16);
	expect(pages.flatMap((page) => page.connections.readings)).toHaveLength(1);
});

test("nichts Lemma navigation exposes canonical nichts and Variant nix Surfaces", async () => {
	const db = new RouteDb({
		lemmas: [lemma("lemma-nichts", "de", "nichts", "Lexeme", "PRON")],
		surfaces: [
			surface("surface-nichts", "lemma-nichts", "de", "nichts"),
			{
				...surface("surface-nix", "lemma-nichts", "de", "nix"),
				spelling: "Variant",
			},
		],
		readings: [
			{
				_id: "reading-nichts",
				lemmaId: "lemma-nichts",
				emojiDescription: "🚫",
			},
		],
	});

	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-nichts",
	});
	expect(
		pages
			.flatMap((page) => page.connections.surfaces)
			.map(({ surfaceId }) => surfaceId),
	).toEqual(["surface-nichts", "surface-nix"]);
	expect(pages.flatMap((page) => page.connections.readings)).toEqual([
		expect.objectContaining({ readingId: "reading-nichts" }),
	]);
});

test("jeder Lemma navigation exposes all twelve syncretic Surface analyses", async () => {
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
	const db = new RouteDb({
		lemmas: [lemma("lemma-jeder", "de", "jeder", "Lexeme", "PRON")],
		surfaces: slots.map(([form, grammaticalCase, gender], index) => ({
			...surface(`surface-jeder-${index}`, "lemma-jeder", "de", form),
			inflectionalFeatures: {
				case: grammaticalCase,
				gender,
				number: "Sing",
				reflex: null,
			},
		})),
		readings: [
			{
				_id: "reading-jeder",
				lemmaId: "lemma-jeder",
				emojiDescription: "🌐",
			},
		],
	});
	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-jeder",
	});
	expect(
		pages
			.flatMap((page) => page.connections.surfaces)
			.map(({ surfaceId }) => surfaceId),
	).toEqual(slots.map((_, index) => `surface-jeder-${index}`));
	expect(pages.flatMap((page) => page.connections.readings)).toEqual([
		expect.objectContaining({ readingId: "reading-jeder" }),
	]);
});

test("jedweder Lemma navigation exposes its own twelve Surface analyses", async () => {
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
	const db = new RouteDb({
		lemmas: [lemma("lemma-jedweder", "de", "jedweder", "Lexeme", "PRON")],
		surfaces: slots.map(([form, grammaticalCase, gender], index) => ({
			...surface(
				`surface-jedweder-${index}`,
				"lemma-jedweder",
				"de",
				form,
			),
			inflectionalFeatures: {
				case: grammaticalCase,
				gender,
				number: "Sing",
				reflex: null,
			},
		})),
		readings: [
			{
				_id: "reading-jedweder",
				lemmaId: "lemma-jedweder",
				emojiDescription: "🌐",
			},
		],
	});
	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-jedweder",
	});
	expect(
		pages
			.flatMap((page) => page.connections.surfaces)
			.map(({ surfaceId }) => surfaceId),
	).toEqual(slots.map((_, index) => `surface-jedweder-${index}`));
});

test("jeglicher Lemma navigation exposes all sixteen singular and plural Surfaces", async () => {
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
	const db = new RouteDb({
		lemmas: [lemma("lemma-jeglicher", "de", "jeglicher", "Lexeme", "PRON")],
		surfaces: slots.map(
			([form, grammaticalCase, gender, number], index) => ({
				...surface(
					`surface-jeglicher-${index}`,
					"lemma-jeglicher",
					"de",
					form,
				),
				inflectionalFeatures: {
					case: grammaticalCase,
					gender,
					number,
					reflex: null,
				},
			}),
		),
		readings: [
			{
				_id: "reading-jeglicher",
				lemmaId: "lemma-jeglicher",
				emojiDescription: "🌐",
			},
		],
	});
	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-jeglicher",
	});
	expect(pages.flatMap((page) => page.connections.surfaces)).toHaveLength(16);
});

test("total Lemma navigation keeps singular and plural Surface paradigms separate", async () => {
	const db = new RouteDb({
		lemmas: [
			lemma("lemma-alles", "de", "alles", "Lexeme", "PRON"),
			lemma("lemma-alle", "de", "alle", "Lexeme", "PRON"),
		],
		surfaces: [
			surface("surface-alles-nom", "lemma-alles", "de", "alles"),
			surface("surface-alles-acc", "lemma-alles", "de", "alles"),
			surface("surface-allem-dat", "lemma-alles", "de", "allem"),
			surface("surface-alle-nom", "lemma-alle", "de", "alle"),
			surface("surface-alle-acc", "lemma-alle", "de", "alle"),
			surface("surface-allen-dat", "lemma-alle", "de", "allen"),
			surface("surface-aller-gen", "lemma-alle", "de", "aller"),
		],
		readings: [
			{
				_id: "reading-alles",
				lemmaId: "lemma-alles",
				emojiDescription: "🌐",
			},
			{
				_id: "reading-alle",
				lemmaId: "lemma-alle",
				emojiDescription: "🌐",
			},
		],
	});

	const allesPages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-alles",
	});
	const allePages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-alle",
	});
	expect(
		allesPages
			.flatMap((page) => page.connections.surfaces)
			.map(({ surfaceId }) => surfaceId),
	).toEqual(["surface-alles-nom", "surface-alles-acc", "surface-allem-dat"]);
	expect(
		allePages
			.flatMap((page) => page.connections.surfaces)
			.map(({ surfaceId }) => surfaceId),
	).toEqual([
		"surface-alle-nom",
		"surface-alle-acc",
		"surface-allen-dat",
		"surface-aller-gen",
	]);
});

test("plural-only mehrere Lemma navigation exposes all four distinct Case Surfaces", async () => {
	const db = new RouteDb({
		lemmas: [lemma("lemma-mehrere", "de", "mehrere", "Lexeme", "PRON")],
		surfaces: [
			surface("surface-mehrere-nom", "lemma-mehrere", "de", "mehrere"),
			surface("surface-mehrere-acc", "lemma-mehrere", "de", "mehrere"),
			surface("surface-mehreren-dat", "lemma-mehrere", "de", "mehreren"),
			surface("surface-mehrerer-gen", "lemma-mehrere", "de", "mehrerer"),
		],
		readings: [
			{
				_id: "reading-mehrere",
				lemmaId: "lemma-mehrere",
				emojiDescription: "🌐",
			},
		],
	});

	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Lemma",
		id: "lemma-mehrere",
	});
	expect(
		pages
			.flatMap((page) => page.connections.surfaces)
			.map(({ surfaceId }) => surfaceId),
	).toEqual([
		"surface-mehrere-nom",
		"surface-mehrere-acc",
		"surface-mehreren-dat",
		"surface-mehrerer-gen",
	]);
	expect(pages.flatMap((page) => page.connections.readings)).toEqual([
		expect.objectContaining({ readingId: "reading-mehrere" }),
	]);
});

test("Surface pages expose every occurrence and 100 distinct exact same-written-form peers", async () => {
	const attestations = Array.from({ length: 51 }, (_, index) => ({
		_id: `attestation-${index}`,
		surfaceId: "surface-0",
		readingId: "reading-0",
		realizationCoverage: "Full",
	}));
	const sentences = attestations.map((_, index) => ({
		_id: `sentence-${index}`,
		textId: "text-1",
		position: index,
		stitchedText: `Bank ${index}`,
	}));
	const segments = attestations.map((attestation, index) => ({
		_id: `segment-${index}`,
		sentenceId: `sentence-${index}`,
		index: 0,
		kind: "ResolvableText",
		text: "Bank",
		attestationMembership: {
			attestationId: attestation._id,
			orthography: "Standard",
		},
	}));
	const peerLemmas = Array.from({ length: 100 }, (_, index) =>
		lemma(`lemma-${index + 1}`, "de", "Bank", "Lexeme", `KIND-${index}`),
	);
	const peerSurfaces = peerLemmas.map((peer, index) =>
		surface(`surface-${index + 1}`, peer._id, "de", "Bank"),
	);
	const db = new RouteDb({
		texts: [{ _id: "text-1", sourceText: "Bank" }],
		sentences,
		segments,
		lemmas: [
			lemma("lemma-0", "de", "Bank", "Lexeme", "NOUN"),
			lemma("lemma-construction", "de", "Bank", "Construction", "CLAUSE"),
			...peerLemmas,
			lemma("lemma-foreign", "he", "Bank", "Lexeme", "NOUN"),
		],
		surfaces: [
			surface("surface-0", "lemma-0", "de", "Bank"),
			surface("surface-construction", "lemma-construction", "de", "Bank"),
			...peerSurfaces,
			surface("surface-foreign", "lemma-foreign", "he", "Bank"),
		],
		readings: [
			{ _id: "reading-0", lemmaId: "lemma-0", emojiDescription: "🏦" },
		],
		attestations,
	});
	const pages = await exhaustRoutePages(db, {
		kind: "RouteNote",
		routeKind: "Surface",
		id: "surface-0",
	});
	expect(pages.flatMap((page) => page.connections.occurrences)).toHaveLength(
		51,
	);
	expect(
		pages.flatMap((page) => page.connections.sameWrittenForm),
	).toHaveLength(100);
	expect(db.indexedQueries).toContain(
		"surfaces.by_language_and_normalized_surface",
	);
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
			kind: "RouteNote",
			routeKind: "Lemma",
			id: `lemma-${pronType}-der`,
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
		lemmas: [lemma("lemma-1", "de", "dass", "Construction", "CLAUSE")],
		surfaces: [surface("surface-1", "lemma-1", "de", "dass")],
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
		{ kind: "RouteNote", routeKind: "Lemma", id: "lemma-1" },
		{ kind: "RouteNote", routeKind: "Surface", id: "surface-1" },
		{
			kind: "RouteNote",
			routeKind: "Attestation",
			id: "attestation-1",
		},
	]) {
		expect(await routeNote({ db }, { target })).toBeNull();
	}
});

async function exhaustRoutePages(db: RouteDb, target: Record<string, unknown>) {
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
		_id,
		lemmaKey: `${_id}-key`,
		language,
		canonicalForm,
		family,
		kind,
		coreFeatures: {},
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
		surfaceKind: "Citation",
		surfaceFeatures: {},
	};
}

function nestedValue(row: Row, path: string): unknown {
	return path.split(".").reduce<unknown>((value, key) => {
		if (!value || typeof value !== "object") return undefined;
		return (value as Record<string, unknown>)[key];
	}, row);
}
