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

// German ADP Core is abbr only (ADR 0032, amended 2026-10-01): position is no
// identity, a circumposition is a Locution ADP, and adpType, extPos and
// partType left the route, so a legacy sample that sets them is rejected.
function setsRetiredGermanAdpositionCore(
	route: string,
	input: unknown,
): boolean {
	if (route !== "de/lexeme/adposition.ts") return false;
	if (typeof input !== "object" || input === null) return false;
	const core = (input as { core?: unknown }).core;
	return (
		typeof core === "object" &&
		core !== null &&
		["adpType", "extPos", "partType"].some((feature) => feature in core)
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
					setsRetiredGermanAdpositionCore(route, sample.input)
					? false
					: sample.accepted,
			);
	});
}
