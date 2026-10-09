import { z } from "zod";
import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	featureValueTupleSchema,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

const gender = DE_FEATURE_SCHEMA.gender;

/**
 * A noun's Core gender: one gender, or `mixed` when the noun takes more than
 * one in the same sense, *der oder das Balg* (system ADR 0032). The tag says
 * the genders vary freely within one sense; a gender that changes the meaning
 * (der/die See) makes separate Lemmas. Its members are a feature value set,
 * distinct and in catalog order, so one mix has one spelling.
 */
const DeNounGenderSchema = z.union([
	gender,
	z.strictObject({ mixed: featureValueTupleSchema(gender) }),
]);

export const DeNounFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		gender: DeNounGenderSchema,
	}),
	// A noun Surface is the noun's own form; its article is an attested
	// member, not a feature (ADR 0040). A noun whose Lemma has no gender,
	// such as an adjectival noun for a person, marks on a singular Surface
	// the gender its form shows (der Reisende).
	[FeatureBagKind.Inflectional]: z.strictObject({
		case: DE_FEATURE_SCHEMA.case.nullable(),
		gender: DE_FEATURE_SCHEMA.gender.nullable(),
		number: DE_FEATURE_SCHEMA.number.nullable(),
	}),
});
