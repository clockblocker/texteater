import { expect, test } from "bun:test";
import { z } from "zod";
import fixtures from "./fixtures/legacy-feature-acceptance.json";

for (const route of new Set(fixtures.all.map((sample) => sample.route))) {
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
			).toBe(sample.accepted);
	});
}
