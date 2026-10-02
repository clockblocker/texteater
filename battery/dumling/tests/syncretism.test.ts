import { describe, expect, test } from "bun:test";
import {
	isSyncreticUnit,
	isSyncretism,
	parseUnit,
	syncretismView,
	syncretize,
} from "dumling";
import { lemmaSchema as nounLemmaSchema } from "dumling/schema/de/lexeme/noun";
import {
	attestationSchema,
	lemmaSchema,
	readingSchema,
	surfaceSchema,
} from "dumling/schema/de/lexeme/pronoun";
import type { Lemma } from "dumling/types";

type Pronoun = Lemma<"de", "Lexeme", "PRON">;
const unmarked = {
	case: null,
	number: null,
	person: null,
	polite: null,
	poss: null,
	pronType: null,
	gender: null,
};
function cell(
	canonicalForm: string,
	features: Partial<Pronoun["coreFeatures"]>,
): Pronoun {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "PRON",
		canonicalForm,
		coreFeatures: { ...unmarked, ...features },
	};
}
// Cells that exist before ADR 0044's gender cells are split again.
const third = { pronType: "Prs", person: "3" } as const;
const sieFeminine = cell("sie", {
	...third,
	case: "Acc",
	number: "Sing",
	gender: "Fem",
});
const siePlural = cell("sie", { ...third, case: "Acc", number: "Plur" });
const sieFormal = cell("Sie", {
	...third,
	case: "Acc",
	number: "Plur",
	polite: "Form",
});
const ihnenPlural = cell("ihnen", { ...third, case: "Dat", number: "Plur" });
const ihnenFormal = cell("Ihnen", {
	...third,
	case: "Dat",
	number: "Plur",
	polite: "Form",
});
const herOrThem = syncretize([sieFeminine, siePlural]);
const themOrYou = syncretize([siePlural, sieFormal]);
const herThemOrYou = syncretize([sieFormal, siePlural, sieFeminine]);
const ihnenThemOrYou = syncretize([ihnenFormal, ihnenPlural]);
const syncretisms = [herOrThem, themOrYou, herThemOrYou, ihnenThemOrYou];

/** Zod's canonical schema and the compiled `parseUnit` agree. */
function accepts(value: unknown, expected: boolean) {
	expect(lemmaSchema.safeParse(value).success).toBe(expected);
	expect(parseUnit(value).success).toBe(expected);
}
function surface(lemma: unknown) {
	return {
		unitKind: "Surface",
		language: "de",
		lemma,
		normalizedSurface: "sie",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: null,
	};
}

describe("syncretize (system ADR 0046)", () => {
	test("lists the Core Features the units disagree on, alphabetically", () => {
		expect(herOrThem.syncretic).toEqual(["gender", "number"]);
		expect(themOrYou.syncretic).toEqual(["polite"]);
		expect(herThemOrYou.syncretic).toEqual(["gender", "number", "polite"]);
		expect(ihnenThemOrYou.syncretic).toEqual(["polite"]);
	});

	test("keeps the features the units agree on and nulls the rest", () => {
		expect(herOrThem.coreFeatures).toEqual({
			...unmarked,
			...third,
			case: "Acc",
		});
		expect(ihnenThemOrYou.coreFeatures).toEqual(ihnenPlural.coreFeatures);
	});

	test("holds the units in identity order, spelled in lowercase", () => {
		expect(themOrYou.syncretized).toEqual([sieFormal, siePlural]);
		expect(herThemOrYou.syncretized).toEqual(
			syncretize([sieFeminine, sieFormal, siePlural]).syncretized,
		);
		expect(themOrYou.canonicalForm).toBe("sie");
		expect(ihnenThemOrYou.canonicalForm).toBe("ihnen");
	});

	test("needs two or more units", () => {
		expect(() => syncretize([siePlural])).toThrow(TypeError);
	});
});

