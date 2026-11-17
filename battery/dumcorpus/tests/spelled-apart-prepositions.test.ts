import { expect, test } from "bun:test";
import { loadSpecRecords } from "../src/index.js";
import { germanAdpositionEntry } from "../src/inventories/de/adposition-cases.js";
import { germanSpelledApartPrepositions } from "../src/inventories/de/spelled-apart-prepositions.js";

const pairs = Object.entries(germanSpelledApartPrepositions);

test("each two-word spelling is its preposition's letters with one space", () => {
	for (const [canonicalForm, apart] of pairs) {
		expect(apart.split(" ")).toHaveLength(2);
		expect(apart.replace(" ", "").toLocaleLowerCase("de")).toBe(
			canonicalForm,
		);
	}
});

test("each listed preposition is a genitive Lexeme ADP in the ADP Case Table", () => {
	for (const [canonicalForm] of pairs) {
		const entry = germanAdpositionEntry({
			family: "Lexeme",
			canonicalForm,
		});
		if (entry?.family !== "Lexeme")
			throw Error(`${canonicalForm} unlisted`);
		expect(entry.positions.Prep?.allowed).toEqual(["Gen"]);
	}
});

test("one-word-only prepositions and in Folge are not listed", () => {
	expect(Object.keys(germanSpelledApartPrepositions)).not.toContain("anhand");
	expect(Object.keys(germanSpelledApartPrepositions)).not.toContain(
		"infolge",
	);
});

test("gold writes a listed two-word spelling as its Lexeme ADP's Licensed Variant", () => {
	const apart = new Map<string, string>(
		pairs.map(([form, spelled]) => [spelled, form]),
	);
	const found: string[] = [];
	for (const record of loadSpecRecords())
		for (const target of record.targets) {
			const surface = target.attestation?.surface;
			if (surface?.language !== "de") continue;
			const canonicalForm = apart.get(
				surface.normalizedSurface.replace(/^\p{L}/u, (letter) =>
					letter.toLocaleLowerCase("de"),
				),
			);
			if (canonicalForm === undefined) continue;
			found.push(canonicalForm);
			expect({
				family: surface.lemma.family,
				kind: surface.lemma.kind,
				canonicalForm: surface.lemma.canonicalForm,
				spelling: surface.spelling,
			}).toEqual({
				family: "Lexeme",
				kind: "ADP",
				canonicalForm,
				spelling: { kind: "Variant", variantTags: ["Licensed"] },
			});
		}
	expect(found).toContain("aufgrund");
	expect(found).toContain("mithilfe");
});
