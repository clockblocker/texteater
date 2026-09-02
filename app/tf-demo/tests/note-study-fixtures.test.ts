import { describe, expect, test } from "bun:test";
import { supportedReadingRoutes } from "../shared/reading-block-layout";
import { NOTE_STUDY_FIXTURES } from "../src/playground/notes-study/fixtures";

const routeKey = ({ family, kind }: { family: string; kind: string }) =>
	`${family}/${kind}`;

describe("German note-study fixtures", () => {
	test("covers every supported German Unit Reading Family/Kind once", () => {
		const expectedRoutes = supportedReadingRoutes("de")
			.map(routeKey)
			.sort();
		const fixtureRoutes = NOTE_STUDY_FIXTURES.map(routeKey).sort();

		expect(NOTE_STUDY_FIXTURES).toHaveLength(33);
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

	test("omits relations where the Reading Block catalog does", () => {
		for (const fixture of NOTE_STUDY_FIXTURES) {
			if (
				fixture.family === "Morpheme" ||
				(fixture.family === "Lexeme" &&
					(fixture.kind === "PUNCT" || fixture.kind === "X"))
			) {
				expect(fixture.relations).toBeUndefined();
			}
		}
	});
});
