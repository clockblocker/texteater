import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { makeSurfaceId } from "dumdict";
import { nounArticleReference } from "dumgen";
import type * as Dumling from "dumling/types";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { projectSentenceView } from "../convex/modules/text/sentenceView";
import {
	createTestConvex,
	submitText,
	type TestConvexDb,
} from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

type RouteNoteTarget = FunctionArgs<typeof api.routeNotes.get>["target"];
type RouteNote = NonNullable<FunctionReturnType<typeof api.routeNotes.get>>;

function routeNote(t: TestConvexDb, target: RouteNoteTarget) {
	return t.query(api.routeNotes.get, { target });
}

function noteOfKind<Kind extends RouteNote["kind"]>(
	note: RouteNote | null,
	kind: Kind,
): Extract<RouteNote, { kind: Kind }> {
	if (note?.kind !== kind) throw new Error(`Expected a ${kind} Route Note.`);
	return note as Extract<RouteNote, { kind: Kind }>;
}

type LemmaSeed = {
	readonly language: "de" | "he";
	readonly canonicalForm: string;
	readonly family: Dumling.Family;
	readonly kind: Dumling.Kind;
	readonly pronType?: "Dem" | "Rel";
};

let seedCounter = 0;

/** Stored keys only need to be unique here; nothing looks them up. */
function nextKey(prefix: string) {
	seedCounter += 1;
	return `${prefix}-${seedCounter}`;
}

function insertLemma(t: TestConvexDb, seed: LemmaSeed) {
	const key = nextKey("lemma");
	return t.run((ctx) =>
		ctx.db.insert("lemmas", {
			lemmaKey: key,
			language: seed.language,
			family: seed.family,
			kind: seed.kind,
			canonicalForm: seed.canonicalForm,
			coreFeatures: lemmaCoreFeatures(seed),
		}),
	);
}

function insertLemmas(t: TestConvexDb, seeds: readonly LemmaSeed[]) {
	return Promise.all(seeds.map((seed) => insertLemma(t, seed)));
}

function insertSurface(
	t: TestConvexDb,
	lemmaId: Id<"lemmas">,
	normalizedSurface: string,
	language: "de" | "he" = "de",
) {
	const key = nextKey("surface");
	return t.run((ctx) =>
		ctx.db.insert("surfaces", {
			surfaceKey: key,
			lemmaId,
			language,
			normalizedSurface,
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: null,
		}),
	);
}

function insertReading(
	t: TestConvexDb,
	lemmaId: Id<"lemmas">,
	emojiDescription: string,
) {
	const key = nextKey("reading");
	return t.run((ctx) =>
		ctx.db.insert("readings", {
			readingKey: key,
			lemmaId,
			emojiDescription,
		}),
	);
}

/** Commits one occurrence: an Attestation owning the given member Segments. */
function attest(
	t: TestConvexDb,
	owner: {
		readonly readingId: Id<"readings">;
		readonly surfaceId: Id<"surfaces">;
	},
	memberSegmentIds: readonly (Id<"segments"> | undefined)[],
) {
	return t.run(async (ctx) => {
		const attestationId = await ctx.db.insert("attestations", {
			surfaceId: owner.surfaceId,
			readingId: owner.readingId,
			realizationCoverage: "Full",
		});
		for (const segmentId of memberSegmentIds) {
			if (!segmentId) throw new Error("Expected a member Segment.");
			await ctx.db.patch(segmentId, {
				attestationMembership: {
					attestationId,
					orthography: "Standard",
				},
			});
		}
		return attestationId;
	});
}

