import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DeVerbalInflectionalFeatureBagSchema } from "../de-feature-catalog.js";

export const DeIdiomPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: DeVerbalInflectionalFeatureBagSchema,
});

export type DeIdiomPhrasemeFeatureBags = z.infer<
	typeof DeIdiomPhrasemeFeatureBagsSchema
>;

type _DeIdiomPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeIdiomPhrasemeFeatureBags>
>;
