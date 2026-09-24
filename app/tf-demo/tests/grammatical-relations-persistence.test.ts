import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { nounArticleReference } from "dumgen";
import type * as Dumling from "dumling/types";
import { api } from "../convex/_generated/api";
import type { Id, TableNames } from "../convex/_generated/dataModel";
import {
	completeAuthoredComponentKnowledge,
	materializeGrammaticalComponent,
} from "../convex/dumdictTransaction";
import {
	loadGrammaticalAlternatives,
	reviewedAlternatives,
} from "../convex/modules/notes/relations";
import schema from "../convex/schema";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import { createTestConvex, type TestConvexDb } from "./support/convex";

beforeEach(() => {
	// Scheduled work, such as Definition Text materialization, never runs here.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const lemma: Dumling.Lemma<"de", "Lexeme", "PRON"> = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "PRON",
	canonicalForm: "mich",
	coreFeatures: {
		extPos: null,
		foreign: null,
		person: "1",
		polite: null,
		poss: null,
		pronType: "Prs",
		referenceNumber: "Sing",
		case: "Acc",
		number: "Sing",
		gender: null,
		"gender[psor]": null,
	},
};
const reading: Dumling.Reading<"de", "Lexeme", "PRON"> = {
	unitKind: "Reading",
	lemma,
	emojiDescription: "👤",
};
const noun = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Frau",
	coreFeatures: { gender: "Fem", hyph: null },
} as const;

/** Stores a Lemma row as the dictionary does, without its `unitKind`. */
async function insertLemma(
	t: TestConvexDb,
	lemmaUnit: Dumling.Lemma<"de">,
): Promise<Id<"lemmas">> {
	const { unitKind: _, ...stored } = lemmaUnit;
	return t.run((ctx) =>
		ctx.db.insert("lemmas", {
			lemmaKey: lemmaIdentityKey(lemmaUnit),
			...stored,
		}),
	);
}

/** A database holding the `mich` source Reading. */
async function database() {
	const t = createTestConvex();
	const sourceLemmaId = await insertLemma(t, lemma);
	const sourceReadingId = await t.run((ctx) =>
		ctx.db.insert("readings", {
			readingKey: readingIdentityKey(reading),
			lemmaId: sourceLemmaId,
			emojiDescription: reading.emojiDescription,
		}),
	);
	return { t, sourceLemmaId, sourceReadingId };
}

/** Every stored row, by table, so a no-op can be shown to write nothing. */
function snapshot(t: TestConvexDb) {
	return t.run(async (ctx) =>
		Object.fromEntries(
			await Promise.all(
				(Object.keys(schema.tables) as TableNames[]).map(
					async (table) =>
						[table, await ctx.db.query(table).collect()] as const,
				),
			),
		),
	);
}

function rows<Table extends TableNames>(t: TestConvexDb, table: Table) {
	return t.run((ctx) => ctx.db.query(table).collect());
}

async function knowledgeRows(t: TestConvexDb) {
	return (await rows(t, "accumulatedKnowledge")).map(
		({ _id, knowledge }) => ({
			_id,
			knowledge: knowledge as {
				definition: string;
				translations: { en: string[] };
			},
		}),
	);
}

test("reviewed alternatives are visible without preloading and only the selected Reading is materialized", async () => {
	const { t, sourceReadingId } = await database();
	const before = await snapshot(t);
	const alternatives = await t.run((ctx) =>
		loadGrammaticalAlternatives(ctx, sourceReadingId),
	);
	expect(await snapshot(t)).toEqual(before);
	const mir = alternatives.find(
		(value) => value.canonicalForm === "mir" && value.feature === "case",
	);
	if (!mir) throw Error("Expected a case alternative for mir");
	expect(
		alternatives.some(
			(value) =>
				value.canonicalForm === "uns" && value.feature === "number",
		),
	).toBe(true);
	const follow = () =>
		t.mutation(api.reviewedNavigation.followGrammaticalAlternative, {
			sourceReadingId,
			readingKey: mir.readingKey,
		});
	const destination = await follow();
	expect(await rows(t, "readings")).toHaveLength(2);
	expect(await rows(t, "lemmas")).toHaveLength(2);
	expect(await rows(t, "surfaces")).toHaveLength(0);
	expect(await rows(t, "accumulatedKnowledge")).toHaveLength(0);
	await t.run(async (ctx) => {
		const entry = await ctx.db
			.query("readingEntries")
			.withIndex("by_reading_id", (q) => q.eq("readingId", destination))
			.unique();
		if (!entry) throw Error("Expected the destination reading entry");
		await ctx.db.patch(entry._id, {
			record: {
				...(entry.record as object),
				knowledge: { definition: "User-authored note" },
			},
		});
	});
	const stored = await snapshot(t);
	expect(await follow()).toBe(destination);
	expect(await snapshot(t)).toEqual(stored);
});

test("unreviewed destinations cannot create arbitrary Readings", async () => {
	const { t, sourceReadingId } = await database();
	const before = await snapshot(t);
	await expect(
		t.mutation(api.reviewedNavigation.followGrammaticalAlternative, {
			sourceReadingId,
			readingKey: "invented-reading",
		}),
	).rejects.toMatchObject({
		data: {
			code: "InvalidInput",
			message: expect.stringContaining("not a reviewed"),
		},
	});
	expect(await snapshot(t)).toEqual(before);
	expect(
		reviewedAlternatives({ ...lemma, canonicalForm: "unreviewed" }),
	).toEqual([]);
});

