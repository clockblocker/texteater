/**
 * SWAP — the deck tap's pulse, in one place.
 *
 * The Compass prototype plays it with Motion (`swapKeyframes`); the
 * Animation workbench evaluates the same numbers as a pure function of
 * time. Both read this spec, so a change here is the change in both.
 *
 * One difference is kept on purpose: Motion runs the named easings
 * natively, the workbench models them as the cubic béziers Motion
 * defines them as (`MOTION_EASE_*` in the workbench's motion.ts).
 */

export type SwapEase = "linear" | "easeIn" | "easeOut" | "easeInOut";

export const SWAP_EASES: readonly SwapEase[] = [
	"linear",
	"easeIn",
	"easeOut",
	"easeInOut",
];

export type SwapSpec = {
	/** The whole pulse, in ms. */
	readonly duration: number;
	/** How much the front Card grows at the peak, as a fraction: 0.02 is 2 %. */
	readonly peak: number;
	/** When the peak lands, as a fraction of the duration. */
	readonly peakAt: number;
	/** The curve up to the peak. */
	readonly grow: SwapEase;
	/** The curve back to rest. */
	readonly settle: SwapEase;
};

/** The accepted Swap. */
export const SWAP: SwapSpec = {
	duration: 420,
	peak: 0.02,
	peakAt: 0.22,
	grow: "easeOut",
	settle: "easeOut",
};

/**
 * The pulse as Motion takes it:
 * `animate(front, keyframes, options)`.
 */
export function swapKeyframes(spec: SwapSpec = SWAP): {
	readonly keyframes: { readonly scale: number[] };
	readonly options: {
		readonly duration: number;
		readonly times: number[];
		readonly ease: SwapEase[];
	};
} {
	return {
		keyframes: { scale: [1, 1 + spec.peak, 1] },
		options: {
			duration: spec.duration / 1000,
			times: [0, spec.peakAt, 1],
			ease: [spec.grow, spec.settle],
		},
	};
}

export function swapEquals(a: SwapSpec, b: SwapSpec): boolean {
	return (
		a.duration === b.duration &&
		a.peak === b.peak &&
		a.peakAt === b.peakAt &&
		a.grow === b.grow &&
		a.settle === b.settle
	);
}

export function describeSwap(spec: SwapSpec): string {
	const pct = (value: number) =>
		`${(value * 100).toFixed((value * 100) % 1 === 0 ? 0 : 1)} %`;
	const ease =
		spec.grow === spec.settle ? spec.grow : `${spec.grow} / ${spec.settle}`;
	return `${spec.duration.toString()} ms · ${pct(spec.peak)} at ${pct(spec.peakAt)} · ${ease}`;
}