describe("Syncretism shapes on German PRON", () => {
	test("accepts a Syncretism and its view", () => {
		for (const syncretism of syncretisms) {
			accepts(syncretism, true);
			accepts(syncretismView(syncretism), true);
		}
		expect(syncretismView(themOrYou)).not.toHaveProperty("syncretized");
	});

	test("accepts a Surface, Reading and Attestation that name either shape", () => {
		for (const lemma of [themOrYou, syncretismView(themOrYou)]) {
			const named = [
				[surfaceSchema, surface(lemma)],
				[
					readingSchema,
					{ unitKind: "Reading", lemma, emojiDescription: "👥" },
				],
				[
					attestationSchema,
					{
						unitKind: "Attestation",
						surface: surface(lemma),
						members: [{ attested: "Sie", orthography: "Standard" }],
						realizationCoverage: "Full",
						articleEvidence: null,
					},
				],
			] as const;
			for (const [schema, value] of named) {
				expect(schema.safeParse(value).success).toBe(true);
				expect(parseUnit(value).success).toBe(true);
			}
		}
	});

	test("guards tell a Syncretism and its view from a plain unit", () => {
		expect(isSyncretism(themOrYou)).toBe(true);
		expect(isSyncreticUnit(themOrYou)).toBe(true);
		const view = syncretismView(themOrYou) as Pronoun;
		expect(isSyncretism(view)).toBe(false);
		expect(isSyncreticUnit(view)).toBe(true);
		expect(isSyncretism(siePlural)).toBe(false);
		expect(isSyncreticUnit(siePlural)).toBe(false);
	});
});

describe("Syncretism rejections", () => {
	test("rejects a Core that is not the units' projection", () => {
		accepts(
			{
				...herOrThem,
				coreFeatures: { ...herOrThem.coreFeatures, case: "Dat" },
			},
			false,
		);
	});

	test("rejects a list that is not the units' disagreements, is unsorted or repeats", () => {
		for (const syncretic of [
			["gender"],
			["number", "gender"],
			["gender", "gender", "number"],
		])
			accepts({ ...herOrThem, syncretic }, false);
	});

	test("rejects a view whose listed feature is not null", () => {
		accepts(
			{
				...syncretismView(themOrYou),
				coreFeatures: { ...themOrYou.coreFeatures, polite: "Form" },
			},
			false,
		);
		accepts({ ...siePlural, syncretic: ["number"] }, false);
	});

	test("rejects a single unit, repeated units and units out of order", () => {
		accepts({ ...herOrThem, syncretized: [sieFeminine] }, false);
		accepts(
			{ ...herOrThem, syncretized: [sieFeminine, siePlural, siePlural] },
			false,
		);
		accepts(
			{ ...herOrThem, syncretized: herOrThem.syncretized.toReversed() },
			false,
		);
	});

	test("rejects units without a list", () => {
		const { syncretic: _, ...unlisted } = herOrThem;
		accepts(unlisted, false);
	});

	test("rejects a nested Syncretism", () => {
		accepts(
			{
				...herThemOrYou,
				syncretized: [sieFormal, herOrThem],
			},
			false,
		);
	});

	test("rejects units of different forms and a spelling none of them has", () => {
		const mixed = syncretize([siePlural, ihnenPlural]);
		expect(mixed.syncretic).toEqual(["case"]);
		accepts(mixed, false);
		accepts({ ...herOrThem, canonicalForm: "SIE" }, false);
	});

	test("rejects both fields on a route that has not opted in", () => {
		const noun = {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "NOUN",
			canonicalForm: "Kiefer",
			coreFeatures: { gender: null },
		};
		const masculine = {
			...noun,
			coreFeatures: { gender: "Masc" },
		};
		const feminine = {
			...noun,
			coreFeatures: { gender: "Fem" },
		};
		for (const value of [
			noun,
			{ ...noun, syncretic: ["gender"] },
			{
				...noun,
				syncretic: ["gender"],
				syncretized: [feminine, masculine],
			},
		]) {
			const expected = value === noun;
			expect(nounLemmaSchema.safeParse(value).success).toBe(expected);
			expect(parseUnit(value).success).toBe(expected);
		}
	});
});
