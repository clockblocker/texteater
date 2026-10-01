import type { Assert } from "common-utils";
import { z } from "zod";
import {
	germanParticleCoreError,
	isGermanParticleCore,
} from "../../../../validation/semantics.js";
import type { IsUniversalFeatureBags } from "../../../universal/index.js";
import { FeatureBagKind, featureBagSchema } from "../../../universal/index.js";
import { DE_FEATURE_SCHEMA } from "../de-feature-catalog.js";

// German PART is closed (system ADR 0032): nicht (polarity Neg), infinitive
// zu (partType Inf) and the authored modal particles (partType Mod). Every
// Lemma names exactly one type; answers are INTJ partType Res, so polarity
// Pos is no German PART value.
export const DeParticleFeatureBagsSchema = z.strictObject({
	[FeatureBagKind.Core]: featureBagSchema({
		abbr: DE_FEATURE_SCHEMA.abbr,
		partType: DE_FEATURE_SCHEMA.partType.extract(["Inf", "Mod"]),
		polarity: DE_FEATURE_SCHEMA.polarity.extract(["Neg"]),
	}).refine(isGermanParticleCore, { error: germanParticleCoreError }),
});

export type DeParticleFeatureBags = z.infer<typeof DeParticleFeatureBagsSchema>;

type _DeParticleFeatureBagsAreUniversal = Assert<
	IsUniversalFeatureBags<DeParticleFeatureBags>
>;
