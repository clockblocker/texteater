import {
	germanParticleCoreError,
	isGermanParticleCore,
} from "../../../../validation/semantics.js";
import {
	FeatureBagKind,
	featureBagSchema,
	featureBags,
} from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// German PART is closed (system ADR 0032): nicht (polarity Neg), infinitive
// zu (partType Inf) and the authored modal particles (partType Mod). Every
// Lemma names exactly one type; answers are INTJ partType Res, so polarity
// Pos is no German PART value.
export const DeParticleFeatureBagsSchema = featureBags({
	[FeatureBagKind.Core]: featureBagSchema({
		partType: DE_FEATURE_SCHEMA.partType.extract(["Inf", "Mod"]),
		polarity: DE_FEATURE_SCHEMA.polarity,
	}).refine(isGermanParticleCore, { error: germanParticleCoreError }),
});
