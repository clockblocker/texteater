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
	fusedPieceAt,
	fusedWordAt,
	fusionEntry,
	shorthandSurfaces,
	splitClitic,
	unsplitFusedWord,
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

test("the German fusions keep their attachment shape", () => {
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
	// Intake splits colloquial fusions too, so their article attaches.
	expect(germanFusion("aufs")).toEqual({
		adposition: "auf",
		articleForm: "das",
		articleCase: "Acc",
	});
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
		entry: { surface: ["is", "has", "'s"] },
	});
	// Possessive 's is its own word on any host, a phrase included (ADR 0035).
	expect(splitClitic(englishFusionTable, "England's")).toMatchObject({
		host: "England",
		entry: { clitic: "'s", role: ["Verb", "Verb", "Possessive"] },
	});
	expect(splitClitic(englishFusionTable, "boys'")).toMatchObject({
		host: "boys",
		entry: { clitic: "'", surface: "'s", role: "Possessive" },
	});
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

const words = (...texts: string[]) =>
	texts.map((text) => ({
		kind: text === " " ? "Whitespace" : "ResolvableText",
		text,
	}));

test("a Segment is a piece of the fused word its neighbours spell", () => {
	const im = words("Ich", " ", "bin", " ", "I", "m", " ", "Wald");
	expect(fusedPieceAt(germanFusionTable, im, 5)).toEqual({
		pieces: [
			{ span: "I", surfaces: ["in"] },
			{ span: "m", surfaces: ["dem"] },
		],
		component: 1,
	});
	expect(fusedPieceAt(germanFusionTable, im, 4)?.component).toBe(0);
	expect(fusedPieceAt(germanFusionTable, im, 7)).toBeUndefined();
	// A host keeps its own letters beside its attached clitic.
	expect(
		fusedPieceAt(germanFusionTable, words("geht", "'s", " ", "gut"), 1),
	).toEqual({
		pieces: [
			{ span: "geht", surfaces: [] },
			{ span: "'s", surfaces: ["es", "das"] },
		],
		component: 1,
	});
	// A fused word left whole is no piece.
	expect(
		fusedPieceAt(germanFusionTable, words("im", " ", "Wald"), 0),
	).toBeUndefined();
});

test("a whole fused word is found, and a split one is found by its first piece", () => {
	const split = words("Ich", " ", "bin", " ", "I", "m", " ", "Wald");
	expect(fusedWordAt(germanFusionTable, split, 4)).toEqual([4, 5]);
	expect(fusedWordAt(germanFusionTable, split, 5)).toBeUndefined();
	expect(unsplitFusedWord(germanFusionTable, split)).toBeUndefined();
	expect(
		unsplitFusedWord(
			germanFusionTable,
			words("Ich", " ", "bin", " ", "im"),
		),
	).toBe(4);
	// A host and its clitic is no table fusion.
	expect(
		fusedWordAt(germanFusionTable, words("geht", "'s", " ", "gut"), 0),
	).toBeUndefined();
});

test("free clitics and abbreviations are Shorthand spellings", () => {
	expect(shorthandSurfaces(germanFusionTable, "'ne")).toEqual(["eine"]);
	expect(shorthandSurfaces(germanFusionTable, "’s")).toEqual(["es", "das"]);
	expect(shorthandSurfaces(germanFusionTable, "z.B.")).toEqual([
		"zum Beispiel",
	]);
	expect(shorthandSurfaces(germanFusionTable, "Dipl.-Ing.")).toEqual([
		"Diplom-Ingenieur",
	]);
	expect(shorthandSurfaces(germanFusionTable, "'m")).toBeUndefined();
	expect(shorthandSurfaces(germanFusionTable, "Frage")).toBeUndefined();
});
