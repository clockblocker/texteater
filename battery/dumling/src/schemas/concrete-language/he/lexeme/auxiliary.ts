import type { Assert } from "common-utils";
import { z } from "zod";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import {
	FeatureBagKind,
	featureBagSchema,
	featureValueSetSchema,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { HE_FEATURE_SCHEMA } from "../he-feature-catalog.js";

export const HeAuxiliaryFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		verbType: HE_FEATURE_SCHEMA.verbType.extract(["Cop", "Mod"]),
	}),
	[FeatureBagKind.Inflectional]: nonEmptyFeatureBagSchema(
		featureBagSchema({
			gender: featureValueSetSchema(
				HE_FEATURE_SCHEMA.gender.extract(["Fem", "Masc"]),
			),
			number: HE_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
			person: featureValueSetSchema(
				HE_FEATURE_SCHEMA.person.extract(["1", "2", "3"]),
			),
			polarity: HE_FEATURE_SCHEMA.polarity.extract(["Neg", "Pos"]),
			tense: HE_FEATURE_SCHEMA.tense.extract(["Fut", "Past"]),
			verbForm: HE_FEATURE_SCHEMA.verbForm.extract(["Inf", "Part"]),
		}),
	),
});

export type HeAuxiliaryFeatureBags = z.infer<
	typeof HeAuxiliaryFeatureBagsSchema
>;

type _HeAuxiliaryFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<HeAuxiliaryFeatureBags>
>;
