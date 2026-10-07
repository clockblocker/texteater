import type * as Dumling from "dumling/types";
import type { AuthoredMember } from "../member.js";
import { member as bekommenRezipientenpassiv } from "./members/lexeme/auxiliary/bekommen-rezipientenpassiv.js";
import { member as habenPerfekt } from "./members/lexeme/auxiliary/haben-perfekt.js";
import { member as lassenKausativ } from "./members/lexeme/auxiliary/lassen-kausativ.js";
import { member as seinPerfekt } from "./members/lexeme/auxiliary/sein-perfekt.js";
import { member as werdenFutur } from "./members/lexeme/auxiliary/werden-futur.js";
import { member as werdenVorgangspassiv } from "./members/lexeme/auxiliary/werden-vorgangspassiv.js";

type VerbFeatures = NonNullable<
	Dumling.Surface<"de", "Lexeme", "VERB">["inflectionalFeatures"]
>;
type Composed = "perfect" | "future" | "passive" | "voice";

/** The verbal-composition features one auxiliary use sets on its VERB's Surface. */
type AuxiliarySurfaceFeatures = {
	readonly [Feature in Composed]?: NonNullable<VerbFeatures[Feature]>;
};

/**
 * The features each authored AUX Reading gives the VERB Surface it serves
 * (ADR 0022, ADR 0026): the perfect with haben or sein, the future with
 * werden, the process passive with werden, the recipient passive with
 * bekommen, the causative with lassen. Each entry holds the authored member
 * itself, so a change to its Canonical Form or Emoji Description carries
 * over. The other AUX Readings (würde, haben and sein with zu, sein with am)
 * set none of these features.
 */
export const auxiliarySurfaceFeatures: readonly {
	readonly member: AuthoredMember;
	readonly features: AuxiliarySurfaceFeatures;
}[] = [
	{ member: habenPerfekt, features: { perfect: "Yes" } },
	{ member: seinPerfekt, features: { perfect: "Yes" } },
	{ member: werdenFutur, features: { future: "Yes" } },
	{
		member: werdenVorgangspassiv,
		features: { passive: "Process", voice: "Pass" },
	},
	{
		member: bekommenRezipientenpassiv,
		features: { passive: "Recipient", voice: "Pass" },
	},
	{ member: lassenKausativ, features: { voice: "Cau" } },
];
