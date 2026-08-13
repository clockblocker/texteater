import type { output } from "zod";

import { stableJson } from "../../../../../../../lib/stable-json";
import type { canonicalInputSchema, canonicalOutputSchema } from "./schemas";

type Input = output<typeof canonicalInputSchema>;
type CanonicalOutput = output<typeof canonicalOutputSchema>;

export function targetStimulusFingerprint(input: Input): string {
	return stableJson(input.segments);
}

export function semanticTargetFingerprint(args: {
	readonly input: Input;
	readonly output: CanonicalOutput;
}): string {
	return stableJson({
		segments: args.input.segments,
		output: args.output,
	});
}
