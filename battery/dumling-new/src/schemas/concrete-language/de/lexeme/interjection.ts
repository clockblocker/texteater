import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeInterjectionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		partType: DE_FEATURE_SCHEMA.partType.extract(["Res"]),
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type DeInterjectionFeatureBags = z.infer<
	typeof DeInterjectionFeatureBagsSchema
>;

type _DeInterjectionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeInterjectionFeatureBags>
>;
