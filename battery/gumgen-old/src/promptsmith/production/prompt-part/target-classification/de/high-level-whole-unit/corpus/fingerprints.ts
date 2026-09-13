import type { output } from "zod";

import { stableJson } from "../../../../../../../lib/stable-json";
import type { canonicalInputSchema } from "./schemas";

type Input = output<typeof canonicalInputSchema>;

export function targetStimulusFingerprint(input: Input): string {
	return stableJson(input.segments);
}
