import { z } from "zod";
import type { EnPronounFeatures } from "../../../../../types/concrete-language/features/en/lexeme/pronoun.js";
import { abstractFeatureAtomSchemas } from "../../../../abstract/feature-schemas.js";
import {
	buildOptionalFeatureObjectSchema,
	featureValueSet,
	requireNonEmptyFeatureObject,
} from "../../../../shared/feature-helpers.js";

export const enPronounFeaturesSchema = z.strictObject({
	inherent: buildOptionalFeatureObjectSchema({
		abbr: abstractFeatureAtomSchemas.abbr,
		extPos: abstractFeatureAtomSchemas.extPos.extract(["ADV", "PRON"]),
		person: abstractFeatureAtomSchemas.person.extract(["1", "2", "3"]),
		poss: abstractFeatureAtomSchemas.poss,
		pronType: featureValueSet(
			abstractFeatureAtomSchemas.pronType.extract([
				"Dem",
				"Emp",
				"Ind",
				"Int",
				"Neg",
				"Prs",
				"Rcp",
				"Rel",
				"Tot",
			]),
		),
		style: abstractFeatureAtomSchemas.style.extract([
			"Arch",
			"Coll",
			"Expr",
			"Slng",
			"Vrnc",
		]),
	}),
	inflectional: requireNonEmptyFeatureObject(
		buildOptionalFeatureObjectSchema({
			case: abstractFeatureAtomSchemas.case.extract([
				"Acc",
				"Gen",
				"Nom",
			]),
			gender: abstractFeatureAtomSchemas.gender.extract([
				"Fem",
				"Masc",
				"Neut",
			]),
			number: abstractFeatureAtomSchemas.number.extract(["Plur", "Sing"]),
			reflex: abstractFeatureAtomSchemas.reflex,
		}),
	),
}) satisfies z.ZodSchema<EnPronounFeatures>;
