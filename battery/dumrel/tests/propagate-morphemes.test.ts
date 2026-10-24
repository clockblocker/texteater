import { describe, expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { propagateMorphemes } from "dumrel";
import type * as Dumrel from "dumrel/types";

/**
 * ADR 0051's propagation on the German gold chains: `spannen` →
 * `entspannen` → `Entspannung`, the partial walk while a part is pending,
 * and the walk through a Source (`Lauf` ← `laufen`). The fixtures copy the
 * Breakdown Records in `battery/dumcorpus/records/breakdown/de/`.
 */

const german: Dumrel.MorphemePolicy = {
	zeroEndingKinds: new Set(["NOUN", "PROPN", "ADJ", "DET", "PRON"]),
	endings: new Map([
		["en", "-en"],
		["n", "-en"],
		["e", "-e"],
	]),
};

const shadow = (
	family: Dumling.Family<"de">,
	kind: string,
	canonicalForm: string,
) => ({ language: "de", canonicalForm, family, kind }) as Dumrel.LinkTarget;

const reading = (kind: string, canonicalForm: string) =>
	({
		unitKind: "Reading",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind,
			canonicalForm,
			coreFeatures: {},
		},
		emojiDescription: "🧪",
	}) as Dumling.Reading;

const prefix = (form: string) => shadow("Morpheme", "Prefix", `${form}-`);
const suffix = (form: string) => shadow("Morpheme", "Suffix", `-${form}`);
const root = (form: string) => shadow("Morpheme", "Root", form);
const ending = (form: string) => shadow("Morpheme", "Ending", form);
const verb = (form: string) => shadow("Lexeme", "VERB", form);
const noun = (form: string) => shadow("Lexeme", "NOUN", form);

const spannen: Dumrel.MorphemeSources = {
	breakdown: {
		morphemes: [
			{ letters: "spann", target: root("spann") },
			{ letters: "en", target: ending("-en") },
		],
	},
};
const entspannen: Dumrel.MorphemeSources = {
	breakdown: {
		constituents: [
			{ letters: "ent", target: prefix("ent") },
			{ letters: "spannen", target: verb("spannen") },
		],
	},
};
const entspannung = {
	reading: reading("NOUN", "Entspannung"),
	knowledge: {
		breakdown: {
			constituents: [
				{ letters: "Entspann", target: verb("entspannen") },
				{ letters: "ung", target: suffix("ung") },
			],
		},
	},
};

const isMany = (
	found: Dumrel.MorphemeSources | readonly Dumrel.MorphemeSources[],
): found is readonly Dumrel.MorphemeSources[] => Array.isArray(found);

/**
 * A dictionary of stored Readings by their link target's Canonical Form:
 * one Reading's Knowledge, or every Reading's of a Lemma with several.
 */
const lookupIn =
	(
		stored: Readonly<
			Record<
				string,
				Dumrel.MorphemeSources | readonly Dumrel.MorphemeSources[]
			>
		>,
	) =>
	(target: Dumrel.LinkTarget): readonly Dumrel.MorphemeSources[] => {
		const found = stored[target.canonicalForm];
		if (found === undefined) return [];
		return isMany(found) ? found : [found];
	};

/** Each shown piece as `letters:Kind`, an unsplit chunk as `[letters]`. */
const shown = (pieces: readonly Dumrel.ShownMorpheme[] | undefined) =>
	pieces?.map((piece) =>
		piece.kind === "Morpheme"
			? `${piece.letters || "∅"}:${piece.target.kind}`
			: piece.kind === "Unsplit"
				? `[${piece.letters}]`
				: piece.letters,
	);

describe("the gold chain spannen → entspannen → Entspannung", () => {
	test("a bottom word shows its stored morphemes", () => {
		expect(
			shown(
				propagateMorphemes(
					{ reading: reading("VERB", "spannen"), knowledge: spannen },
					lookupIn({}),
					german,
				),
			),
		).toEqual(["spann:Root", "en:Ending"]);
	});

	test("a prefix verb keeps its base's morphemes and their Ending", () => {
		expect(
			shown(
				propagateMorphemes(
					{
						reading: reading("VERB", "entspannen"),
						knowledge: entspannen,
					},
					lookupIn({ spannen }),
					german,
				),
			),
		).toEqual(["ent:Prefix", "spann:Root", "en:Ending"]);
	});

	test("a derivation keeps what its truncated base shows and adds its suffix and zero ending", () => {
		const pieces = propagateMorphemes(
			entspannung,
			lookupIn({ entspannen, spannen }),
			german,
		);
		expect(shown(pieces)).toEqual([
			"Ent:Prefix",
			"spann:Root",
			"ung:Suffix",
			"∅:Ending",
		]);
		expect(pieces?.at(-1)).toEqual({
			kind: "Morpheme",
			letters: "",
			target: ending("∅"),
		});
	});
});

