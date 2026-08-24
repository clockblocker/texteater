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

	test("assembles the exact fixed jemand Reading and Knowledge through the ordinary loader input", () => {
		const entries = fixedReadingEntries().filter(
			({ reading }) =>
				reading.lemma.canonicalForm === "jemand" &&
				reading.lemma.kind === "PRON" &&
				reading.lemma.coreFeatures.pronType === "Ind",
		);

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			reading: { emojiDescription: "👤" },
			knowledge: {
				definition:
					"Das Indefinitpronomen „jemand“ verweist auf eine nicht näher bestimmte Person.",
				translations: { en: ["someone", "somebody"] },
			},
			attestations: [],
		});
	});

	test("assembles the exact fixed niemand Reading and Knowledge through the ordinary loader input", () => {
		const entries = fixedReadingEntries().filter(
			({ reading }) =>
				reading.lemma.canonicalForm === "niemand" &&
				reading.lemma.kind === "PRON" &&
				reading.lemma.coreFeatures.pronType === "Neg",
		);

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			reading: { emojiDescription: "🚫" },
			knowledge: {
				definition:
					"Das Negativpronomen „niemand“ bezeichnet keine Person.",
				translations: { en: ["nobody", "no one"] },
			},
			attestations: [],
		});
	});

	test("assembles keiner Knowledge and its two Lemma-targeted Near Synonyms", () => {
		const entries = fixedReadingEntries().filter(
			({ reading }) => reading.lemma.canonicalForm === "keiner",
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			reading: { emojiDescription: "🚫" },
			knowledge: {
				translations: { en: ["none", "no one"] },
				semanticRelations: {
					targetKind: "lemma",
					nearSynonym: expect.arrayContaining([
						expect.objectContaining({ canonicalForm: "niemand" }),
						expect.objectContaining({ canonicalForm: "nichts" }),
					]),
				},
			},
			attestations: [],
		});
	});

	test("assembles the one fixed jedermann Reading without relations", () => {
		const entries = fixedReadingEntries().filter(
			({ reading }) => reading.lemma.canonicalForm === "jedermann",
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			reading: { emojiDescription: "🌐" },
			knowledge: {
				translations: { en: ["everyone", "everybody"] },
			},
			attestations: [],
		});
		expect(entries[0]?.knowledge?.semanticRelations).toBeUndefined();
	});

	test("assembles the one fixed mancher Reading without relations", () => {
		const entries = fixedReadingEntries().filter(
			({ reading }) =>
				reading.lemma.canonicalForm === "mancher" &&
				reading.lemma.kind === "PRON",
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			reading: { emojiDescription: "🌐" },
			knowledge: { translations: { en: ["some", "many a one"] } },
			attestations: [],
		});
		expect(entries[0]?.knowledge?.semanticRelations).toBeUndefined();
	});

	test("assembles one plural-only mehrere Reading and Knowledge without relations", () => {
		const inventory = assembleFixedInventory();
		const entries = inventory.readingEntries.filter(
			({ reading }) =>
				reading.lemma.kind === "PRON" &&
				reading.lemma.canonicalForm === "mehrere" &&
				reading.lemma.coreFeatures.pronType === "Tot",
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			reading: { emojiDescription: "🌐" },
			knowledge: {
				definition:
					"Das Totalpronomen „mehrere“ bezeichnet eine unbestimmte Mehrzahl von Personen oder Sachen.",
				translations: { en: ["several", "multiple"] },
			},
			attestations: [],
		});
		expect(entries[0]?.knowledge?.semanticRelations).toBeUndefined();
		expect(
			inventory.grammaticalRelations.filter(
				({ source, target }) =>
					source.lemma.canonicalForm === "mehrere" ||
					target.lemma.canonicalForm === "mehrere",
			),
		).toEqual([]);
	});

	test("assembles all four exact interrogative Readings and Knowledge through the ordinary loader input", () => {
		const entries = fixedReadingEntries().filter(
			({ reading }) =>
				reading.lemma.kind === "PRON" &&
				reading.lemma.coreFeatures.pronType === "Int",
		);

		expect(
			entries.map(({ reading, knowledge }) => ({
				canonicalForm: reading.lemma.canonicalForm,
				emojiDescription: reading.emojiDescription,
				translations: knowledge?.translations?.en,
				semanticRelations: knowledge?.semanticRelations,
			})),
		).toEqual([
			{
				canonicalForm: "wer",
				emojiDescription: "❓",
				translations: ["who"],
				semanticRelations: undefined,
			},
			{
				canonicalForm: "wen",
				emojiDescription: "❓",
				translations: ["whom"],
				semanticRelations: undefined,
			},
			{
				canonicalForm: "wem",
				emojiDescription: "❓",
				translations: ["whom"],
				semanticRelations: undefined,
			},
			{
				canonicalForm: "wessen",
				emojiDescription: "❓",
				translations: ["whose"],
				semanticRelations: undefined,
			},
		]);
	});

	test("assembles one fixed nichts Reading and Knowledge through the ordinary loader input", () => {
		const entries = fixedReadingEntries().filter(
			({ reading }) =>
				reading.lemma.kind === "PRON" &&
				reading.lemma.canonicalForm === "nichts",
		);

		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			reading: {
				emojiDescription: "🚫",
				lemma: { coreFeatures: { pronType: "Neg" } },
			},
			knowledge: {
				definition:
					"Das Negativpronomen „nichts“ verneint das Vorhandensein einer Sache.",
				translations: { en: ["nothing"] },
			},
		});
	});

	test("assembles one fixed jeder Reading and Knowledge through the ordinary loader input", () => {
		const entries = fixedReadingEntries().filter(
			({ reading }) =>
				reading.lemma.kind === "PRON" &&
				reading.lemma.canonicalForm === "jeder" &&
				reading.lemma.coreFeatures.pronType === "Tot",
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			reading: { emojiDescription: "🌐" },
			knowledge: {
				definition:
					"Das Totalpronomen „jeder“ bezeichnet jedes einzelne Mitglied einer Gruppe.",
				translations: { en: ["everyone", "each"] },
			},
		});
	});

	test("assembles separate jedweder Knowledge with its Lemma-targeted jeder Synonym", () => {
		const entries = fixedReadingEntries().filter(
			({ reading }) =>
				reading.lemma.kind === "PRON" &&
				reading.lemma.canonicalForm === "jedweder",
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			reading: {
				emojiDescription: "🌐",
				lemma: { coreFeatures: { pronType: "Tot" } },
			},
			knowledge: {
				definition:
					"Das gehoben oder veraltet wirkende Totalpronomen „jedweder“ bezeichnet nachdrücklich jedes einzelne Mitglied einer Gruppe.",
				translations: { en: ["each and every", "everyone"] },
				semanticRelations: {
					targetKind: "lemma",
					synonym: [
						expect.objectContaining({ canonicalForm: "jeder" }),
					],
				},
			},
		});
	});

	test("assembles jeglicher Knowledge with only its authored jeder Synonym seed", () => {
		const entries = fixedReadingEntries().filter(
			({ reading }) => reading.lemma.canonicalForm === "jeglicher",
		);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({
			reading: {
				emojiDescription: "🌐",
				lemma: { coreFeatures: { pronType: "Tot" } },
			},
			knowledge: {
				translations: { en: ["each", "any", "every one"] },
				semanticRelations: {
					targetKind: "lemma",
					synonym: [
						expect.objectContaining({ canonicalForm: "jeder" }),
					],
				},
			},
		});
		expect(entries[0]?.knowledge?.semanticRelations?.synonym).toHaveLength(
			1,
		);
	});

	test("assembles total Readings, Knowledge, and their NumberCounterpart through the ordinary loader input", () => {
		const inventory = assembleFixedInventory();
		const totals = inventory.readingEntries.filter(
			({ reading }) =>
				reading.lemma.kind === "PRON" &&
				reading.lemma.coreFeatures.pronType === "Tot" &&
				["alles", "alle"].includes(reading.lemma.canonicalForm),
		);

		expect(
			totals.map(({ reading, knowledge }) => ({
				canonicalForm: reading.lemma.canonicalForm,
				emojiDescription: reading.emojiDescription,
				translations: knowledge?.translations?.en,
				semanticRelations: knowledge?.semanticRelations,
			})),
		).toEqual([
			{
				canonicalForm: "alles",
				emojiDescription: "🌐",
				translations: ["everything", "all"],
				semanticRelations: undefined,
			},
			{
				canonicalForm: "alle",
				emojiDescription: "🌐",
				translations: ["all", "everyone"],
				semanticRelations: undefined,
			},
		]);
		expect(
			inventory.grammaticalRelations
				.filter(
					({ relation, source }) =>
						relation === "NumberCounterpart" &&
						source.lemma.coreFeatures.pronType === "Tot",
				)
				.map(({ source, target }) => [
					source.lemma.canonicalForm,
					target.lemma.canonicalForm,
				]),
		).toEqual([["alle", "alles"]]);
	});

	test("assembles only the promoted formal-address NumberCounterparts through the ordinary loader input", () => {
		const relations = assembleFixedInventory().grammaticalRelations.filter(
			({ relation, source }) =>
				relation === "NumberCounterpart" &&
				(source.lemma.coreFeatures.polite === "Form" ||
					source.lemma.coreFeatures.pronType === "Tot"),
		);

		expect(
			relations.map(({ source, target }) => ({
				canonicalForm: source.lemma.canonicalForm,
				sourceNumber: source.lemma.coreFeatures.referenceNumber,
				targetCanonicalForm: target.lemma.canonicalForm,
				targetNumber: target.lemma.coreFeatures.referenceNumber,
			})),
		).toEqual([
			{
				canonicalForm: "alle",
				sourceNumber: null,
				targetCanonicalForm: "alles",
				targetNumber: null,
			},
			{
				canonicalForm: "Sie",
				sourceNumber: "Plur",
				targetCanonicalForm: "Sie",
				targetNumber: "Sing",
			},
			{
				canonicalForm: "Ihnen",
				sourceNumber: "Plur",
				targetCanonicalForm: "Ihnen",
				targetNumber: "Sing",
			},
			{
				canonicalForm: "Ihrer",
				sourceNumber: "Plur",
				targetCanonicalForm: "Ihrer",
				targetNumber: "Sing",
			},
		]);
		expect(
			relations
				.slice(1)
				.every(
					({ source, target }) =>
						readingFingerprint(source) !==
							readingFingerprint(target) &&
						source.lemma.coreFeatures.poss === null &&
						target.lemma.coreFeatures.poss === null,
				),
		).toBe(true);
	});

	test("assembles separate der demonstrative and relative Readings, Knowledge, and relations", () => {
		const inventory = assembleFixedInventory();
		const entries = inventory.readingEntries.filter(
			({ reading }) =>
				reading.lemma.kind === "PRON" &&
				["Dem", "Rel"].includes(
					reading.lemma.coreFeatures.pronType ?? "",
				),
		);
		expect(entries).toHaveLength(16);
		for (const pronType of ["Dem", "Rel"] as const) {
			const population = entries.filter(
				({ reading }) =>
					reading.lemma.coreFeatures.pronType === pronType,
			);
			expect(population).toHaveLength(8);
			for (const { knowledge } of population) {
				expect(knowledge?.semanticRelations?.targetKind).toBe(
					"reading",
				);
				expect(knowledge?.semanticRelations?.synonym).toHaveLength(7);
				expect(
					knowledge?.semanticRelations?.synonym?.every(
						(target) =>
							"lemma" in target &&
							target.lemma.coreFeatures.pronType === pronType,
					),
				).toBe(true);
			}
		}

		const claims = inventory.grammaticalRelations.filter(
			({ source }) =>
				"lemma" in source &&
				["Dem", "Rel"].includes(
					source.lemma.coreFeatures.pronType ?? "",
				),
		);
		expect(claims).toHaveLength(38);
		expect(
			claims.every(
				({ source, target }) =>
					"lemma" in source &&
					"lemma" in target &&
					source.lemma.coreFeatures.pronType ===
						target.lemma.coreFeatures.pronType &&
					readingFingerprint(source) !== readingFingerprint(target),
			),
		).toBe(true);
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

	test("commits fixed mehrere through ordinary tables, marks Knowledge Full, and reruns without writes", async () => {
		const entry = fixedReadingEntries().find(
			(candidate) => candidate.reading.lemma.canonicalForm === "mehrere",
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
