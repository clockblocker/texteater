import { expect, test } from "bun:test";
import { germanMorphemePolicy } from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import { propagateMorphemes } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	type BreakdownPiece,
	formationGroupOf,
	prefetchMorphemeSources,
} from "../convex/model/breakdownParts";

const shadow = (family: string, kind: string, canonicalForm: string) =>
	({ language: "de", family, kind, canonicalForm }) as Dumrel.UnitShadow;
const morpheme = (kind: string, canonicalForm: string) =>
	shadow("Morpheme", kind, canonicalForm);
const noun = { family: "Lexeme", kind: "NOUN" };
const verb = { family: "Lexeme", kind: "VERB" };

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

const SPANNEN: Dumrel.MorphemeSources = {
	breakdown: {
		morphemes: [
			{ letters: "spann", target: morpheme("Root", "spann") },
			{ letters: "en", target: morpheme("Ending", "-en") },
		],
	},
};
const ENTSPANNEN: Dumrel.MorphemeSources = {
	breakdown: {
		constituents: [
			{ letters: "ent", target: morpheme("Prefix", "ent-") },
			{ letters: "spannen", target: shadow("Lexeme", "VERB", "spannen") },
		],
	},
};
const ENTSPANNUNG: Dumrel.MorphemeSources = {
	breakdown: {
		constituents: [
			{
				letters: "Entspann",
				target: shadow("Lexeme", "VERB", "entspannen"),
			},
			{ letters: "ung", target: morpheme("Suffix", "-ung") },
		],
	},
};

/** An async store of parts by Canonical Form that records what it loads. */
function store(parts: Record<string, Dumrel.MorphemeSources>) {
	const loads: string[] = [];
	const load = (target: Dumrel.LinkTarget) => {
		loads.push(target.canonicalForm);
		const part = parts[target.canonicalForm];
		return Promise.resolve(part ? [part] : []);
	};
	return { load, loads };
}

async function shownMorphemes(
	owner: Dumling.Reading,
	knowledge: Dumrel.MorphemeSources,
	parts: Record<string, Dumrel.MorphemeSources>,
) {
	const lookup = await prefetchMorphemeSources(knowledge, store(parts).load);
	return propagateMorphemes(
		{ reading: owner, knowledge },
		lookup,
		germanMorphemePolicy,
	)?.map((piece) =>
		piece.kind === "Morpheme"
			? `${piece.letters || "∅"}:${piece.target.kind}`
			: piece.kind === "Unsplit"
				? `[${piece.letters}]`
				: piece.letters,
	);
}

test("the prefetched walk fills in as the parts are stored (ADR 0051)", async () => {
	const entspannung = reading("NOUN", "Entspannung");
	expect(await shownMorphemes(entspannung, ENTSPANNUNG, {})).toEqual([
		"[Entspann]",
		"ung:Suffix",
		"∅:Ending",
	]);
	expect(
		await shownMorphemes(entspannung, ENTSPANNUNG, {
			entspannen: ENTSPANNEN,
		}),
	).toEqual(["Ent:Prefix", "[spann]", "ung:Suffix", "∅:Ending"]);
	expect(
		await shownMorphemes(entspannung, ENTSPANNUNG, {
			entspannen: ENTSPANNEN,
			spannen: SPANNEN,
		}),
	).toEqual(["Ent:Prefix", "spann:Root", "ung:Suffix", "∅:Ending"]);
});

test("the prefetch follows a Source and loads each part once", async () => {
	const lauf: Dumrel.MorphemeSources = {
		source: { target: shadow("Lexeme", "VERB", "laufen") },
	};
	const laufen: Dumrel.MorphemeSources = {
		breakdown: {
			morphemes: [
				{ letters: "lauf", target: morpheme("Root", "lauf") },
				{ letters: "en", target: morpheme("Ending", "-en") },
			],
		},
	};
	expect(
		await shownMorphemes(reading("NOUN", "Lauf"), lauf, { laufen }),
	).toEqual(["Lauf:Root", "∅:Ending"]);

	const doubled: Dumrel.MorphemeSources = {
		breakdown: {
			constituents: [
				{
					letters: "spann",
					target: shadow("Lexeme", "VERB", "spannen"),
				},
				{
					letters: "spannen",
					target: shadow("Lexeme", "VERB", "spannen"),
				},
			],
		},
	};
	const { load, loads } = store({ spannen: SPANNEN });
	await prefetchMorphemeSources(doubled, load);
	expect(loads).toEqual(["spannen"]);
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
