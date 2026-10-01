import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const DePunctuationFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
});

export type DePunctuationFeatureBags = z.infer<
	typeof DePunctuationFeatureBagsSchema
>;

type _DePunctuationFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DePunctuationFeatureBags>
>;