describe("the partial walk", () => {
	test("day 1: only Entspannung is stored, so entspannen shows unsplit", () => {
		const pieces = propagateMorphemes(entspannung, lookupIn({}), german);
		expect(shown(pieces)).toEqual(["[Entspann]", "ung:Suffix", "∅:Ending"]);
		expect(pieces?.[0]).toEqual({
			kind: "Unsplit",
			letters: "Entspann",
			target: verb("entspannen"),
		});
	});

	test("day 5: entspannen is stored, spannen still pending", () => {
		expect(
			shown(
				propagateMorphemes(
					entspannung,
					lookupIn({ entspannen }),
					german,
				),
			),
		).toEqual(["Ent:Prefix", "[spann]", "ung:Suffix", "∅:Ending"]);
	});

	test("a verb whose last part is pending gets no zero ending", () => {
		expect(
			shown(
				propagateMorphemes(
					{
						reading: reading("VERB", "entspannen"),
						knowledge: entspannen,
					},
					lookupIn({}),
					german,
				),
			),
		).toEqual(["ent:Prefix", "[spannen]"]);
	});

	test("a noun whose last part is pending keeps its ending inside the chunk", () => {
		expect(
			shown(
				propagateMorphemes(
					{
						reading: reading("NOUN", "Kohlekraftwerk"),
						knowledge: {
							breakdown: {
								constituents: [
									{ letters: "Kohle", target: noun("Kohle") },
									{
										letters: "kraftwerk",
										target: noun("Kraftwerk"),
									},
								],
							},
						},
					},
					lookupIn({}),
					german,
				),
			),
		).toEqual(["[Kohle]", "[kraftwerk]"]);
	});
});

describe("propagation through a Source", () => {
	const laufen: Dumrel.MorphemeSources = {
		breakdown: {
			morphemes: [
				{ letters: "lauf", target: root("lauf") },
				{ letters: "en", target: ending("-en") },
			],
		},
	};
	const lauf = {
		reading: reading("NOUN", "Lauf"),
		knowledge: { source: { target: verb("laufen") } },
	};

	test("Lauf inherits lauf from laufen and adds its own zero ending", () => {
		expect(
			shown(propagateMorphemes(lauf, lookupIn({ laufen }), german)),
		).toEqual(["Lauf:Root", "∅:Ending"]);
	});

	test("a pending Source shows the whole word unsplit, its ending inside", () => {
		expect(shown(propagateMorphemes(lauf, lookupIn({}), german))).toEqual([
			"[Lauf]",
		]);
	});

	test("gesungen finds the Root sing through its Surface sung", () => {
		const singen: Dumrel.MorphemeSources = {
			breakdown: {
				morphemes: [
					{ letters: "sing", target: root("sing") },
					{ letters: "en", target: ending("-en") },
				],
			},
		};
		expect(
			shown(
				propagateMorphemes(
					{
						reading: reading("ADJ", "gesungen"),
						knowledge: { source: { target: verb("singen") } },
					},
					lookupIn({ singen }),
					german,
				),
			),
		).toEqual(["[ge]", "sung:Root", "[en]"]);
	});
});

