import { expect, test } from "bun:test";

import { validateClickCorpus } from "./validate.ts";

test("click-resolution-chain-v2-hidden is frozen and complete", () => {
	const report = validateClickCorpus();
	expect(report).toMatchObject({
		corpusVersion: "click-resolution-chain-v2-hidden",
		clickCases: 15,
		segmentedSentences: 10,
		relationalFixtures: 6,
		rejectionFixtures: 7,
	});
	expect(report.maxV1TokenJaccard).toBeLessThan(0.5);
	expect(report.freezeHash).toMatch(/^[a-f0-9]{64}$/);
});
