import { expect, test } from "bun:test";
import { getFunctionName } from "convex/server";
import type * as Dumling from "dumling/types";
import * as storageFunctions from "../convex/dumdictStorage";
import {
	loadGrammaticalAlternatives,
	reviewedAlternatives,
} from "../convex/modules/notes/relations";
import { followGrammaticalAlternative } from "../convex/orchestration";
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
function follow(db: IndexedTestDb, readingKey: string) {
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
		followGrammaticalAlternative as unknown as {
			_handler: (ctx: unknown, args: unknown) => Promise<string>;
		}
	)._handler(
		{
			runQuery: (reference: unknown, args: unknown) =>
				runTestQuery(db, implementation(reference), args),
			runMutation: (reference: unknown, args: unknown) =>
				runTestMutation(db, implementation(reference), args),
		},
		{ sourceReadingId: "source-reading", readingKey },
	);
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
	expect(mir).toBeDefined();
	expect(
		alternatives.some(
			(value) =>
				value.canonicalForm === "uns" && value.feature === "number",
		),
	).toBe(true);
	const destination = await follow(db, mir!.readingKey);
	expect(db.rows("readings")).toHaveLength(2);
	expect(db.rows("lemmas")).toHaveLength(2);
	expect(db.rows("surfaces")).toHaveLength(0);
	expect(db.rows("accumulatedKnowledge")).toHaveLength(0);
	const entry = db
		.rows("readingEntries")
		.find((row) => row.readingId === destination)!;
	await db.patch(entry._id, {
		record: {
			...(entry.record as object),
			knowledge: { definition: "User-authored note" },
		},
	});
	const stored = db.snapshot();
	expect(await follow(db, mir!.readingKey)).toBe(destination);
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
