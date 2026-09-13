import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

export const EnAdjectiveFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["ADP", "ADV", "SCONJ"]),
		numForm: EN_FEATURE_SCHEMA.numForm.extract(["Combi", "Word"]),
		numType: EN_FEATURE_SCHEMA.numType.extract(["Frac", "Ord"]),
		style: EN_FEATURE_SCHEMA.style.extract(["Expr"]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			degree: EN_FEATURE_SCHEMA.degree.extract(["Cmp", "Pos", "Sup"]),
		}),
	),
});

export type EnAdjectiveFeatureBags = z.infer<
	typeof EnAdjectiveFeatureBagsSchema
>;

type _EnAdjectiveFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<EnAdjectiveFeatureBags>
>;