test("noun heading navigation materializes the authored DET Reading without relations or encounters", async () => {
	const t = createTestConvex();
	const lemmaId = await insertLemma(t, noun);
	const id = await t.mutation(api.reviewedNavigation.followNounArticle, {
		lemmaId,
	});
	const articleLemma = await t.run(async (ctx) => {
		const article = await ctx.db.get(id);
		return article ? ctx.db.get(article.lemmaId) : null;
	});
	expect(articleLemma).toMatchObject({ kind: "DET", canonicalForm: "die" });
	expect((await knowledgeRows(t))[0]?.knowledge.definition).toContain(
		"Artikel",
	);
	for (const table of [
		"surfaces",
		"attestations",
		"visitorClicks",
		"semanticRelationEdges",
	] as const)
		expect(await rows(t, table)).toHaveLength(0);
	const before = await snapshot(t);
	expect(
		await t.mutation(api.reviewedNavigation.followNounArticle, { lemmaId }),
	).toBe(id);
	expect(await snapshot(t)).toEqual(before);
});

test("noun heading navigation rejects non-nouns before writing", async () => {
	const { t, sourceLemmaId } = await database();
	const before = await snapshot(t);
	await expect(
		t.mutation(api.reviewedNavigation.followNounArticle, {
			lemmaId: sourceLemmaId,
		}),
	).rejects.toThrow("no noun heading article");
	expect(await snapshot(t)).toEqual(before);
});

test("noun composition creates its article Reading with authored Knowledge before navigation", async () => {
	const t = createTestConvex();
	const lemmaId = await insertLemma(t, noun);
	const reference = nounArticleReference({
		article: "Definite",
		case: "Dat",
		number: "Sing",
		gender: "Fem",
		spelled: "der",
	});
	await t.run((ctx) => materializeGrammaticalComponent(ctx, reference));
	expect(await rows(t, "accumulatedKnowledge")).toHaveLength(1);
	const id = await t.mutation(api.reviewedNavigation.followNounArticle, {
		lemmaId,
	});
	expect((await knowledgeRows(t))[0]?.knowledge.definition).toContain(
		"Artikel",
	);
	expect(await rows(t, "readings")).toHaveLength(1);
	expect(await rows(t, "semanticRelationEdges")).toHaveLength(0);
	expect(await rows(t, "visitorClicks")).toHaveLength(0);
	const before = await snapshot(t);
	expect(
		await t.mutation(api.reviewedNavigation.followNounArticle, { lemmaId }),
	).toBe(id);
	expect(await snapshot(t)).toEqual(before);
});

for (const [article, gender, spelled, canonical] of [
	["Definite", "Masc", "der", "der"],
	["Definite", "Fem", "die", "die"],
	["Definite", "Neut", "das", "das"],
	["Indefinite", "Fem", "eine", "ein"],
] as const) {
	test(`noun composition immediately stores authored Knowledge for ${canonical}`, async () => {
		const t = createTestConvex();
		const reference = nounArticleReference({
			article,
			gender,
			spelled,
			case: "Nom",
			number: "Sing",
		});
		await t.run((ctx) => materializeGrammaticalComponent(ctx, reference));
		const knowledge = (await knowledgeRows(t))[0]?.knowledge;
		expect(knowledge?.definition).toContain(`„${canonical}“`);
		expect(knowledge?.translations.en).toEqual(
			canonical === "ein" ? ["a", "an"] : ["the"],
		);
		expect((await rows(t, "readingEntries"))[0]?.record).toHaveProperty(
			"knowledge",
			knowledge,
		);
		expect(await rows(t, "attestations")).toHaveLength(0);
		expect(await rows(t, "visitorClicks")).toHaveLength(0);
		const before = await snapshot(t);
		await t.run((ctx) => materializeGrammaticalComponent(ctx, reference));
		expect(await snapshot(t)).toEqual(before);
	});
}

test("authored article completion repairs empty entries and preserves existing Knowledge", async () => {
	const t = createTestConvex();
	const reference = nounArticleReference({
		article: "Definite",
		gender: "Fem",
		spelled: "der",
		case: "Dat",
		number: "Sing",
	});
	const complete = () =>
		t.run((ctx) =>
			completeAuthoredComponentKnowledge(ctx, reference.reading),
		);
	await t.run((ctx) => materializeGrammaticalComponent(ctx, reference));
	await t.run(async (ctx) => {
		const entry = await ctx.db.query("readingEntries").first();
		const accumulated = await ctx.db.query("accumulatedKnowledge").first();
		if (!entry || !accumulated) throw new Error("Missing article records");
		await ctx.db.patch(entry._id, {
			record: { notes: "Keep my notes", attestedTranslations: [] },
		});
		await ctx.db.delete(accumulated._id);
	});
	expect(await complete()).toBe(true);
	const [restored] = await knowledgeRows(t);
	expect(restored?.knowledge.definition).toContain("„die“");
	expect((await rows(t, "readingEntries"))[0]?.record).toHaveProperty(
		"notes",
		"Keep my notes",
	);
	if (!restored) throw new Error("Missing restored Knowledge");
	await t.run((ctx) =>
		ctx.db.patch(restored._id, {
			knowledge: { definition: "My edited definition" },
		}),
	);
	await complete();
	expect((await knowledgeRows(t))[0]?.knowledge.definition).toBe(
		"My edited definition",
	);
	const before = await snapshot(t);
	expect(await complete()).toBe(false);
	expect(await snapshot(t)).toEqual(before);
});
