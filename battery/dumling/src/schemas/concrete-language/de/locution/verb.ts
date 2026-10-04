import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { DeVerbalInflectionalFeatureBagSchema } from "../de-feature-catalog.js";

// A VERB Locution inflects like a verb: Er hat den Faden verloren (ADR 0039).
// Its fixed words, a reflexive or particle included, are its wording, so it
// has no Core Features.
export const DeVerbLocutionFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({}),
	[FeatureBagKind.Inflectional]: DeVerbalInflectionalFeatureBagSchema,
});
