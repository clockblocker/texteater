import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";

export const EnPunctuationFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type EnPunctuationFeatureBags = z.infer<
	typeof EnPunctuationFeatureBagsSchema
>;

type _EnPunctuationFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnPunctuationFeatureBags>
>;
