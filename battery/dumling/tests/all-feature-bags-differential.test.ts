import { expect, test } from "bun:test";
import { z } from "zod";
import fixtures from "./fixtures/legacy-feature-acceptance.json";

// Clitic is no Morpheme Kind (ADR 0035), the Phraseme Family is split into
// Locution and Saying (ADR 0039), and Lexeme X gave way to the Foreign Family
// (ADR 0045): their routes are retired.
const retired =
	/^[a-z]+\/(morpheme\/clitic|phraseme\/[a-z-]+|lexeme\/other)\.ts$/;

// No English route carries UD Style any more: archaism and register are
// parked on #727, so a legacy English sample that sets it is rejected.
function setsEnglishStyle(route: string, input: unknown): boolean {
	if (!route.startsWith("en/")) return false;
	if (typeof input !== "object" || input === null) return false;
	const core = (input as { core?: unknown }).core;
	return typeof core === "object" && core !== null && "style" in core;
}

// No Lexeme route carries UD Foreign any more: foreign material is the
// Foreign Family (ADR 0045, amended 2026-10-01), so a legacy sample that
// sets it is rejected.
function setsForeign(input: unknown): boolean {
	if (typeof input !== "object" || input === null) return false;
	const core = (input as { core?: unknown }).core;
	return typeof core === "object" && core !== null && "foreign" in core;
}

// German Core and Surface features that left their route: an ADP's
// position is no identity and a circumposition is a Locution ADP (ADR 0032,
// amended 2026-10-01), and the #766 sweep dropped the features that only
// labelled a Lemma. A legacy sample that sets one is rejected.
const retiredGermanFeatures: Readonly<Record<string, readonly string[]>> = {
	"de/lexeme/adposition.ts": ["abbr", "adpType", "extPos", "partType"],
	"de/lexeme/coordinating-conjunction.ts": ["conjType"],
	"de/lexeme/determiner.ts": ["definite", "extPos", "numType"],
	"de/lexeme/numeral.ts": ["abbr", "numType"],
	"de/lexeme/particle.ts": ["abbr"],
	"de/lexeme/punctuation.ts": ["punctType"],
	"de/lexeme/subordinating-conjunction.ts": ["conjType"],
	"de/lexeme/symbol.ts": ["numType"],
};
function setsRetiredGermanFeature(route: string, input: unknown): boolean {
	const retired = retiredGermanFeatures[route];
	if (!retired || typeof input !== "object" || input === null) return false;
	return Object.values(input).some(
		(bag) =>
			typeof bag === "object" &&
			bag !== null &&
			retired.some((feature) => feature in bag),
	);
}

for (const route of new Set(fixtures.all.map((sample) => sample.route))) {
	if (retired.test(route)) continue;
	// A proper noun marks its article in its Core (ADR 0035), a German noun
	// Surface marks gender (ADR 0040), and a German or English ADV or ADJ
	// records comparability in Core (ADR 0042), so the legacy shapes, which
	// leave them out, are all rejected.
	const supersededShape =
		/^de\/lexeme\/(verb|auxiliary|noun)\.ts$|^(de|en|he)\/lexeme\/proper-noun\.ts$|^(de|en)\/lexeme\/(adjective|adverb)\.ts$/.test(
			route,
		);
	test(`retained Feature Bag acceptance: ${route}`, async () => {
		const module = await import(
			`../src/schemas/concrete-language/${route}`
		);
		const schema = Object.values(module).find(
			(value) => value instanceof z.ZodObject,
		);
		if (!schema) throw new Error(`Missing schema: ${route}`);
		for (const sample of fixtures.all.filter(
			(sample) => sample.route === route,
		))
			expect(
				schema.safeParse(sample.input).success,
				JSON.stringify(sample.input),
			).toBe(
				supersededShape ||
					setsEnglishStyle(route, sample.input) ||
					setsForeign(sample.input) ||
					setsRetiredGermanFeature(route, sample.input)
					? false
					: sample.accepted,
			);
	});
}
