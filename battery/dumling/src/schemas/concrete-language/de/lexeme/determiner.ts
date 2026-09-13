import type { Assert } from "common-utils";
import { z } from "zod";
import {
	FeatureBagKind,
	featureValueSetSchema,
	type IsUniversalFeatureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

const DeDeterminerCoreFeatureBagSchema = z.strictObject({
	definite: DE_FEATURE_SCHEMA.definite.nullable(),
	extPos: DE_FEATURE_SCHEMA.determinerExtPos.nullable(),
	foreign: DE_FEATURE_SCHEMA.foreign.nullable(),
	numType: DE_FEATURE_SCHEMA.determinerNumType.nullable(),
	person: DE_FEATURE_SCHEMA.person.nullable(),
	polite: DE_FEATURE_SCHEMA.polite.nullable(),
	poss: DE_FEATURE_SCHEMA.poss.nullable(),
	pronType: DE_FEATURE_SCHEMA.determinerPronType.nullable(),
});

const DeDeterminerInflectionalFeatureBagSchema = nonEmptyFeatureBagSchema(
	z.strictObject({
		case: DE_FEATURE_SCHEMA.case.nullable(),
		degree: DE_FEATURE_SCHEMA.degree.nullable(),
		gender: DE_FEATURE_SCHEMA.gender.nullable(),
		"gender[psor]": featureValueSetSchema(
			DE_FEATURE_SCHEMA.gender,
		).nullable(),
		number: DE_FEATURE_SCHEMA.number.nullable(),
		"number[psor]": DE_FEATURE_SCHEMA.number.nullable(),
	}),
);

export const DeDeterminerFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: DeDeterminerCoreFeatureBagSchema,
	[FeatureBagKind.Inflectional]: DeDeterminerInflectionalFeatureBagSchema,
});

export type DeDeterminerFeatureBags = z.infer<
	typeof DeDeterminerFeatureBagsSchema
>;

type _DeDeterminerFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeDeterminerFeatureBags>
>;
