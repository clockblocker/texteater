import { createHash } from "node:crypto";

import type { EntryCase } from "./corpus";

export const ARM_IDS = [
	"direct-family-first",
	"direct-citation-first",
	"progressive-grammar-first",
	"progressive-identity-first",
	"progressive-citation-first",
	"agentic-candidate-inspection",
	"agentic-hydrated",
] as const;

export type ArmId = (typeof ARM_IDS)[number];

const IDENTITY_RULES = `
A Linguistic Entry has an opaque identity. Never derive identity by hashing or
matching language, spelling, Citation Form, part of speech, inherent features,
or paradigm. Those fields can prove difference and retrieve candidates, but
matching them does not prove sameness. Use the supplied versioned boundary
catalog. Meaning or learner-note content is not part of this task.

Return Existing only when one supplied candidate is the contextual identity.
Return its entryId exactly. If none matches, return ProposeNew with entryId null
and resolve the proposed Entry descriptor.
`.trim();

const INVENTORY = `
The concrete German Dumling inventory has Entry families Lexeme, Phraseme,
Morpheme, and Construction. Lexeme subkinds are ADJ, ADV, INTJ, NOUN, PROPN,
VERB, ADP, AUX, CCONJ, DET, NUM, PART, PRON, SCONJ, PUNCT, SYM, X. Phraseme
subkinds are DiscourseFormula, Aphorism, Proverb, Idiom. Morpheme subkinds are
Root, Prefix, Suffix, Suffixoid, Infix, Circumfix, Interfix, Transfix, Clitic,
ToneMarking, Duplifix. Construction subkinds are Fusion and PairedFrame.

For corpus-relevant German descriptors, use only these non-null inherent
features: NOUN gender; VERB hasGovPrep, hasSepPrefix, lexicallyReflexive,
verbType; ADP abbr, adpType, extPos, foreign, governedCase, partType; ADJ abbr,
foreign, numType, variant. Phraseme/Idiom and Morpheme/Circumfix use no
inherent features. Omit null fields. Russian boundary probes use the same
abstract Lexeme/NOUN shape with gender.
`.trim();

const OUTPUT_RULES = `
inherentFeatures is an ordered array of non-null name/value pairs. Use an empty
array when none apply. Do not copy Surface inflectional features into inherent
features. Citation Form is complete and canonical; normalizedSurface remains
the supplied contextual form.
`.trim();

export const DIRECT_FAMILY_FIRST_PROMPT = `
You are a schema-directed Linguistic Entry resolver.
${IDENTITY_RULES}
${INVENTORY}
${OUTPUT_RULES}

Reason in this order: family and subkind; Citation Form; inherent features;
opaque identity decision. Return only the schema result.
`.trim();

export const DIRECT_CITATION_FIRST_PROMPT = `
You are a schema-directed Linguistic Entry resolver.
${IDENTITY_RULES}
${INVENTORY}
${OUTPUT_RULES}

Reason in this order: Citation Form; family and subkind; inherent features;
opaque identity decision. Return only the schema result.
`.trim();

export const DESCRIPTOR_FIRST_PROMPT = `
You are the first narrow stage of a Linguistic Entry resolver.
${INVENTORY}
${OUTPUT_RULES}

Resolve family, subkind, Citation Form, and inherent features from the supplied
contextual Surface. Do not choose or invent an Entry ID in this stage.
`.trim();

export const IDENTITY_AFTER_GRAMMAR_PROMPT = `
You are the identity stage after a provisional grammatical descriptor.
${IDENTITY_RULES}
${OUTPUT_RULES}

Use context, candidate boundary glosses, and the provisional descriptor. Return
the canonical full result. The provisional descriptor is evidence, not
identity, and may be corrected.
`.trim();

export const IDENTITY_FIRST_PROMPT = `
You are the first narrow identity stage of a Linguistic Entry resolver.
${IDENTITY_RULES}

Use context and candidate boundary glosses. Choose Existing with the exact
candidate ID or ProposeNew with null. Do not return Citation Form or grammar.
`.trim();

export const DESCRIPTOR_AFTER_IDENTITY_PROMPT = `
You are the descriptor stage after an opaque identity decision.
${INVENTORY}
${OUTPUT_RULES}

Return the canonical full result. Preserve the supplied identity decision and
Entry ID unless they are structurally invalid; resolve family, subkind,
Citation Form, and inherent features without using Surface inflectional
features as inherent features.
`.trim();

