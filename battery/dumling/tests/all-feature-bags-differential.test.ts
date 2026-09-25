import { expect, test } from "bun:test";
import { z } from "zod";
import fixtures from "./fixtures/legacy-feature-acceptance.json";

// Clitic is no Morpheme Kind (ADR 0035): its routes are retired.
const retired = /^[a-z]+\/morpheme\/clitic\.ts$/;
for (const route of new Set(fixtures.all.map((sample) => sample.route))) {
	if (retired.test(route)) continue;
	// A noun marks its article on every Surface (ADR 0035), so the legacy
	// shapes, which leave it unmarked, are all rejected.
	const supersededShape =
		/^de\/(lexeme\/(verb|auxiliary|noun)|phraseme\/(idiom|collocation))\.ts$|^en\/lexeme\/noun\.ts$/.test(
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
			).toBe(supersededShape ? false : sample.accepted);
	});
}
