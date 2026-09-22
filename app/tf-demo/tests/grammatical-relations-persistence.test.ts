import { expect, test } from "bun:test";
import { getFunctionName } from "convex/server";
import { nounArticleReference } from "dumgen";
import type * as Dumling from "dumling/types";
import * as storageFunctions from "../convex/dumdictStorage";
import {
	completeAuthoredComponentKnowledge,
	materializeGrammaticalComponent,
} from "../convex/dumdictStorage/transaction";
import {
	loadGrammaticalAlternatives,
	reviewedAlternatives,
} from "../convex/modules/notes/relations";
import {
	followGrammaticalAlternative,
	followNounArticle,
} from "../convex/orchestration";
import * as navigationFunctions from "../convex/reviewedNavigation";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import {
	IndexedTestDb,
	runTestMutation,
	runTestQuery,
} from "./support/indexed-db";

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
function database() {
	return new IndexedTestDb({
		lemmas: [
			{
				_id: "source-lemma",
				lemmaKey: lemmaIdentityKey(lemma),
				...lemma,
			},
		],
		readings: [
			{
				_id: "source-reading",
				readingKey: readingIdentityKey(reading),
				lemmaId: "source-lemma",
				emojiDescription: reading.emojiDescription,
			},
		],
	});
}
function runNavigation(db: IndexedTestDb, action: unknown, args: unknown) {
	const functions = new Map<string, unknown>([
		...Object.entries(storageFunctions).map(
			([name, fn]) => [`dumdictStorage:${name}`, fn] as const,
		),
		...Object.entries(navigationFunctions).map(
			([name, fn]) => [`reviewedNavigation:${name}`, fn] as const,
		),
	]);
	const implementation = (reference: unknown) => {
		const name = getFunctionName(reference as never);
		const fn = functions.get(name);
		if (!fn) throw new Error(`Unexpected function: ${name}`);
		return fn;
	};
	return (
		action as {
			_handler: (ctx: unknown, args: unknown) => Promise<string>;
		}
	)._handler(
		{
			runQuery: (reference: unknown, args: unknown) =>
				runTestQuery(db, implementation(reference), args),
			runMutation: (reference: unknown, args: unknown) =>
				runTestMutation(db, implementation(reference), args),
		},
		args,
	);
}

function follow(db: IndexedTestDb, readingKey: string) {
	return runNavigation(db, followGrammaticalAlternative, {
		sourceReadingId: "source-reading",
		readingKey,
	});
}

test("reviewed alternatives are visible without preloading and only the selected Reading is materialized", async () => {
	const db = database();
	const before = db.snapshot();
	const alternatives = await loadGrammaticalAlternatives(
		{ db } as never,
		"source-reading" as never,
	);
	expect(db.snapshot()).toEqual(before);
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
	const destination = await follow(db, mir.readingKey);
	expect(db.rows("readings")).toHaveLength(2);
	expect(db.rows("lemmas")).toHaveLength(2);
	expect(db.rows("surfaces")).toHaveLength(0);
	expect(db.rows("accumulatedKnowledge")).toHaveLength(0);
	const entry = db
		.rows("readingEntries")
		.find((row) => row.readingId === destination);
	if (!entry) throw Error("Expected the destination reading entry");
	await db.patch(entry._id, {
		record: {
			...(entry.record as object),
			knowledge: { definition: "User-authored note" },
		},
	});
	const stored = db.snapshot();
	expect(await follow(db, mir.readingKey)).toBe(destination);
	expect(db.snapshot()).toEqual(stored);
});

test("unreviewed destinations cannot create arbitrary Readings", async () => {
	const db = database();
	const before = db.snapshot();
	await expect(follow(db, "invented-reading")).rejects.toThrow(
		"not a reviewed",
	);
	expect(db.snapshot()).toEqual(before);
	expect(
		reviewedAlternatives({ ...lemma, canonicalForm: "unreviewed" }),
	).toEqual([]);
});

test("noun heading navigation materializes the authored DET Reading without relations or encounters", async () => {
	const noun = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Frau",
		coreFeatures: { gender: "Fem", hyph: null },
	} as const;
	const db = new IndexedTestDb({
		lemmas: [
			{ ...noun, _id: "noun-lemma", lemmaKey: lemmaIdentityKey(noun) },
		],
	});
	const id = await runNavigation(db, followNounArticle, {
		lemmaId: "noun-lemma",
	});
	const reading = await db.get(id);
	expect(await db.get(String(reading?.lemmaId))).toMatchObject({
		kind: "DET",
		canonicalForm: "die",
	});
	const knowledge = db.rows("accumulatedKnowledge")[0]?.knowledge as
		| { definition?: string }
		| undefined;
	expect(knowledge?.definition).toContain("Artikel");
	for (const table of [
		"surfaces",
		"attestations",
		"visitorClicks",
		"semanticRelationEdges",
	])
		expect(db.rows(table)).toHaveLength(0);
	const before = db.snapshot();
	expect(
		await runNavigation(db, followNounArticle, { lemmaId: "noun-lemma" }),
	).toBe(id);
	expect(db.snapshot()).toEqual(before);
});

