import type { Assert } from "common-utils";
import { z } from "zod";
import {
	FeatureBagKind,
	featureValueSetSchema,
	type IsUniversalFeatureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

const HeVerbCoreFeatureBagSchema = z.strictObject({
	hebBinyan: HE_FEATURE_SCHEMA.hebBinyan.nullable(),
	hebExistential: HE_FEATURE_SCHEMA.hebExistential.nullable(),
});

const HeVerbInflectionalFeatureBagSchema = nonEmptyFeatureBagSchema(
	z.strictObject({
		definite: HE_FEATURE_SCHEMA.definite.nullable(),
		gender: featureValueSetSchema(HE_FEATURE_SCHEMA.gender).nullable(),
		mood: HE_FEATURE_SCHEMA.mood.nullable(),
		number: HE_FEATURE_SCHEMA.number.nullable(),
		person: featureValueSetSchema(HE_FEATURE_SCHEMA.person).nullable(),
		polarity: HE_FEATURE_SCHEMA.polarity.nullable(),
		tense: HE_FEATURE_SCHEMA.tense.nullable(),
		verbForm: HE_FEATURE_SCHEMA.verbForm.nullable(),
		voice: HE_FEATURE_SCHEMA.voice.nullable(),
	}),
);

export const HeVerbFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: HeVerbCoreFeatureBagSchema,
	[FeatureBagKind.Inflectional]: HeVerbInflectionalFeatureBagSchema,
});

export type HeVerbFeatureBags = z.infer<typeof HeVerbFeatureBagsSchema>;

type _HeVerbFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeVerbFeatureBags>
>;
