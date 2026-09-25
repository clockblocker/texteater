import { expect, test } from "bun:test";
import { authoredRealizations } from "../src/concrete-lang/de/authored-closed-sets/realizations.js";
import {
	germanAbbreviations,
	germanClitics,
	germanFusions,
	germanFusionTable,
} from "../src/concrete-lang/de/fusion-entries.js";
import { germanFusion } from "../src/concrete-lang/de/fusions.js";
import { englishFusionTable } from "../src/concrete-lang/en/fusion-entries.js";
import {
	abbreviationEntry,
	fusionEntry,
	splitClitic,
	validateFusionTable,
} from "../src/universal/fusion-table.js";

const authoredSpellings = (kind: string) =>
	new Set(
		authoredRealizations
			.filter((mapping) => mapping.member.lemma.kind === kind)
			.map((mapping) => mapping.spelled),
	);

test("both fusion tables satisfy the table invariants", () => {
	validateFusionTable(germanFusionTable);
	validateFusionTable(englishFusionTable);
});

test("the eight standard German fusions keep their attachment shape", () => {
	const standard = germanFusions.filter(
		(entry) => entry.register === "Standard",
	);
	expect(standard.map((entry) => entry.form)).toEqual([
		"im",
		"ins",
		"zum",
		"zur",
		"am",
		"ans",
		"beim",
		"vom",
	]);
	expect(germanFusion("Im")).toEqual({
		adposition: "in",
		articleForm: "dem",
		articleCase: "Dat",
	});
	expect(germanFusion("zur")).toEqual({
		adposition: "zu",
		articleForm: "der",
		articleCase: "Dat",
	});
	expect(germanFusion("aufs")).toBeUndefined();
	expect(fusionEntry(germanFusionTable, "Aufs")?.register).toBe("Colloquial");
});

const articleForms = new Set([
	"der",
	"die",
	"das",
	"den",
	"dem",
	"des",
	"ein",
	"eine",
	"einen",
	"einem",
	"einer",
	"eines",
]);

test("every German article component is an authored article cell spelling, and clitic expansions are authored spellings", () => {
	const determiners = authoredSpellings("DET");
	const pronouns = authoredSpellings("PRON");
	for (const entry of germanFusions) {
		const article = entry.components[1];
		expect(article.role).toBe("Article");
		expect(articleForms.has(article.surface as string), entry.form).toBe(
			true,
		);
		expect(determiners.has(article.surface as string), entry.form).toBe(
			true,
		);
		expect(article.span.length, entry.form).toBeGreaterThan(0);
	}
	for (const entry of germanClitics) {
		const surfaces =
			typeof entry.surface === "string" ? [entry.surface] : entry.surface;
		for (const surface of surfaces)
			expect(
				articleForms.has(surface) || pronouns.has(surface),
				`${entry.clitic} -> ${surface}`,
			).toBe(true);
		// The clitic residue itself is an authored ein realization (n, ne, ...).
		if (entry.role === "Article" && entry.clitic !== "'m")
			expect(determiners.has(entry.clitic.slice(1)), entry.clitic).toBe(
				true,
			);
	}
});

test("attached clitics split off their host and the apostrophe stays on the clitic", () => {
	expect(splitClitic(germanFusionTable, "geht's")).toMatchObject({
		host: "geht",
		entry: { clitic: "'s", surface: ["es", "das"] },
	});
	expect(splitClitic(germanFusionTable, "auf’m")).toMatchObject({
		host: "auf",
		entry: { clitic: "'m", surface: "dem" },
	});
	expect(splitClitic(germanFusionTable, "in'n")?.entry.surface).toEqual([
		"ein",
		"den",
	]);
	expect(splitClitic(germanFusionTable, "'ne")).toBeUndefined();
	expect(splitClitic(englishFusionTable, "it's")).toMatchObject({
		host: "it",
		entry: { surface: ["is", "has"] },
	});
	expect(splitClitic(englishFusionTable, "John's")).toBeUndefined();
	expect(splitClitic(englishFusionTable, "didn't")).toMatchObject({
		host: "did",
		entry: { surface: "not" },
	});
	expect(splitClitic(englishFusionTable, "won't")).toBeUndefined();
	expect(fusionEntry(englishFusionTable, "Won't")?.components[0]).toEqual({
		span: "wo",
		surface: "will",
		role: "Verb",
	});
});

test("abbreviations expand to a surface and the ruled multi-word Kinds hold", () => {
	const ruled: Record<string, string> = {
		"z.B.": "ADV",
		"z.T.": "ADV",
		"u.a.": "ADV",
		"usw.": "ADV",
		"o.ä.": "ADV",
		"v.a.": "ADV",
		"i.A.": "ADV",
		"d.h.": "CCONJ",
		"bzw.": "CCONJ",
		"Dipl.-Ing.": "NOUN",
	};
	for (const [text, kind] of Object.entries(ruled))
		expect(abbreviationEntry(germanFusionTable, text)?.kind, text).toBe(
			kind,
		);
	expect(abbreviationEntry(germanFusionTable, "z.B.")?.surface).toBe(
		"zum Beispiel",
	);
	expect(abbreviationEntry(englishFusionTable, "e.g.")?.surface).toBe(
		"for example",
	);
	expect(germanAbbreviations.length).toBeGreaterThanOrEqual(12);
	expect(abbreviationEntry(germanFusionTable, "bzw")).toBeUndefined();
});
