import { createHash } from "node:crypto";

import type { MeaningCandidate, MeaningCase } from "./corpus";

export const ARM_IDS = [
	"direct-descriptions-forward",
	"direct-descriptions-reverse",
	"direct-description-emoji",
	"direct-full-candidates",
	"direct-full-few-shot",
	"agentic-candidate-inspection",
	"progressive-decision-then-draft",
] as const;

export type ArmId = (typeof ARM_IDS)[number];

const CONTRACT = `
You resolve a learner-owned Meaning only after the opaque Linguistic Entry is
already resolved. The candidate inventory contains only this learner's
Meanings for exactly that Entry. Never use Meaning to revisit Entry identity.

Reuse a candidate when it already gives the learner a useful note for this
context. Do not split semantic pennies: a small contextual, metaphorical,
domain, or wording difference does not deserve a new learner note when an
existing broad description covers it. DraftNew only when no candidate covers a
genuinely note-worthy use that would benefit from a separate note.

For ReuseExisting, copy one supplied meaningId exactly and set draft to null.
For DraftNew, set existingMeaningId to null. Write exactly one lower-case,
short, concrete English description block and a compact literal emoji string.
Never copy an ill-fitting candidate merely to avoid drafting.
`.trim();

const FEW_SHOT = `
Examples use synthetic cases that are not in the evaluation corpus.

Input: Entry x-light, context "This light is bright", candidate x1 =
"something that illuminates", emoji 💡.
Output: {"decision":"ReuseExisting","existingMeaningId":"x1","draft":null}

Input: Entry x-light, context "The box is light", only candidate x1 =
"something that illuminates", emoji 💡.
Output: {"decision":"DraftNew","existingMeaningId":null,"draft":{"meaningInEmojis":"🪶","descriptionBlocks":["having little weight"]}}
`.trim();

export const DIRECT_PROMPT = `${CONTRACT}

Return only the structured result.`.trim();

export const FEW_SHOT_PROMPT = `${CONTRACT}

${FEW_SHOT}

Return only the structured result.`.trim();

export const AGENTIC_PROMPT = `${CONTRACT}

The first view contains only candidate IDs. You must call
inspect_meaning_candidates once with every supplied ID before deciding. Base
the final structured result on the inspected descriptions, emojis, and
examples.`.trim();

export const DECISION_ONLY_PROMPT = `
You decide whether a contextual use reuses one learner-owned Meaning for an
already-resolved opaque Linguistic Entry. The inventory contains only this
learner's Meanings for that Entry.

Do not split semantic pennies when an existing broad description covers a
small contextual or domain difference. However, different concrete referent
kinds or learner-note concepts are note-worthy: a building is not a lock
device, and furniture is not a person who leads a meeting. Return DraftNew when
the inventory is empty or every candidate describes the wrong concept.

Return only ReuseExisting with one supplied meaningId, or DraftNew with a null
meaningId. Do not generate a draft in this stage.
`.trim();

export const DRAFT_ONLY_PROMPT = `
Draft one learner-owned Meaning for the already-resolved Entry and contextual
use. Return one compact literal emoji string and exactly one short, concrete,
lower-case English description block. Describe the contextual concept itself;
do not copy a rejected candidate.
`.trim();

type Presentation = "descriptions" | "description-emoji" | "full";

export function caseInput(
	meaningCase: MeaningCase,
	presentation: Presentation,
	reverse: boolean,
): string {
	const candidates = reverse
		? [...meaningCase.candidates].reverse()
		: meaningCase.candidates;
	return JSON.stringify(
		{
			learnerId: meaningCase.learnerId,
			language: meaningCase.language,
			resolvedEntryId: meaningCase.entryId,
			citationForm: meaningCase.citationForm,
			context: meaningCase.context,
			normalizedSurface: meaningCase.normalizedSurface,
			candidateMeanings: candidates.map((candidate) =>
				presentCandidate(candidate, presentation),
			),
		},
		null,
		2,
	);
}

export function stubInput(meaningCase: MeaningCase): string {
	return JSON.stringify(
		{
			caseId: meaningCase.id,
			learnerId: meaningCase.learnerId,
			language: meaningCase.language,
			resolvedEntryId: meaningCase.entryId,
			citationForm: meaningCase.citationForm,
			context: meaningCase.context,
			normalizedSurface: meaningCase.normalizedSurface,
			candidateMeaningIds: meaningCase.candidates.map(
				(candidate) => candidate.meaningId,
			),
		},
		null,
		2,
	);
}

function presentCandidate(
	candidate: MeaningCandidate,
	presentation: Presentation,
): Record<string, unknown> {
	const base = {
		meaningId: candidate.meaningId,
		descriptionBlocks: candidate.descriptionBlocks,
	};
	if (presentation === "descriptions") return base;
	if (presentation === "description-emoji") {
		return { ...base, meaningInEmojis: candidate.meaningInEmojis };
	}
	return {
		...base,
		meaningInEmojis: candidate.meaningInEmojis,
		examples: candidate.examples,
	};
}

export function armBuildHash(armId: ArmId): string {
	const prompt =
		armId === "direct-full-few-shot" ? FEW_SHOT_PROMPT : DIRECT_PROMPT;
	return createHash("sha256")
		.update(
			JSON.stringify({
				armId,
				prompt,
				agenticPrompt:
					armId === "agentic-candidate-inspection"
						? AGENTIC_PROMPT
						: null,
				progressivePrompts:
					armId === "progressive-decision-then-draft"
						? [DECISION_ONLY_PROMPT, DRAFT_ONLY_PROMPT]
						: null,
			}),
		)
		.digest("hex");
}