test("Note locators are strict across Attestation, Surface, and Lemma kinds", async () => {
	const t = createTestConvex();
	const lemmaId = await insertLemma(t, {
		language: "de",
		canonicalForm: "Bank",
		family: "Lexeme",
		kind: "NOUN",
	});
	const surfaceId = await insertSurface(t, lemmaId, "Bank");

	// An ID of the wrong kind never reaches a loader: the locator rejects it.
	await expect(
		routeNote(t, {
			kind: "Attestation",
			attestationId: surfaceId as unknown as Id<"attestations">,
		}),
	).rejects.toThrow("Validator error");
	await expect(
		routeNote(t, {
			kind: "Lemma",
			lemmaId: surfaceId as unknown as Id<"lemmas">,
		}),
	).rejects.toThrow("Validator error");
	expect(
		await routeNote(t, {
			kind: "Surface",
			language: "de",
			normalizedSurface: "missing",
		}),
	).toBeNull();

	await t.run((ctx) => ctx.db.delete(lemmaId));
	expect(await routeNote(t, { kind: "Lemma", lemmaId })).toBeNull();
});

test("Attestation Route Note preserves ordered members and reaches Surface and Reading", async () => {
	const t = createTestConvex();
	const { segmentIds } = await submitText(t, [
		["Er", " ", "steht", " ", "früh", " ", "auf", "."],
	]);
	const [segments] = segmentIds;
	const lemmaId = await insertLemma(t, {
		language: "de",
		canonicalForm: "aufstehen",
		family: "Lexeme",
		kind: "VERB",
	});
	const surfaceId = await insertSurface(t, lemmaId, "steht auf");
	const readingId = await insertReading(t, lemmaId, "🧍");
	const attestationId = await attest(t, { readingId, surfaceId }, [
		segments?.[6],
		segments?.[2],
	]);

	const note = noteOfKind(
		await routeNote(t, { kind: "Attestation", attestationId }),
		"Attestation",
	);
	expect(note.presented.members.map((member) => member.attested)).toEqual([
		"steht",
		"auf",
	]);
	expect(note.source.memberSegmentIndices).toEqual([2, 6]);
	expect(note.surfaceTarget).toEqual({
		kind: "Surface",
		language: "de",
		normalizedSurface: "steht auf",
	});
	expect(note.reading.target).toEqual({ kind: "Reading", readingId });
});

test("Lemma pages expose all polysemous Readings and exact-language same-form peers", async () => {
	const t = createTestConvex();
	const lemmaId = await insertLemma(t, {
		language: "de",
		canonicalForm: "Bank",
		family: "Lexeme",
		kind: "NOUN",
	});
	const [morphemeId] = await insertLemmas(t, [
		{
			language: "de",
			canonicalForm: "Bank",
			family: "Morpheme",
			kind: "Prefix",
		},
		...Array.from({ length: 51 }, () => ({
			language: "de" as const,
			canonicalForm: "Bank",
			family: "Lexeme",
			kind: "NOUN",
		})),
		{
			language: "he",
			canonicalForm: "Bank",
			family: "Lexeme",
			kind: "NOUN",
		},
	]);
	for (let index = 0; index < 51; index += 1) {
		await insertSurface(t, lemmaId, `Bank-${index}`);
	}
	for (let index = 0; index < 101; index += 1) {
		await insertReading(t, lemmaId, `emoji-${index}`);
	}

	const pages = await exhaustRoutePages(t, { kind: "Lemma", lemmaId });
	const projectedReadings = pages.flatMap(
		(page) => page.connections.readings,
	);
	const peers = pages.flatMap((page) => page.connections.sameWrittenForm);
	expect(projectedReadings).toHaveLength(101);
	expect(
		new Set(projectedReadings.map((reading) => reading.readingId)).size,
	).toBe(101);
	expect(pages.flatMap((page) => page.connections.surfaces)).toHaveLength(51);
	expect(peers).toHaveLength(52);
	expect(peers.map((peer) => peer.lemmaId)).toContain(morphemeId);
	for (const { connections } of pages) {
		expect(
			connections.readings.length +
				connections.surfaces.length +
				connections.sameWrittenForm.length,
		).toBeLessThanOrEqual(25);
	}
});

