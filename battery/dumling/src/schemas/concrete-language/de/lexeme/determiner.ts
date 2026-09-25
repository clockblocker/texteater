import type { Assert } from "common-utils";
import { z } from "zod";
import {
	germanDeterminerCoreError,
	isGermanDeterminerCore,
} from "../../../../validation/semantics.js";
import {
	FeatureBagKind,
	featureValueSetSchema,
	type IsUniversalFeatureBags,
	nonEmptyFeatureBagSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// Each Paradigm Cell is its own Lemma (system ADR 0032): case, number and
// agreement gender are Core, and plural agreement has no marked gender.
const DeDeterminerCoreFeatureBagSchema = z
	.strictObject({
		case: DE_FEATURE_SCHEMA.case.nullable(),
		definite: DE_FEATURE_SCHEMA.definite.nullable(),
		extPos: DE_FEATURE_SCHEMA.determinerExtPos.nullable(),
		foreign: DE_FEATURE_SCHEMA.foreign.nullable(),
		gender: DE_FEATURE_SCHEMA.gender.nullable(),
		number: DE_FEATURE_SCHEMA.number.nullable(),
		numType: DE_FEATURE_SCHEMA.determinerNumType.nullable(),
		person: DE_FEATURE_SCHEMA.person.nullable(),
		polite: DE_FEATURE_SCHEMA.polite.nullable(),
		poss: DE_FEATURE_SCHEMA.poss.nullable(),
		pronType: DE_FEATURE_SCHEMA.determinerPronType.nullable(),
	})
	.refine(isGermanDeterminerCore, { error: germanDeterminerCoreError });

const DeDeterminerInflectionalFeatureBagSchema = nonEmptyFeatureBagSchema(
	z.strictObject({
		degree: DE_FEATURE_SCHEMA.degree.nullable(),
		"gender[psor]": featureValueSetSchema(
			DE_FEATURE_SCHEMA.gender,
		).nullable(),
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
