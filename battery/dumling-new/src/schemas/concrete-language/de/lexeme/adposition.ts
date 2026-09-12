import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

export const DeAdpositionFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: DE_FEATURE_SCHEMA.abbr,
		adpType: DE_FEATURE_SCHEMA.adpType.extract(["Circ", "Post", "Prep"]),
		extPos: DE_FEATURE_SCHEMA.extPos.extract(["ADV", "SCONJ"]),
		foreign: DE_FEATURE_SCHEMA.foreign,
		governedCase: DE_FEATURE_SCHEMA.governedCase,
		partType: DE_FEATURE_SCHEMA.partType.extract(["Vbp"]),
	}),
	[FeatureBagKind.Inflectional]: featureBagSchema({}),
});

export type DeAdpositionFeatureBags = z.infer<
	typeof DeAdpositionFeatureBagsSchema
>;

type _DeAdpositionFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeAdpositionFeatureBags>
>;
