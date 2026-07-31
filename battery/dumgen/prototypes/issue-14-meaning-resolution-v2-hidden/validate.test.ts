import { expect, test } from "bun:test";

import { validateMeaningCorpus } from "./validate.ts";

test("meaning-resolution-v2-hidden is frozen and complete", () => {
	const report = validateMeaningCorpus();
	expect(report).toMatchObject({
		corpusVersion: "meaning-resolution-v2-hidden",
		cases: 18,
		orderPairs: 3,
		inventories: { zero: 2, one: 10, multi: 6 },
	});
	expect(report.maxV1TokenJaccard).toBeLessThan(0.5);
	expect(report.freezeHash).toMatch(/^[a-f0-9]{64}$/);
});
