import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeAdpositionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: HE_FEATURE_SCHEMA.abbr,
		case: HE_FEATURE_SCHEMA.case.extract(["Acc", "Gen"]),
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type HeAdpositionFeatureBags = z.infer<
	typeof HeAdpositionFeatureBagsSchema
>;

type _HeAdpositionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeAdpositionFeatureBags>
>;