describe("each step's own pieces", () => {
	test("Gästehaus keeps the umlaut its part shows and drops the parts' zero endings", () => {
		const haus: Dumrel.MorphemeSources = {
			breakdown: {
				morphemes: [
					{ letters: "haus", target: root("haus") },
					{ letters: "", target: ending("∅") },
				],
			},
		};
		const gast: Dumrel.MorphemeSources = {
			breakdown: {
				morphemes: [
					{ letters: "gast", target: root("gast") },
					{ letters: "", target: ending("∅") },
				],
			},
		};
		expect(
			shown(
				propagateMorphemes(
					{
						reading: reading("NOUN", "Gästehaus"),
						knowledge: {
							breakdown: {
								constituents: [
									{ letters: "Gäst", target: noun("Gast") },
									{
										letters: "e",
										target: shadow(
											"Morpheme",
											"Interfix",
											"-e-",
										),
									},
									{ letters: "haus", target: noun("Haus") },
								],
							},
						},
					},
					lookupIn({ Gast: gast, Haus: haus }),
					german,
				),
			),
		).toEqual(["Gäst:Root", "e:Interfix", "haus:Root", "∅:Ending"]);
	});

	test("verarzten's citation filler becomes its Ending", () => {
		expect(
			shown(
				propagateMorphemes(
					{
						reading: reading("VERB", "verarzten"),
						knowledge: {
							breakdown: {
								constituents: [
									{ letters: "ver", target: prefix("ver") },
									{ letters: "arzt", target: noun("Arzt") },
									{ letters: "en" },
								],
							},
						},
					},
					lookupIn({
						Arzt: {
							breakdown: {
								morphemes: [
									{ letters: "arzt", target: root("arzt") },
									{ letters: "", target: ending("∅") },
								],
							},
						},
					}),
					german,
				),
			),
		).toEqual(["ver:Prefix", "arzt:Root", "en:Ending"]);
	});

	test("a cycle stops as an unsplit chunk", () => {
		const loop: Dumrel.MorphemeSources = {
			breakdown: {
				constituents: [
					{ letters: "ver", target: prefix("ver") },
					{ letters: "kaufen", target: verb("verkaufen") },
				],
			},
		};
		expect(
			shown(
				propagateMorphemes(
					{ reading: reading("VERB", "verkaufen"), knowledge: loop },
					lookupIn({ verkaufen: loop }),
					german,
				),
			),
		).toEqual(["ver:Prefix", "[kaufen]"]);
	});

	test("a phraseme and a word with no Breakdown get none", () => {
		const phraseme = {
			...reading("VERB", "den Faden verlieren"),
			lemma: {
				...reading("VERB", "den Faden verlieren").lemma,
				family: "Locution",
			},
		} as Dumling.Reading;
		expect(
			propagateMorphemes(
				{ reading: phraseme, knowledge: {} },
				lookupIn({}),
				german,
			),
		).toBeUndefined();
		expect(
			propagateMorphemes(
				{ reading: reading("NOUN", "Haus"), knowledge: {} },
				lookupIn({}),
				german,
			),
		).toBeUndefined();
	});
});

describe("a part whose Lemma has several Readings (ADR 0051)", () => {
	const morphemes = (...pieces: [string, Dumrel.LinkTarget][]) => ({
		breakdown: {
			morphemes: pieces.map(([letters, target]) => ({ letters, target })),
		},
	});
	const guard = morphemes(
		["wach", root("wach")],
		["stub", root("stub")],
		["e", ending("-e")],
	);
	const candle = morphemes(
		["wachs", root("wachs")],
		["tub", root("tub")],
		["e", ending("-e")],
	);
	const owner = {
		reading: reading("NOUN", "Wachstubentür"),
		knowledge: {
			breakdown: {
				constituents: [
					{ letters: "Wachstube", target: noun("Wachstube") },
					{
						letters: "n",
						target: shadow("Morpheme", "Interfix", "-n-"),
					},
					{ letters: "tür", target: noun("Tür") },
				],
			},
		},
	};

	test("Readings that agree show their split", () => {
		expect(
			shown(
				propagateMorphemes(
					owner,
					lookupIn({ Wachstube: [guard, guard] }),
					german,
				),
			),
		).toEqual([
			"Wach:Root",
			"stub:Root",
			"e:Ending",
			"n:Interfix",
			"[tür]",
		]);
	});

	test("Readings that split differently leave the part unsplit, whatever their order", () => {
		for (const readings of [
			[guard, candle],
			[candle, guard],
		])
			expect(
				shown(
					propagateMorphemes(
						owner,
						lookupIn({ Wachstube: readings }),
						german,
					),
				),
			).toEqual(["[Wachstube]", "n:Interfix", "[tür]"]);
	});
});

test("a verb's filler n links to the Ending -en its policy names, not to an -n of its own (ADR 0051)", () => {
	const pieces = propagateMorphemes(
		{
			reading: reading("VERB", "verwandeln"),
			knowledge: {
				breakdown: {
					constituents: [
						{ letters: "ver", target: prefix("ver") },
						{ letters: "wandel", target: noun("Wandel") },
						{ letters: "n" },
					],
				},
			},
		},
		lookupIn({}),
		german,
	);
	expect(pieces?.at(-1)).toEqual({
		kind: "Morpheme",
		letters: "n",
		target: ending("-en"),
	});
});