test("Surface Note aggregates heterogeneous typed analyses of one written form", async () => {
	const t = createTestConvex();
	const [nounId, verbId] = await insertLemmas(t, [
		{
			language: "de",
			canonicalForm: "Bank",
			family: "Lexeme",
			kind: "NOUN",
		},
		{
			language: "de",
			canonicalForm: "banken",
			family: "Lexeme",
			kind: "VERB",
		},
	]);
	if (!nounId || !verbId) throw new Error("Expected stored Lemmas.");
	const nounSurfaceId = await insertSurface(t, nounId, "Bank");
	const verbSurfaceId = await insertSurface(t, verbId, "Bank");

	const note = noteOfKind(
		await routeNote(t, {
			kind: "Surface",
			language: "de",
			normalizedSurface: "Bank",
		}),
		"Surface",
	);
	expect(note.target).toEqual({
		kind: "Surface",
		language: "de",
		normalizedSurface: "Bank",
	});
	expect(note.analyses.map(({ analysisKey }) => analysisKey)).toEqual([
		nounSurfaceId,
		verbSurfaceId,
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
});

async function insertBankHomographs(t: TestConvexDb, count: number) {
	const surfaceIds: Id<"surfaces">[] = [];
	for (let index = 0; index < count; index += 1) {
		const lemmaId = await insertLemma(t, {
			language: "de",
			canonicalForm: `Bank-${index}`,
			family: "Lexeme",
			kind: "NOUN",
		});
		surfaceIds.push(await insertSurface(t, lemmaId, "Bank"));
	}
	return surfaceIds;
}

const bankSurface = {
	kind: "Surface",
	language: "de",
	normalizedSurface: "Bank",
} as const;

test("Surface Note paginates every analysis beyond one query transaction", async () => {
	const t = createTestConvex();
	const surfaceIds = await insertBankHomographs(t, 101);

	const first = noteOfKind(await routeNote(t, bankSurface), "Surface");
	const second = noteOfKind(
		await routeNote(t, {
			...bankSurface,
			contextCursor: first.continueCursor,
		}),
		"Surface",
	);
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
	).toEqual(new Set(surfaceIds));
});

test("Surface Note includes an active analysis beyond the initial page", async () => {
	const t = createTestConvex();
	const surfaceIds = await insertBankHomographs(t, 101);
	const beyondFirstPage = surfaceIds[100];
	if (!beyondFirstPage) throw new Error("Expected 101 Surfaces.");

	const first = noteOfKind(
		await routeNote(t, {
			...bankSurface,
			activeAnalysisKey: beyondFirstPage,
		}),
		"Surface",
	);
	const second = noteOfKind(
		await routeNote(t, {
			...bankSurface,
			contextCursor: first.continueCursor,
		}),
		"Surface",
	);

	expect(first.analyses).toHaveLength(101);
	expect(
		first.analyses.some(
			({ analysisKey }) => analysisKey === beyondFirstPage,
		),
	).toBe(true);
	expect(first.isDone).toBe(false);
	expect(second.analyses.map(({ analysisKey }) => analysisKey)).toEqual([
		beyondFirstPage,
	]);
});

test("Surface Note keys a redirected active analysis the same way on every page", async () => {
	const t = createTestConvex();
	const surfaceIds = await insertBankHomographs(t, 101);
	const canonical = surfaceIds[100];
	if (!canonical) throw new Error("Expected 101 Surfaces.");
	const lemmaId = await t.run(
		async (ctx) => (await ctx.db.get(canonical))?.lemmaId,
	);
	if (!lemmaId) throw new Error("Expected a Lemma.");
	const redirected = await insertSurface(t, lemmaId, "Bank");
	await t.run((ctx) => ctx.db.patch(redirected, { redirectedTo: canonical }));
	const active = { ...bankSurface, activeAnalysisKey: redirected };

	const first = noteOfKind(await routeNote(t, active), "Surface");
	const second = noteOfKind(
		await routeNote(t, { ...active, contextCursor: first.continueCursor }),
		"Surface",
	);

	expect(
		first.analyses.find(({ surfaceId }) => surfaceId === canonical)
			?.analysisKey,
	).toBe(redirected);
	expect(second.analyses.map(({ analysisKey }) => analysisKey)).toEqual([
		redirected,
	]);
	expect(
		new Set(
			[...first.analyses, ...second.analyses].map(
				({ analysisKey }) => analysisKey,
			),
		).size,
	).toBe(101);
});

test("Surface Note does not inject an active analysis from another aggregate", async () => {
	const t = createTestConvex();
	const [bankId, bankenId] = await insertLemmas(t, [
		{
			language: "de",
			canonicalForm: "Bank",
			family: "Lexeme",
			kind: "NOUN",
		},
		{
			language: "de",
			canonicalForm: "banken",
			family: "Lexeme",
			kind: "VERB",
		},
	]);
	if (!bankId || !bankenId) throw new Error("Expected stored Lemmas.");
	const bankSurfaceId = await insertSurface(t, bankId, "Bank");
	const bankenSurfaceId = await insertSurface(t, bankenId, "banken");

	const note = noteOfKind(
		await routeNote(t, {
			...bankSurface,
			activeAnalysisKey: bankenSurfaceId,
		}),
		"Surface",
	);

	expect(note.analyses.map(({ analysisKey }) => analysisKey)).toEqual([
		bankSurfaceId,
	]);
});

test("homographic demonstrative and relative Lemma navigation keeps exact Readings separate", async () => {
	const t = createTestConvex();
	const exact = [];
	for (const pronType of ["Dem", "Rel"] as const) {
		const lemmaId = await insertLemma(t, {
			language: "de",
			canonicalForm: "der",
			family: "Lexeme",
			kind: "PRON",
			pronType,
		});
		exact.push({
			lemmaId,
			surfaceId: await insertSurface(t, lemmaId, "der"),
			readingId: await insertReading(t, lemmaId, "👤"),
		});
	}

	for (const { lemmaId, surfaceId, readingId } of exact) {
		const pages = await exhaustRoutePages(t, { kind: "Lemma", lemmaId });
		expect(
			pages
				.flatMap((page) => page.connections.surfaces)
				.map(({ surfaceId }) => surfaceId),
		).toEqual([surfaceId]);
		expect(
			pages
				.flatMap((page) => page.connections.readings)
				.map(({ readingId }) => readingId),
		).toEqual([readingId]);
	}
});

async function exhaustRoutePages(
	t: TestConvexDb,
	target: Extract<RouteNoteTarget, { kind: "Lemma" }>,
) {
	const pages: Extract<RouteNote, { kind: "Lemma" }>[] = [];
	let cursor: string | undefined;
	for (let pageNumber = 0; pageNumber < 30; pageNumber += 1) {
		const page = noteOfKind(
			await routeNote(t, {
				...target,
				...(cursor ? { contextCursor: cursor } : {}),
			}),
			"Lemma",
		);
		pages.push(page);
		if (page.connections.isDone) return pages;
		cursor = page.connections.continueCursor;
	}
	throw new Error("Route Note pagination did not terminate.");
}

function lemmaCoreFeatures({ canonicalForm, kind, pronType }: LemmaSeed) {
	if (kind === "NOUN") return { gender: null, hyph: null };
	if (kind === "VERB") {
		return {
			verbType: null,
			lexicallyReflexive: null,
			hasSepPrefix: null,
		};
	}
	if (kind !== "PRON") return {};
	return {
		pronType:
			pronType ??
			(["niemand", "nichts", "keiner"].includes(canonicalForm)
				? "Neg"
				: ["alles", "alle", "jeder", "jedweder", "jeglicher"].includes(
							canonicalForm,
						)
					? "Tot"
					: "Ind"),
		extPos: null,
		foreign: null,
		person: null,
		polite: null,
		poss: null,
		case: "Nom",
		number: "Sing",
		gender: "Masc",
	};
}

test("noun Surface article opens the exact DET analysis, including feminine der", async () => {
	const t = createTestConvex();
	const reference = nounArticleReference({
		article: "Definite",
		case: "Dat",
		number: "Sing",
		gender: "Fem",
		spelled: "der",
	});
	const { unitKind: _lemmaUnit, ...articleLemma } = reference.reading.lemma;
	const articleSurfaceId = await t.run(async (ctx) => {
		const nounId = await ctx.db.insert("lemmas", {
			lemmaKey: "lemma-frau",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Frau",
			coreFeatures: { gender: "Fem", hyph: null },
		});
		const articleLemmaId = await ctx.db.insert("lemmas", {
			...articleLemma,
			lemmaKey: "lemma-der-dat-fem",
		});
		await ctx.db.insert("surfaces", {
			surfaceKey: "surface-der-frau",
			language: "de",
			lemmaId: nounId,
			normalizedSurface: "der Frau",
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: {
				article: "Definite",
				case: "Dat",
				number: "Sing",
			},
		});
		return ctx.db.insert("surfaces", {
			surfaceKey: makeSurfaceId("de", reference.surface),
			language: reference.surface.language,
			lemmaId: articleLemmaId,
			normalizedSurface: reference.surface.normalizedSurface,
			spelling: reference.surface.spelling,
			surfaceFeatures: reference.surface.surfaceFeatures,
			inflectionalFeatures: reference.surface.inflectionalFeatures,
		});
	});

	const note = await routeNote(t, {
		kind: "Surface",
		language: "de",
		normalizedSurface: "der Frau",
	});
	expect(note).toMatchObject({
		analyses: [
			{
				article: {
					target: {
						kind: "Surface",
						language: "de",
						normalizedSurface: "der",
					},
					presentationContext: {
						activeAnalysisKey: articleSurfaceId,
					},
					presented: {
						lemma: {
							canonicalForm: "der",
							coreFeatures: { gender: "Fem", case: "Dat" },
						},
					},
				},
			},
		],
	});
});

test("sentence gender belongs to the visitor's encountered occurrence, including its article", async () => {
	const t = createTestConvex();
	const { textId, sentenceIds, segmentIds } = await submitText(t, [
		["der", " ", "Frau"],
	]);
	const [sentenceId] = sentenceIds;
	const [segments] = segmentIds;
	const article = segments?.[0];
	if (!sentenceId || !article) throw new Error("Expected a stored Sentence.");
	const lemmaId = await t.run((ctx) =>
		ctx.db.insert("lemmas", {
			lemmaKey: "lemma-frau",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Frau",
			coreFeatures: { gender: "Fem", hyph: null },
		}),
	);
	await attest(
		t,
		{
			readingId: await insertReading(t, lemmaId, "👩"),
			surfaceId: await insertSurface(t, lemmaId, "der Frau"),
		},
		[article, segments?.[2]],
	);
	await t.run((ctx) =>
		ctx.db.insert("visitorClicks", {
			requestId: "click-1",
			visitorId: "alice",
			textId,
			sentenceId,
			segmentId: article,
			clickedAt: 1,
		}),
	);
	const project = (visitorId: string) =>
		t.run(async (ctx) => {
			const sentence = await ctx.db.get(sentenceId);
			if (!sentence) throw new Error("Expected a stored Sentence.");
			return projectSentenceView(ctx, sentence, visitorId);
		});

	const alice = await project("alice");
	const bob = await project("bob");
	expect(alice.segments.filter(({ gender }) => gender)).toEqual([
		expect.objectContaining({
			text: "der",
			gender: "Fem",
			encountered: true,
		}),
		expect.objectContaining({
			text: "Frau",
			gender: "Fem",
			encountered: true,
		}),
	]);
	expect(
		bob.segments.every(
			({ gender, encountered }) => !gender && !encountered,
		),
	).toBe(true);
});
