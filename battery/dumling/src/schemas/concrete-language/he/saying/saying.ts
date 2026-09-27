import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

// A Saying never inflects. Its Canonical Form is written as a sentence, with
// internal punctuation and no final punctuation (ADR 0039).
export const HeSayingFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HeSayingFeatureBags = z.infer<typeof HeSayingFeatureBagsSchema>;

type _HeSayingFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeSayingFeatureBags>
>;
