import { expect, test } from "bun:test";
import {
	formatSharedRss,
	SHARED_RSS_IMPORTS,
	summarizeSharedRss,
} from "../dum-entrypoint-rss/shared";

const MiB = 1048576;
const sample = (baseline: number, delta: number) => [
	{ specifier: "effect/Effect", peakBytes: baseline },
	...SHARED_RSS_IMPORTS.map((specifier, index) => ({
		specifier,
		peakBytes:
			baseline + (index === SHARED_RSS_IMPORTS.length - 1 ? delta : 0),
	})),
];

test("paired deltas exclude already-loaded memory before taking the median", () => {
	const samples = [10, 20, 30, 40, 50, 60, 70].map((base, index) =>
		sample(base * MiB, index < 3 ? 100 * MiB : 0),
	);
	const result = summarizeSharedRss(samples);
	// Subtracting two independent medians would incorrectly report +30 MiB.
	expect(result.addedPeakMedianBytes).toBe(0);
	expect(result.passed).toBe(true);
	expect(formatSharedRss(result)).toContain(
		"+0.000 MiB after Effect; ceiling 30.000 MiB",
	);
});

test("a shared-chain regression fails even when the process baseline varies", () => {
	const result = summarizeSharedRss(
		Array.from({ length: 7 }, (_, i) => sample((50 + i) * MiB, 31 * MiB)),
	);
	expect(result.passed).toBe(false);
	expect(result.addedPeakMedianBytes).toBe(31 * MiB);
});

test("missing stages, reordered imports and decreasing peak counters cannot pass", () => {
	const valid = Array.from({ length: 7 }, () => sample(50 * MiB, 20 * MiB));
	expect(() => summarizeSharedRss(valid.slice(1))).toThrow();
	expect(() =>
		summarizeSharedRss(valid.map((points) => points.slice(1))),
	).toThrow();
	expect(() =>
		summarizeSharedRss(valid.map((points) => [...points].reverse())),
	).toThrow();
	expect(() =>
		summarizeSharedRss(valid.map(() => sample(50 * MiB, -MiB))),
	).toThrow();
});
