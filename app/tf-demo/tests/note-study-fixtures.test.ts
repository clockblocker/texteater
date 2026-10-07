import { describe, expect, test } from "bun:test";
import { NOTE_STUDY_FIXTURES } from "../shared/notes-study/fixtures/index";
import {
	makeUrl,
	NOTE_STUDY_DATABASE,
	NOTE_STUDY_PENDING_RELATIONS,
	NOTE_STUDY_RELATED_DATABASE,
	NOTE_STUDY_RESOLVED_RELATIONS,
} from "../shared/notes-study/note-study-dummy-database";
import type { NoteStudyFixture } from "../shared/notes-study/note-study-fixture";

/**
 * Read through the shared fixture shape: the `as const` tuple only carries
 * the optional sections each fixture happens to author.
 */
const FIXTURES: readonly NoteStudyFixture[] = NOTE_STUDY_FIXTURES;

const routeKey = ({ family, kind }: { family: string; kind: string }) =>
	`${family}/${kind}`;

/**
 * The routes the study covers. A Locution's Idiom or Collocation and a
 * Saying's Proverb or Winged Word are Reading Knowledge, not Kinds (ADR
 * 0039), and the answer word `doch` is an INTJ beside `ach`, so those routes
 * hold two fixtures each.
 */
const STUDIED_ROUTES = [
	"Lexeme/ADJ",
	"Lexeme/ADP",
	"Lexeme/ADV",
	"Lexeme/AUX",
	"Lexeme/CCONJ",
	"Lexeme/DET",
	"Lexeme/INTJ",
	"Lexeme/INTJ",
	"Lexeme/NOUN",
	"Lexeme/NUM",
	"Lexeme/PRON",
	"Lexeme/PROPN",
	"Lexeme/SCONJ",
	"Lexeme/SYM",
	"Lexeme/VERB",
	"Locution/ADV",
	"Locution/VERB",
	"Locution/VERB",
	"Saying/Saying",
	"Saying/Saying",
	"Morpheme/Circumfix",
	"Morpheme/Interfix",
	"Morpheme/Prefix",
	"Morpheme/Root",
	"Morpheme/Suffix",
	"Morpheme/Suffixoid",
];

