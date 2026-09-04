import { describe, expect, test } from "bun:test";
import { supportedReadingRoutes } from "../shared/reading-block-layout";
import { NOTE_STUDY_FIXTURES } from "../src/playground/notes-study/fixtures";

const routeKey = ({ family, kind }: { family: string; kind: string }) =>
	`${family}/${kind}`;

const nonGermanReadingKinds = new Set([
	"Duplifix",
	"Infix",
	"PUNCT",
	"ToneMarking",
	"Transfix",
]);

describe("German note-study fixtures", () => {
	test("covers every studied German Unit Reading Family/Kind once", () => {
		const expectedRoutes = supportedReadingRoutes("de")
			.filter(({ kind }) => !nonGermanReadingKinds.has(kind))
			.map(routeKey)
			.sort();
		const fixtureRoutes = NOTE_STUDY_FIXTURES.map(routeKey).sort();

		expect(NOTE_STUDY_FIXTURES).toHaveLength(28);
		expect(fixtureRoutes).toEqual(expectedRoutes);
		expect(new Set(fixtureRoutes).size).toBe(fixtureRoutes.length);
	});

	test("keeps stable, unique note paths and the Dämmerung route", () => {
		const slugs = NOTE_STUDY_FIXTURES.map(({ slug }) => slug);
		expect(new Set(slugs).size).toBe(slugs.length);
		expect(
			slugs.every((slug) => slug.length > 0 && !slug.includes("/")),
		).toBe(true);
		expect(
			NOTE_STUDY_FIXTURES.find(({ slug }) => slug === "Daemmerung"),
		).toMatchObject({
			family: "Lexeme",
			kind: "NOUN",
			title: ["die ", { text: "Dämmerung", tone: "feminine" }],
			titleText: "Dämmerung",
			translations: ["twilight; dusk", "сумерки"],
		});
	});

	test("keeps Doch on its answer-particle Reading", () => {
		const doch = NOTE_STUDY_FIXTURES.find(({ slug }) => slug === "Doch");

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
		const percent = NOTE_STUDY_FIXTURES.find(({ slug }) => slug === "%");

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
		const anrufen = NOTE_STUDY_FIXTURES.find(
			({ slug }) => slug === "Anrufen",
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
			NOTE_STUDY_FIXTURES.filter((fixture) => fixture[section])
				.map(routeKey)
				.sort();
		const routesWithForms = NOTE_STUDY_FIXTURES.filter(
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
				"Morpheme/Clitic",
				"Morpheme/Interfix",
				"Morpheme/Prefix",
				"Morpheme/Root",
				"Morpheme/Suffix",
				"Morpheme/Suffixoid",
			].sort(),
		);

		for (const fixture of NOTE_STUDY_FIXTURES) {
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
				"Phraseme/Aphorism",
				"Phraseme/Collocation",
				"Phraseme/DiscourseFormula",
				"Phraseme/Idiom",
				"Phraseme/Proverb",
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

		for (const fixture of NOTE_STUDY_FIXTURES) {
			if (!fixture.formTable) continue;
			for (const row of fixture.formTable.rows) {
				expect(row.cells).toHaveLength(
					fixture.formTable.columnLabels.length,
				);
			}
		}
	});

	test("separates literal translations from translated explanations", () => {
		const tomatoIdiom = NOTE_STUDY_FIXTURES.find(
			({ slug }) => slug === "Tomaten-auf-den-Augen-haben",
		);
		const morningProverb = NOTE_STUDY_FIXTURES.find(
			({ slug }) => slug === "Morgenstund-hat-Gold-im-Mund",
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

		for (const fixture of NOTE_STUDY_FIXTURES) {
			for (const line of [
				...fixture.translations,
				...(fixture.translatedExplanations ?? []),
			]) {
				expect(line).not.toMatch(/^(English|Русский):\s/);
			}
		}
	});

	test("omits relations where the Reading Block catalog does", () => {
		for (const fixture of NOTE_STUDY_FIXTURES) {
			if (
				fixture.family === "Morpheme" ||
				(fixture.family === "Lexeme" && fixture.kind === "X")
			) {
				expect(fixture.relations).toBeUndefined();
			}
		}
	});
});
