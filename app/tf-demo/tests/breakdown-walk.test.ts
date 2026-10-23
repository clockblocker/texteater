import { expect, test } from "bun:test";
import type * as Dumrel from "dumrel/types";
import {
	type BreakdownPiece,
	formationGroupOf,
	inheritUnderLetters,
	type WalkedPart,
	walkMorphemes,
} from "../convex/model/breakdownWalk";

const shadow = (family: string, kind: string, canonicalForm: string) =>
	({ language: "de", family, kind, canonicalForm }) as Dumrel.UnitShadow;
const morpheme = (kind: string, canonicalForm: string) =>
	shadow("Morpheme", kind, canonicalForm);
const noun = { family: "Lexeme", kind: "NOUN" };
const verb = { family: "Lexeme", kind: "VERB" };

/** Stored parts by Canonical Form; anything else is pending. */
function loader(parts: Record<string, WalkedPart>) {
	return (target: Dumrel.LinkTarget) =>
		Promise.resolve(parts[target.canonicalForm] ?? null);
}

function shown(pieces: Awaited<ReturnType<typeof walkMorphemes>>) {
	return pieces?.map(({ letters, kind }) => `${letters || "∅"}:${kind}`);
}

const SPANNEN: WalkedPart = {
	route: verb,
	canonicalForm: "spannen",
	knowledge: {
		breakdown: {
			morphemes: [
				{ letters: "spann", target: morpheme("Root", "spann") },
				{ letters: "en", target: morpheme("Ending", "-en") },
			],
		},
	},
};
const ENTSPANNEN: WalkedPart = {
	route: verb,
	canonicalForm: "entspannen",
	knowledge: {
		breakdown: {
			constituents: [
				{ letters: "ent", target: morpheme("Prefix", "ent-") },
				{
					letters: "spannen",
					target: shadow("Lexeme", "VERB", "spannen"),
				},
			],
		},
	},
};
const ENTSPANNUNG: WalkedPart = {
	route: noun,
	canonicalForm: "Entspannung",
	knowledge: {
		breakdown: {
			constituents: [
				{
					letters: "Entspann",
					target: shadow("Lexeme", "VERB", "entspannen"),
				},
				{ letters: "ung", target: morpheme("Suffix", "-ung") },
			],
		},
	},
};

test("a pending part shows as one chunk, and fills in as its Lemmas are stored (ADR 0051)", async () => {
	expect(shown(await walkMorphemes(ENTSPANNUNG, loader({})))).toEqual([
		"Entspann:Chunk",
		"ung:Suffix",
		"∅:Ending",
	]);
	expect(
		shown(
			await walkMorphemes(
				ENTSPANNUNG,
				loader({ entspannen: ENTSPANNEN }),
			),
		),
	).toEqual(["Ent:Prefix", "spann:Chunk", "ung:Suffix", "∅:Ending"]);
	expect(
		shown(
			await walkMorphemes(
				ENTSPANNUNG,
				loader({ entspannen: ENTSPANNEN, spannen: SPANNEN }),
			),
		),
	).toEqual(["Ent:Prefix", "spann:Root", "ung:Suffix", "∅:Ending"]);
});

test("a trailing citation ending is the word's Ending, and an inner part's zero ending is dropped", async () => {
	const verarzten: WalkedPart = {
		route: verb,
		canonicalForm: "verarzten",
		knowledge: {
			breakdown: {
				constituents: [
					{ letters: "ver", target: morpheme("Prefix", "ver-") },
					{
						letters: "arzt",
						target: shadow("Lexeme", "NOUN", "Arzt"),
					},
					{ letters: "en" },
				],
			},
		},
	};
	const arzt: WalkedPart = {
		route: noun,
		canonicalForm: "Arzt",
		knowledge: {
			breakdown: {
				morphemes: [
					{ letters: "Arzt", target: morpheme("Root", "arzt") },
					{ letters: "", target: morpheme("Ending", "∅") },
				],
			},
		},
	};
	expect(
		shown(await walkMorphemes(verarzten, loader({ Arzt: arzt }))),
	).toEqual(["ver:Prefix", "arzt:Root", "en:Ending"]);
});

test("a Source passes its stem on under the word's own letters", async () => {
	const lauf: WalkedPart = {
		route: noun,
		canonicalForm: "Lauf",
		knowledge: {
			source: { target: shadow("Lexeme", "VERB", "laufen") },
		},
	};
	const laufen: WalkedPart = {
		...SPANNEN,
		canonicalForm: "laufen",
		knowledge: {
			breakdown: {
				morphemes: [
					{ letters: "lauf", target: morpheme("Root", "lauf") },
					{ letters: "en", target: morpheme("Ending", "-en") },
				],
			},
		},
	};
	expect(shown(await walkMorphemes(lauf, loader({ laufen })))).toEqual([
		"Lauf:Root",
		"∅:Ending",
	]);
	expect(await walkMorphemes(lauf, loader({}))).toBeNull();
});

test("inherited letters tolerate umlaut and refuse letters that don't match", () => {
	const gast = [
		{ letters: "gast", kind: "Root", target: null },
		{ letters: "", kind: "Ending", target: null },
	];
	expect(
		inheritUnderLetters(gast, "Gäst")?.map(({ letters }) => letters),
	).toEqual(["Gäst", ""]);
	expect(inheritUnderLetters(gast, "Gans")).toBeNull();
});

test("Formations group by the Kind of a formation's other pieces (ADR 0050)", () => {
	const piece = (target: Dumrel.LinkTarget): BreakdownPiece => ({
		letters: target.canonicalForm,
		target,
	});
	const kaufen = shadow("Lexeme", "VERB", "kaufen");
	expect(
		formationGroupOf(verb, [
			piece(morpheme("Prefix", "ein-")),
			piece(kaufen),
		]),
	).toBe("Prefixed");
	expect(
		formationGroupOf(noun, [
			piece(kaufen),
			piece(morpheme("Suffix", "-er")),
		]),
	).toBe("Derivations");
	expect(
		formationGroupOf(noun, [
			piece(shadow("Lexeme", "NOUN", "Gast")),
			piece(morpheme("Interfix", "-e-")),
			piece(shadow("Lexeme", "NOUN", "Haus")),
		]),
	).toBe("Compounds");
	expect(
		formationGroupOf({ family: "Locution", kind: "ADV" }, [piece(kaufen)]),
	).toBe("Phrases");
});
