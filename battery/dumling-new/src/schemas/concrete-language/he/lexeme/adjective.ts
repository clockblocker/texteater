import type { Assert } from "common-utils";
import { z } from "zod";
import {
	FeatureBagKind,
	featureValueSetSchema,
	type IsUniversalFeatureBags,
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

export const HeAdjectiveFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: HeAdjectiveCoreFeatureBagSchema,
	[FeatureBagKind.Inflectional]: HeAdjectiveInflectionalFeatureBagSchema,
});

export type HeAdjectiveFeatureBags = z.infer<
	typeof HeAdjectiveFeatureBagsSchema
>;

type _HeAdjectiveFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeAdjectiveFeatureBags>
>;
