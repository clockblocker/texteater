import { expect, test } from "bun:test";

import { validateSegmentationCorpus } from "./validate.ts";

test("segmentation-chain-v2-hidden is frozen and complete", () => {
	const report = validateSegmentationCorpus();
	expect(report).toMatchObject({
		corpusVersion: "segmentation-chain-v2-hidden",
		cases: 26,
		accepted: 22,
	});
	expect(report.maxV1TokenJaccard).toBeLessThan(0.5);
	expect(report.freezeHash).toMatch(/^[a-f0-9]{64}$/);
});
