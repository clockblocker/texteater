import { createHash } from "node:crypto";

import type { GoldCase } from "./corpus";

export const ARM_IDS = [
	"monolith-indices",
	"monolith-text",
	"chain-free-normalization",
	"chain-guarded-normalization",
	"agentic-inspection",
] as const;

export type ArmId = (typeof ARM_IDS)[number];

const DOMAIN_RULES = `
Resolve the clicked ResolvableText segment to the complete contextual Surface.
Membership is an ordered, unique list of ResolvableText segments and must include
the clicked index. Membership may be discontinuous. Do not include merely
governed or valency-associated words.

Do real linguistic analysis before choosing membership. The Surface is the
smallest contextual grammatical unit that delivers the learner's largest
semantic win, not automatically the clicked orthographic word and never the
whole sentence. Include all and only participating atoms of a particle verb,
fixed expression, chat-style compositional expression, or discontinuous
morpheme. A detached particle can be far from its verb. A discontinuous affix
can surround a stem without including that stem. Subjects, objects, modifiers,
and other arguments are not members merely because they belong to the clause.

selectedOrthography describes only the clicked segment: Standard or Typo.
Inflection, capitalization, and ordinary contextual form are Standard, not
Typo. A typo is an actual spelling error in that clicked text.
normalizedSurface preserves the attested contextual inflection and member order.
It may repair typos and ordinary casing, but must not insert, reorder, or
lemmatize unattested lexical material. A licensed regional spelling is not a
typo: preserve it and mark spelling Variant. An ordinary corrected typo still
resolves to spelling Canonical, not Variant. normalizedSurface must contain only
normalized member material—never the surrounding sentence, punctuation, or
non-member context. realizationCoverage is Partial only when the attested
Surface realizes only part of its Linguistic Entry, such as a fixed idiom whose
other lexical constituents are absent from the contextual realization.
`.trim();

export const MONOLITH_INDICES_PROMPT = `
You are the direct Selection and Surface resolver for a language-learning tool.
${DOMAIN_RULES}

Return canonical member indices plus the four requested Selection/Surface
fields. Do not return attestedSurface; application code derives it.
`.trim();

export const MONOLITH_TEXT_PROMPT = `
You are the quoted-text Selection and Surface resolver for a language-learning
tool. ${DOMAIN_RULES}

Return each member's exact source text in sentence order instead of indices.
Do not add occurrence numbers, surrounding context, positions, or indices.
Each array element must be the complete text of exactly one ResolvableText
segment. Never return whitespace, punctuation, a substring, or a string that
combines multiple segments.
The application adapter will accept only exact texts that map unambiguously to
one ResolvableText segment.
`.trim();

export const MEMBERSHIP_PROMPT = `
You are the narrow Selection-membership resolver for a language-learning tool.
Choose the complete contextual Surface membership as ordered, unique
ResolvableText indices and include the clicked index. Membership may be
discontinuous. Do not include merely governed or valency-associated words.
Do real linguistic analysis: include all and only participating atoms of a
particle verb, fixed expression, chat-style compositional expression, or
discontinuous morpheme. Do not inflate membership to a phrase or sentence.
A detached particle can be far from its verb; a discontinuous affix can surround
a stem without including that stem.
selectedOrthography describes only the clicked segment, even if another member
is misspelled. Inflection and capitalization are Standard; only an actual
spelling error is Typo.
`.trim();

export const FREE_NORMALIZATION_PROMPT = `
You are the narrow contextual-Surface normalizer for a language-learning tool.
Membership has already been validated and attestedSurface was constructed
verbatim by application code. Normalize that contextual Surface without
inserting, reordering, deleting, or lemmatizing lexical constituents. Repair
typos and ordinary casing. Output only normalized member material: never copy
the surrounding sentence or punctuation, and keep the same number and order of
whitespace-delimited lexical atoms as applicationAttestedSurface. Preserve
licensed regional variants and mark them Variant. An ordinary corrected typo is
Canonical, not Variant. Keep an incomplete idiom realization verbatim and mark
coverage Partial instead of expanding it to the full citation form.
`.trim();

export const GUARDED_NORMALIZATION_PROMPT = `
You are the guarded contextual-Surface normalizer for a language-learning tool.
Membership has already been validated. Return exactly one normalization record
per supplied member index, in the supplied order. normalizedText must contain no
whitespace: it may correct that member's typo or casing but cannot introduce
another lexical constituent. Preserve licensed regional variants and mark them
Variant; an ordinary corrected typo is Canonical, not Variant. Preserve
contextual inflection rather than replacing a member with a lemma. Mark coverage
Partial for an incomplete fixed expression instead of expanding it.
`.trim();

export const AGENTIC_INSPECTION_PROMPT = `
You are a tool-using Selection and Surface resolver for a language-learning
tool. ${DOMAIN_RULES}

First call inspect_membership with your candidate canonical indices. The tool
checks domain validity and constructs the verbatim attestedSurface. After
reading that result, return the canonical member indices and requested
Selection/Surface fields. Do not return attestedSurface.
`.trim();

export function caseInput(goldCase: GoldCase): string {
	return JSON.stringify(
		{
			segmentedSentenceId: goldCase.sentence.id,
			language: goldCase.sentence.language,
			clickedSegmentIndex: goldCase.clickedSegmentIndex,
			segments: goldCase.sentence.segments.map((segment, index) => ({
				index,
				kind: segment.kind,
				text: segment.text,
			})),
		},
		null,
		2,
	);
}

export function normalizationInput(
	goldCase: GoldCase,
	indices: readonly number[],
	attestedSurface: string,
): string {
	return JSON.stringify(
		{
			...JSON.parse(caseInput(goldCase)),
			validatedSurfaceSegmentIndices: indices,
			applicationAttestedSurface: attestedSurface,
			members: indices.map((index) => ({
				index,
				text: goldCase.sentence.segments[index]?.text,
			})),
		},
		null,
		2,
	);
}

export function armBuildHash(armId: ArmId): string {
	const prompts: Record<ArmId, readonly string[]> = {
		"monolith-indices": [MONOLITH_INDICES_PROMPT],
		"monolith-text": [MONOLITH_TEXT_PROMPT],
		"chain-free-normalization": [
			MEMBERSHIP_PROMPT,
			FREE_NORMALIZATION_PROMPT,
		],
		"chain-guarded-normalization": [
			MEMBERSHIP_PROMPT,
			GUARDED_NORMALIZATION_PROMPT,
		],
		"agentic-inspection": [AGENTIC_INSPECTION_PROMPT],
	};
	return createHash("sha256")
		.update(JSON.stringify({ armId, prompts: prompts[armId] }))
		.digest("hex");
}
