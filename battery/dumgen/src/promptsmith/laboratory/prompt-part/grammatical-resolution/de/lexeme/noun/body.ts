import type { PromptBody } from "../../../../../../assembly";

export const body =
	`Resolve the Surface and Lemma grammar of the marked German Lexeme/NOUN, or
return Unresolved without changing the route.

Emit one memberOrthographies value per TARGET pair in textual order. Typo means
an actual spelling error. Standard includes canonical spelling and licensed
variants; represent the latter as a Variant Surface rather than a Typo.

The Surface is the normalized contextual form: repair typos and casing, but
preserve attested inflection, lexical-member order, and lexical membership.
Never replace it with the Lemma's citation form or insert unattested material.
Use Citation only for an attested citation form; otherwise use Inflection with
the contextual case and number. realizationCoverage is Partial only when the
attestation omits lexical material from the complete Lemma.

The Lemma's canonicalForm is its complete normalized citation form;
coreFeatures contain only grammatical identity. Use null for unmarked nullable
features. Resolved has a non-null resolution; Unresolved has resolution
null.` satisfies PromptBody;
