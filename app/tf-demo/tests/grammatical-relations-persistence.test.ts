import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { germanArticleCell } from "dumspec/inventories";
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
import { authoredComponent } from "../server/authoredMembers";
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
		person: "1",
		polite: null,
		poss: null,
		pronType: "Prs",
		case: "Acc",
		number: "Sing",
		gender: null,
	},
};
const reading: Dumling.Reading<"de", "Lexeme", "PRON"> = {
	unitKind: "Reading",
	lemma,
	emojiDescription: "👤",
};
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

test("a stem determiner's forms stay inside its Lemma: diesem never reaches jenem", () => {
	const dieser: Dumling.Lemma<"de", "Lexeme", "DET"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "DET",
		canonicalForm: "dieser",
		coreFeatures: {
			case: null,
			definite: null,
			gender: null,
			number: null,
			numType: null,
			person: null,
			polite: null,
			poss: null,
			pronType: "Dem",
		},
	};
	// Every form of dieser belongs to this one Reading Note; no alternative
	// opens another Lemma's note.
	expect(reviewedAlternatives(dieser)).toEqual([]);
});

/** The authored article cell `spelled` names for its Head's agreement (system ADR 0040). */
function articleComponent(
	spelled: string,
	head: { case: string; number: string; gender: string | null },
) {
	const member = germanArticleCell(
		{ attested: spelled, orthography: "Standard" },
		head,
	);
	if (!member) throw new Error(`No article cell for ${spelled}.`);
	return authoredComponent(member);
}

for (const [article, gender, spelled, canonical] of [
	["Definite", "Masc", "der", "der"],
	["Definite", "Fem", "die", "die"],
	["Definite", "Neut", "das", "das"],
	["Indefinite", "Fem", "eine", "eine"],
] as const) {
	test(`noun composition immediately stores authored Knowledge for ${canonical}`, async () => {
		const t = createTestConvex();
		const reference = articleComponent(spelled, {
			case: "Nom",
			number: "Sing",
			gender,
		});
		await t.run((ctx) => materializeGrammaticalComponent(ctx, reference));
		const knowledge = (await knowledgeRows(t))[0]?.knowledge;
		expect(knowledge?.definition).toContain(`„${canonical}“`);
		expect(knowledge?.translations.en).toEqual(
			article === "Indefinite" ? ["a", "an"] : ["the"],
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
	const reference = articleComponent("der", {
		case: "Dat",
		number: "Sing",
		gender: "Fem",
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
	// Dative feminine der is its own article cell (system ADR 0032).
	expect(restored?.knowledge.definition).toContain("„der“");
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
