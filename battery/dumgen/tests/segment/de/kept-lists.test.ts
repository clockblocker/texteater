import { expect, test } from "bun:test";
import {
	germanConjunctionLocutions,
	germanParticleMember,
} from "dumcorpus/inventories";
import {
	numberWords,
	pairCandidatesOf,
} from "../../../src/segment/de/candidates.js";
import { fixed, uses } from "../../../src/segment/de/closed-class.js";
import { authoredInventory } from "../../../src/segment/de/inventory.js";
import { sentenceOf } from "../../../src/segment/de/sentence.js";
import type { Segment } from "../../../src/segment/segmented-sentence.js";

// Dumgen keeps these lists as segmentation heuristics (#935), but they name
// dumcorpus content. Each test fails when the two drift apart (#982).

const word = (text: string): Segment => ({ kind: "ResolvableText", text });
const space: Segment = { kind: "Whitespace", text: " " };
const sentence = (...words: readonly string[]) =>
	sentenceOf({
		segments: words.flatMap((text, index) =>
			index === 0 ? [word(text)] : [space, word(text)],
		),
	});
const correlatorNames = (...words: readonly string[]) =>
	pairCandidatesOf(sentence(...words), authoredInventory)
		.filter((pair) => pair.kind === "correlator")
		.map((pair) => pair.name);

test("every zu-infinitive Locution is a correlator Dumgen proposes by its name", () => {
	// code-rules closes a correlator outright only under one of these names.
	for (const name of germanConjunctionLocutions.zuInfinitive) {
		const [first, second] = name.split(" … ");
		if (!first || !second) throw Error(`Not a correlator name: ${name}`);
		expect(correlatorNames(first, "wir", second)).toContain(name);
	}
});

test("every dass Locution is an adjacent conjunction Dumgen proposes by its name", () => {
	for (const name of germanConjunctionLocutions.dass) {
		const [first, second] = name.split(" ");
		if (!first || !second) throw Error(`Not a two-word name: ${name}`);
		expect(correlatorNames(first, second)).toContain(name);
	}
});

test("every spelling the closed-class ruling routes to PART is an authored PART", () => {
	const routedToPart = [
		...Object.entries(fixed)
			.filter(([, route]) => route === "Lexeme/PART")
			.map(([spelling]) => [spelling, "fixed"] as const),
		...Object.entries(uses).flatMap(([spelling, options]) =>
			Object.entries(options)
				.filter(([, use]) => use.route === "Lexeme/PART")
				.map(([key]) => [spelling, key] as const),
		),
	];
	expect(routedToPart.map(([spelling]) => spelling)).toContain("nicht");
	const unauthored = routedToPart.filter(
		([spelling, key]) =>
			!germanParticleMember({
				canonicalForm: spelling,
				coreFeatures:
					spelling === "nicht"
						? { polarity: "Neg" }
						: key === "infinitive"
							? { partType: "Inf" }
							: { partType: "Mod" },
			}),
	);
	expect(unauthored).toEqual([]);
});

test("the number words are the hand-typed ones", () => {
	expect([...numberWords].sort()).toEqual(
		"null eins ein eine zwei drei vier fünf sechs sieben acht neun zehn elf zwölf dreizehn vierzehn fünfzehn sechzehn siebzehn achtzehn neunzehn zwanzig dreißig vierzig fünfzig sechzig siebzig achtzig neunzig hundert tausend"
			.split(" ")
			.sort(),
	);
});