test("noun heading navigation rejects non-nouns before writing", async () => {
	const db = database();
	const before = db.snapshot();
	await expect(
		runNavigation(db, followNounArticle, { lemmaId: "source-lemma" }),
	).rejects.toThrow("no noun heading article");
	expect(db.snapshot()).toEqual(before);
});

test("noun composition creates its article Reading with authored Knowledge before navigation", async () => {
	const noun = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Frau",
		coreFeatures: { gender: "Fem", hyph: null },
	} as const;
	const db = new IndexedTestDb({
		lemmas: [
			{ ...noun, _id: "noun-lemma", lemmaKey: lemmaIdentityKey(noun) },
		],
	});
	const reference = nounArticleReference({
		article: "Definite",
		case: "Dat",
		number: "Sing",
		gender: "Fem",
		spelled: "der",
	});
	await materializeGrammaticalComponent({ db } as never, reference);
	expect(db.rows("accumulatedKnowledge")).toHaveLength(1);
	const id = await runNavigation(db, followNounArticle, {
		lemmaId: "noun-lemma",
	});
	const knowledge = db.rows("accumulatedKnowledge")[0]?.knowledge as
		| { definition?: string }
		| undefined;
	expect(knowledge?.definition).toContain("Artikel");
	expect(db.rows("readings")).toHaveLength(1);
	expect(db.rows("semanticRelationEdges")).toHaveLength(0);
	expect(db.rows("visitorClicks")).toHaveLength(0);
	const before = db.snapshot();
	expect(
		await runNavigation(db, followNounArticle, { lemmaId: "noun-lemma" }),
	).toBe(id);
	expect(db.snapshot()).toEqual(before);
});

for (const [article, gender, spelled, canonical] of [
	["Definite", "Masc", "der", "der"],
	["Definite", "Fem", "die", "die"],
	["Definite", "Neut", "das", "das"],
	["Indefinite", "Fem", "eine", "ein"],
] as const) {
	test(`noun composition immediately stores authored Knowledge for ${canonical}`, async () => {
		const db = new IndexedTestDb({});
		const reference = nounArticleReference({
			article,
			gender,
			spelled,
			case: "Nom",
			number: "Sing",
		});
		await materializeGrammaticalComponent({ db } as never, reference);
		const knowledge = db.rows("accumulatedKnowledge")[0]?.knowledge as {
			definition: string;
			translations: { en: string[] };
		};
		expect(knowledge.definition).toContain(`„${canonical}“`);
		expect(knowledge.translations.en).toEqual(
			canonical === "ein" ? ["a", "an"] : ["the"],
		);
		expect(db.rows("readingEntries")[0]?.record).toHaveProperty(
			"knowledge",
			knowledge,
		);
		expect(db.rows("attestations")).toHaveLength(0);
		expect(db.rows("visitorClicks")).toHaveLength(0);
		const before = db.snapshot();
		await materializeGrammaticalComponent({ db } as never, reference);
		expect(db.snapshot()).toEqual(before);
	});
}

test("authored article backfill repairs empty entries and preserves existing Knowledge", async () => {
	const db = new IndexedTestDb({});
	const reference = nounArticleReference({
		article: "Definite",
		gender: "Fem",
		spelled: "der",
		case: "Dat",
		number: "Sing",
	});
	await materializeGrammaticalComponent({ db } as never, reference);
	const entry = db.rows("readingEntries")[0];
	const accumulated = db.rows("accumulatedKnowledge")[0];
	if (!entry || !accumulated) throw new Error("Missing article records");
	await db.patch(entry._id, {
		record: { notes: "Keep my notes", attestedTranslations: [] },
	});
	await db.delete(accumulated._id);
	expect(
		await completeAuthoredComponentKnowledge(
			{ db } as never,
			reference.reading,
		),
	).toBe(true);
	const restored = db.rows("accumulatedKnowledge")[0];
	expect(
		(restored?.knowledge as { definition: string } | undefined)?.definition,
	).toContain("„die“");
	expect(db.rows("readingEntries")[0]?.record).toHaveProperty(
		"notes",
		"Keep my notes",
	);
	if (!restored) throw new Error("Missing restored Knowledge");
	await db.patch(restored._id, {
		knowledge: { definition: "My edited definition" },
	});
	await completeAuthoredComponentKnowledge(
		{ db } as never,
		reference.reading,
	);
	expect(
		(
			db.rows("accumulatedKnowledge")[0]?.knowledge as
				| {
						definition: string;
				  }
				| undefined
		)?.definition,
	).toBe("My edited definition");
	const before = db.snapshot();
	expect(
		await completeAuthoredComponentKnowledge(
			{ db } as never,
			reference.reading,
		),
	).toBe(false);
	expect(db.snapshot()).toEqual(before);
});
