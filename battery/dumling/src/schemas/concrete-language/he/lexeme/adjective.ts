import { z } from "zod";
import {
	FeatureBagKind,
	featureBags,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

const HeAdjectiveCoreFeatureBagSchema = z.strictObject({
	abbr: HE_FEATURE_SCHEMA.abbr.nullable(),
});

const HeAdjectiveInflectionalFeatureBagSchema = nonEmptyFeatureBagSchema(
	z.strictObject({
		definite: HE_FEATURE_SCHEMA.definite.nullable(),
		gender: featureValueSetSchema(HE_FEATURE_SCHEMA.gender).nullable(),
		number: HE_FEATURE_SCHEMA.number.nullable(),
	}),
);

export const HeAdjectiveFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: HeAdjectiveCoreFeatureBagSchema,
	[FeatureBagKind.Inflectional]: HeAdjectiveInflectionalFeatureBagSchema,
});
