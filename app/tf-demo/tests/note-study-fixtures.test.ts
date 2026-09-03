import { describe, expect, test } from "bun:test";
import { supportedReadingRoutes } from "../shared/reading-block-layout";
import { NOTE_STUDY_FIXTURES } from "../src/playground/notes-study/fixtures";

const routeKey = ({ family, kind }: { family: string; kind: string }) =>
	`${family}/${kind}`;

describe("German note-study fixtures", () => {
	test("covers every studied German Unit Reading Family/Kind once", () => {
		const expectedRoutes = supportedReadingRoutes("de")
			.filter(({ kind }) => kind !== "PUNCT")
			.map(routeKey)
			.sort();
		const fixtureRoutes = NOTE_STUDY_FIXTURES.map(routeKey).sort();

		expect(NOTE_STUDY_FIXTURES).toHaveLength(32);
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
		).toMatchObject({ family: "Lexeme", kind: "NOUN" });
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
				"Morpheme/Duplifix",
				"Morpheme/Infix",
				"Morpheme/Interfix",
				"Morpheme/Prefix",
				"Morpheme/Root",
				"Morpheme/Suffix",
				"Morpheme/Suffixoid",
				"Morpheme/ToneMarking",
				"Morpheme/Transfix",
			].sort(),
		);

		for (const fixture of NOTE_STUDY_FIXTURES) {
			if (fixture.family !== "Lexeme" || !fixture.formation) continue;
			expect(fixture.formation).toHaveLength(1);
			const formation = fixture.formation[0]
				?.map((part) => (typeof part === "string" ? part : part.text))
				.join("");
			expect(formation).toContain(" | ");
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
				"Phraseme/Collocation",
				"Phraseme/Idiom",
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