export const CITATION_FIRST_PROMPT = `
You are the first narrow Citation Form stage of a Linguistic Entry resolver.
Return only the complete canonical Citation Form behind the supplied contextual
Surface. Do not choose an Entry ID or resolve grammar.
`.trim();

export const REST_AFTER_CITATION_PROMPT = `
You are the final stage after provisional Citation Form resolution.
${IDENTITY_RULES}
${INVENTORY}
${OUTPUT_RULES}

Resolve family, subkind, inherent features, and opaque identity. Return the
canonical full result and correct the provisional Citation Form if necessary.
`.trim();

export const AGENTIC_PROMPT = `
You are a tool-using Linguistic Entry resolver.
${IDENTITY_RULES}
${INVENTORY}
${OUTPUT_RULES}

The user input contains candidate stubs without boundary glosses. First call
inspect_entry_candidates with one or more candidate IDs whose boundary details
you need. After reading the tool result, return the canonical schema result.
`.trim();

export const AGENTIC_HYDRATED_PROMPT = `
You are the identity-only stage of a tool-using Linguistic Entry resolver.
${IDENTITY_RULES}

The user input contains candidate stubs without boundary glosses. Call
inspect_entry_catalog exactly once. It returns the complete versioned candidate
catalog. After reading every returned boundary gloss, return only Existing with
the exact matching Entry ID or ProposeNew with null. Do not return or infer the
descriptor: application code hydrates Existing entries from the catalog.
`.trim();

export const NEW_ENTRY_DESCRIPTOR_PROMPT = `
You are the schema-directed descriptor stage for a proposed new Linguistic
Entry. The identity stage has already proved that no supplied candidate
matches.
${INVENTORY}
${OUTPUT_RULES}

Return family, subkind, Citation Form, and inherent features. Do not return an
Entry ID.
`.trim();

export function fullCaseInput(entryCase: EntryCase): string {
	return JSON.stringify(
		{
			caseId: entryCase.id,
			language: entryCase.language,
			boundaryPolicyVersion: entryCase.boundaryPolicyVersion,
			sentence: entryCase.sentence,
			surface: {
				normalizedSurface: entryCase.normalizedSurface,
				surfaceKind: entryCase.surfaceKind,
				inflectionalFeatures: entryCase.inflectionalFeatures,
			},
			candidates: entryCase.candidates,
		},
		null,
		2,
	);
}

export function stubCaseInput(entryCase: EntryCase): string {
	return JSON.stringify(
		{
			caseId: entryCase.id,
			language: entryCase.language,
			boundaryPolicyVersion: entryCase.boundaryPolicyVersion,
			sentence: entryCase.sentence,
			surface: {
				normalizedSurface: entryCase.normalizedSurface,
				surfaceKind: entryCase.surfaceKind,
				inflectionalFeatures: entryCase.inflectionalFeatures,
			},
			candidateStubs: entryCase.candidates.map(
				({ boundaryGloss: _boundaryGloss, ...candidate }) => candidate,
			),
		},
		null,
		2,
	);
}

export function stageInput(
	entryCase: EntryCase,
	stageName: string,
	stageOutput: unknown,
): string {
	return JSON.stringify(
		{
			...JSON.parse(fullCaseInput(entryCase)),
			[stageName]: stageOutput,
		},
		null,
		2,
	);
}

export function armBuildHash(armId: ArmId): string {
	const prompts: Record<ArmId, readonly string[]> = {
		"direct-family-first": [DIRECT_FAMILY_FIRST_PROMPT],
		"direct-citation-first": [DIRECT_CITATION_FIRST_PROMPT],
		"progressive-grammar-first": [
			DESCRIPTOR_FIRST_PROMPT,
			IDENTITY_AFTER_GRAMMAR_PROMPT,
		],
		"progressive-identity-first": [
			IDENTITY_FIRST_PROMPT,
			DESCRIPTOR_AFTER_IDENTITY_PROMPT,
		],
		"progressive-citation-first": [
			CITATION_FIRST_PROMPT,
			REST_AFTER_CITATION_PROMPT,
		],
		"agentic-candidate-inspection": [AGENTIC_PROMPT],
		"agentic-hydrated": [
			AGENTIC_HYDRATED_PROMPT,
			NEW_ENTRY_DESCRIPTOR_PROMPT,
		],
	};
	return createHash("sha256")
		.update(JSON.stringify({ armId, prompts: prompts[armId] }))
		.digest("hex");
}
