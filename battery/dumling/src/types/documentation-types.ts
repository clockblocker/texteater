import type {
	Attestation,
	Lemma,
	SupportedLanguage,
	Surface,
} from "./public-types.js";

export type EntityValue<L extends SupportedLanguage = SupportedLanguage> =
	| Lemma<L>
	| Surface<L>
	| Attestation<L>;
