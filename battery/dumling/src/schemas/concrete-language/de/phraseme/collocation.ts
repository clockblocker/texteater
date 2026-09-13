import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DeVerbalInflectionalFeatureBagSchema } from "../de-feature-catalog.js";

export const DeCollocationPhrasemeFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: DeVerbalInflectionalFeatureBagSchema,
});

export type DeCollocationPhrasemeFeatureBags = z.infer<
	typeof DeCollocationPhrasemeFeatureBagsSchema
>;

type _DeCollocationPhrasemeFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeCollocationPhrasemeFeatureBags>
>;
