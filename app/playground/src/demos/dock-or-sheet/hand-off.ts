import type { TargetAndTransition, Variants } from "motion/react";

/**
 * Exit variants for a lookup container. Closed by the reader, it animates
 * out to `gone`; handed off because the frame crossed the breakpoint
 * (AnimatePresence's `custom` is true), it leaves at once, so only the
 * container taking over is seen moving and the Lookup is never shown twice.
 */
export function handOffVariants(gone: TargetAndTransition): Variants {
	return {
		gone: (handOff: boolean) =>
			handOff ? { ...gone, transition: { duration: 0 } } : gone,
	};
}
