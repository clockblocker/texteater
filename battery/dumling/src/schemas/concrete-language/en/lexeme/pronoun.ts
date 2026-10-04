import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
	featureValueSetSchema,
} from "../../../universal/index.js";
import { EN_FEATURE_SCHEMA } from "../en-feature-catalog.js";

// Each spelled paradigm cell is its own Lemma: I, me, my, mine and myself
// differ in Core case, number, gender or reflex (system ADR 0032).
export const EnPronounFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: EN_FEATURE_SCHEMA.abbr,
		extPos: EN_FEATURE_SCHEMA.extPos.extract(["ADV", "PRON"]),
		person: EN_FEATURE_SCHEMA.person.extract(["1", "2", "3"]),
		poss: EN_FEATURE_SCHEMA.poss,
		pronType: featureValueSetSchema(
			EN_FEATURE_SCHEMA.pronType.extract([
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
		case: EN_FEATURE_SCHEMA.case.extract(["Acc", "Gen", "Nom"]),
		gender: EN_FEATURE_SCHEMA.gender.extract(["Fem", "Masc", "Neut"]),
		number: EN_FEATURE_SCHEMA.number.extract(["Plur", "Sing"]),
		reflex: EN_FEATURE_SCHEMA.reflex,
	}),
});
