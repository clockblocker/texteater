import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const HePunctuationFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type HePunctuationFeatureBags = z.infer<
	typeof HePunctuationFeatureBagsSchema
>;

type _HePunctuationFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HePunctuationFeatureBags>
>;