describe("German note-study fixtures", () => {
	test("normalizes identity, bilingual Knowledge, and occurrences", () => {
		expect(NOTE_STUDY_DATABASE).toHaveLength(26);
		expect(NOTE_STUDY_RELATED_DATABASE).toHaveLength(43);
		expect(NOTE_STUDY_RESOLVED_RELATIONS).toHaveLength(43);
		expect(NOTE_STUDY_PENDING_RELATIONS).toHaveLength(9);

		for (const unit of NOTE_STUDY_DATABASE) {
			expect(unit.reading.lemma.language).toBe("de");
			expect(unit.reading.lemma.coreFeatures).toBeDefined();
			expect(unit.knowledge.translations?.en?.length).toBeGreaterThan(0);
			expect(unit.knowledge.translations?.ru?.length).toBeGreaterThan(0);
			expect(unit.occurrences.length).toBeGreaterThan(0);
			for (const occurrence of unit.occurrences) {
				expect(occurrence.memberSegmentIndices.length).toBeGreaterThan(
					0,
				);
				expect(occurrence.attestation.surface.lemma).toEqual(
					unit.reading.lemma,
				);
			}
		}

		const daemmerung = NOTE_STUDY_DATABASE.find(
			({ reading }) => reading.lemma.canonicalForm === "Dämmerung",
		);
		expect(daemmerung && makeUrl(daemmerung.reading)).toBe(
			"Daemmerung/reading/🌒",
		);
	});

	test("covers the studied German Unit Reading routes", () => {
		expect(FIXTURES.map(routeKey).sort()).toEqual(
			[...STUDIED_ROUTES].sort(),
		);
	});

	test("keeps stable presentation keys and the Dämmerung route", () => {
		const presentationKeys = FIXTURES.map(
			({ presentationKey }) => presentationKey,
		);
		expect(new Set(presentationKeys).size).toBe(presentationKeys.length);
		expect(
			presentationKeys.every(
				(presentationKey) =>
					presentationKey.length > 0 &&
					!presentationKey.includes("/"),
			),
		).toBe(true);
		expect(
			FIXTURES.find(
				({ presentationKey }) => presentationKey === "Daemmerung",
			),
		).toMatchObject({
			family: "Lexeme",
			kind: "NOUN",
			title: ["die ", { text: "Dämmerung", tone: "feminine" }],
			titleText: "Dämmerung",
			translations: ["twilight; dusk", "сумерки"],
		});
	});

	test("keeps Doch on its answer-particle Reading", () => {
		const doch = FIXTURES.find(
			({ presentationKey }) => presentationKey === "Doch",
		);

		expect(doch).toMatchObject({
			summary: "Widerspricht einer verneinten Aussage oder Frage.",
			relations: [
				{
					relation: "antonym",
					content: [{ text: "nein", description: "Antwortpartikel" }],
				},
			],
			translations: [
				"yes (contradicting a negative)",
				"напротив; как раз да",
			],
		});
		expect(
			doch?.contexts.flatMap((context) =>
				context.filter((part) => typeof part !== "string"),
			),
		).toEqual([
			{ text: "Doch", tone: "reference", description: "Antwortpartikel" },
			{ text: "Doch", tone: "reference", description: "Antwortpartikel" },
		]);
	});

	test("models the percent symbol as the Reading", () => {
		const percent = FIXTURES.find(
			({ presentationKey }) => presentationKey === "%",
		);

		expect(percent).toMatchObject({
			family: "Lexeme",
			kind: "SYM",
			titleText: "%",
			tags: [{ text: "#Symbol" }],
		});
		expect(
			percent?.title.map((part) =>
				typeof part === "string" ? part : part.text,
			),
		).toEqual(["%"]);
		expect(
			percent?.contexts.map((context) =>
				context
					.filter((part) => typeof part !== "string")
					.map(({ text }) => text),
			),
		).toEqual([["%"], ["%"]]);
		expect(
			percent?.relations
				?.find(({ relation }) => relation === "synonym")
				?.content.filter((part) => typeof part !== "string")
				.map(({ text }) => text),
		).toEqual(["Prozentsymbol", "Prozentzeichen"]);
	});

	test("keeps Anrufen relations to defensible Lemma targets", () => {
		const anrufen = FIXTURES.find(
			({ presentationKey }) => presentationKey === "Anrufen",
		);

		expect(anrufen).toMatchObject({
			title: [
				{
					text: "anrufen",
					description: "trennbares starkes Verb",
				},
			],
			titleText: "anrufen",
		});
		expect(
			anrufen?.relations?.map(({ relation, content }) => ({
				relation,
				targets: content
					.filter((part) => typeof part !== "string")
					.map(({ text }) => text),
			})),
		).toEqual([
			{ relation: "nearSynonym", targets: ["durchklingeln"] },
			{ relation: "hypernym", targets: ["kontaktieren"] },
		]);
	});

	test("keeps optional learning sections semantically scoped", () => {
		const routesWith = (section: "formation" | "structure") =>
			FIXTURES.filter((fixture) => fixture[section])
				.map(routeKey)
				.sort();
		const routesWithForms = FIXTURES.filter(
			(fixture) => fixture.forms || fixture.formTable,
		)
			.map(routeKey)
			.sort();

		expect(routesWith("formation")).toEqual(
			[
				"Lexeme/ADJ",
				"Lexeme/NOUN",
				"Lexeme/PRON",
				"Lexeme/SCONJ",
				"Lexeme/VERB",
				"Morpheme/Circumfix",
				"Morpheme/Interfix",
				"Morpheme/Prefix",
				"Morpheme/Root",
				"Morpheme/Suffix",
				"Morpheme/Suffixoid",
			].sort(),
		);

		for (const fixture of FIXTURES) {
			if (fixture.family !== "Lexeme" || !fixture.formation) continue;
			expect(fixture.formation).toHaveLength(1);
			const formation = fixture.formation[0]
				?.map((part) => (typeof part === "string" ? part : part.text))
				.join("");
			expect(formation).toContain("|");
			expect(formation).not.toMatch(/[+→]/);
		}
		expect(routesWith("structure")).toEqual(
			[
				"Locution/ADV",
				"Locution/VERB",
				"Locution/VERB",
				"Saying/Saying",
				"Saying/Saying",
			].sort(),
		);
		expect(routesWithForms).toEqual(
			[
				"Lexeme/ADJ",
				"Lexeme/AUX",
				"Lexeme/DET",
				"Lexeme/NOUN",
				"Lexeme/PROPN",
				"Lexeme/VERB",
			].sort(),
		);

		for (const fixture of FIXTURES) {
			if (!fixture.formTable) continue;
			for (const row of fixture.formTable.rows) {
				expect(row.cells).toHaveLength(
					fixture.formTable.columnLabels.length,
				);
			}
		}
	});

	test("separates literal translations from translated explanations", () => {
		const tomatoIdiom = FIXTURES.find(
			({ presentationKey }) =>
				presentationKey === "Tomaten-auf-den-Augen-haben",
		);
		const morningProverb = FIXTURES.find(
			({ presentationKey }) =>
				presentationKey === "Morgenstund-hat-Gold-im-Mund",
		);

		expect(tomatoIdiom).toMatchObject({
			translations: [
				"to have tomatoes on one’s eyes",
				"иметь помидоры на глазах",
			],
			translatedExplanations: [
				"to be blind to the obvious",
				"не видеть очевидного; словно глаза не видят",
			],
		});
		expect(morningProverb).toMatchObject({
			translations: [
				"The morning hour has gold in its mouth.",
				"Утренний час — с золотом во рту.",
			],
			translatedExplanations: [
				"The early bird catches the worm.",
				"Кто рано встаёт, тому Бог подаёт.",
			],
		});

		for (const fixture of FIXTURES) {
			for (const line of [
				...fixture.translations,
				...(fixture.translatedExplanations ?? []),
			]) {
				expect(line).not.toMatch(/^(English|Русский):\s/);
			}
		}
	});

	test("omits relations where the Reading Block catalog does", () => {
		for (const fixture of FIXTURES) {
			if (fixture.family === "Morpheme") {
				expect(fixture.relations).toBeUndefined();
			}
		}
	});
});
