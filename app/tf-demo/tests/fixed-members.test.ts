import { describe, expect, test } from "bun:test";
import { readingFingerprint } from "dumling/reading";
import {
	commitFixedLemma,
	commitFixedMember,
} from "../convex/fixedMemberPersistence";
import {
	assembleFixedInventory,
	fixedReadingEntries,
} from "../server/fixedMemberAssembly";
import { IndexedTestDb, runTestMutation } from "./support/indexed-db";

describe("fixed-member assembly", () => {
	test("retains a fixed Lemma when its route deliberately has no Reading catalog", () => {
		const lemma = fixedReadingEntries()[0]?.reading.lemma;
		if (!lemma) throw new Error("Expected a representative fixed Lemma.");

		const inventory = assembleFixedInventory({
			lemmaCatalogs: [{ route: { language: "de" }, members: [lemma] }],
			readingsFor: () => undefined,
			knowledgeFor: () => {
				throw new Error(
					"Knowledge must not be read for a Lemma-only route.",
				);
			},
		});

		expect(inventory.lemmas).toEqual([lemma]);
		expect(inventory.readingEntries).toEqual([]);
	});

	test("assembles a unique ordinary Reading Entry for every authored fixed Reading", () => {
		const entries = fixedReadingEntries();
		const keys = entries.map(({ reading }) => readingFingerprint(reading));

		expect(entries.length).toBeGreaterThan(0);
		expect(new Set(keys).size).toBe(entries.length);
		for (const entry of entries) {
			expect(entry.reading.lemma.language).toBe("de");
			expect(entry.knowledge).toBeDefined();
			expect(entry.attestedTranslations).toEqual([]);
			expect(entry.attestations).toEqual([]);
			expect(entry.notes).toBe("");
		}
	});

	test("commits a Lemma-only member idempotently through the ordinary Lemma table", async () => {
		const lemma = fixedReadingEntries()[0]?.reading.lemma;
		if (!lemma) throw new Error("Expected a representative fixed Lemma.");
		const db = new IndexedTestDb();

		expect(await runTestMutation(db, commitFixedLemma, { lemma })).toEqual({
			status: "loaded",
		});
		expect(db.rows("dictionaryLemmas")).toHaveLength(1);
		expect(db.rows("readings")).toEqual([]);
		const afterLoad = db.snapshot();

		expect(await runTestMutation(db, commitFixedLemma, { lemma })).toEqual({
			status: "unchanged",
		});
		expect(db.snapshot()).toEqual(afterLoad);
	});

	test("commits through ordinary tables, marks Knowledge Full, and reruns without writes", async () => {
		const entry = fixedReadingEntries().find(
			(candidate) => candidate.knowledge?.semanticRelations === undefined,
		);
		if (!entry) throw new Error("Expected a representative fixed member.");
		const readingKey = readingFingerprint(entry.reading);
		const plan = {
			baseRevision: "convex-0",
			changes: [
				{
					type: "createLemma",
					record: { lemma: entry.reading.lemma },
					preconditions: [
						{ kind: "revisionMatches", revision: "convex-0" },
						{ kind: "lemmaMissing", lemma: entry.reading.lemma },
					],
				},
				{
					type: "createReading",
					entry,
					preconditions: [
						{ kind: "revisionMatches", revision: "convex-0" },
						{ kind: "lemmaExists", lemma: entry.reading.lemma },
						{ kind: "readingMissing", reading: entry.reading },
					],
				},
			],
		};
		const db = new IndexedTestDb();

		expect(
			await runTestMutation(db, commitFixedMember, {
				plan,
				readingKey,
				expectedEntry: entry,
			}),
		).toEqual({ status: "loaded" });
		expect(db.rows("dictionaryLemmas")).toHaveLength(1);
		expect(db.rows("readings")).toHaveLength(1);
		expect(db.rows("readingEntries")).toHaveLength(1);
		expect(db.rows("accumulatedKnowledge")[0]).toMatchObject({
			ownerReadingKey: readingKey,
			status: "Full",
		});
		const afterLoad = db.snapshot();

		expect(
			await runTestMutation(db, commitFixedMember, {
				plan: { baseRevision: "convex-1", changes: [] },
				readingKey,
				expectedEntry: entry,
			}),
		).toEqual({ status: "unchanged" });
		expect(db.snapshot()).toEqual(afterLoad);
	});
});
