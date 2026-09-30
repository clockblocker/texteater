/**
 * The run-to-run noise floor. A noise rerun repeats a baseline's exact
 * configuration at fresh repetition indices; pairing the two by majority
 * verdict counts the gold units that flip with nothing changed. A compare
 * delta is beyond noise only when McNemar agrees (p < 0.05) and the net
 * |gained − lost| exceeds what that flip rate reaches by chance.
 */
import type { BucketDelta } from "./ledger.js";
import { mcnemar } from "./metrics.js";
import { type OutcomeRow, type Paired, pairOutcomes } from "./outcomes.js";

/** The bucket name that sums every bucket. */
export const allBuckets = "all";

export type FlipRate = {
	readonly units: number;
	/** Units whose majority verdict differs between baseline and rerun. */
	readonly flips: number;
	readonly rate: number;
};

/** Per bucket (and `all`), the flip rate of a policy between a baseline and its rerun. */
export type NoiseFloor = Readonly<Record<string, FlipRate>>;

export function noiseFloor(
	baseline: readonly OutcomeRow[],
	rerun: readonly OutcomeRow[],
	policy: string,
): NoiseFloor {
	const paired = pairOutcomes(
		{ rows: baseline, policy },
		{ rows: rerun, policy },
	);
	const floor: Record<string, FlipRate> = {};
	let units = 0;
	let flips = 0;
	for (const [bucket, tally] of Object.entries(paired.buckets)) {
		const bucketFlips = tally.leftOnly + tally.rightOnly;
		floor[bucket] = {
			units: tally.units,
			flips: bucketFlips,
			rate: bucketFlips / tally.units,
		};
		units += tally.units;
		flips += bucketFlips;
	}
	floor[allBuckets] = {
		units,
		flips,
		rate: units === 0 ? 0 : flips / units,
	};
	return floor;
}

/**
 * The |gained − lost| noise alone reaches in 95% of comparisons of `units`
 * gold units: with `rate × units` expected flips, each equally likely to
 * go either way, the net count has standard deviation √(rate × units).
 */
export function floorOf(rate: number, units: number): number {
	return 1.96 * Math.sqrt(rate * units);
}

/** One bucket's delta, judged against a flip rate when there is one. */
export function deltaOf(
	units: number,
	gained: number,
	lost: number,
	rate: FlipRate | undefined,
): BucketDelta {
	const p = mcnemar(lost, gained);
	if (!rate)
		return { units, gained, lost, p, floor: null, beyondNoise: null };
	const floor = floorOf(rate.rate, units);
	return {
		units,
		gained,
		lost,
		p,
		floor,
		beyondNoise: p < 0.05 && Math.abs(gained - lost) > floor,
	};
}

/** The overall and per-bucket deltas of a paired comparison. */
export function deltasOf(
	paired: Paired,
	floor: NoiseFloor | undefined,
): {
	readonly all: BucketDelta;
	readonly buckets: Record<string, BucketDelta>;
} {
	const buckets: Record<string, BucketDelta> = {};
	let units = 0;
	for (const [bucket, tally] of Object.entries(paired.buckets)) {
		buckets[bucket] = deltaOf(
			tally.units,
			tally.rightOnly,
			tally.leftOnly,
			floor?.[bucket],
		);
		units += tally.units;
	}
	return {
		all: deltaOf(
			units,
			paired.rightOnly.length,
			paired.leftOnly.length,
			floor?.[allBuckets],
		),
		buckets,
	};
}
