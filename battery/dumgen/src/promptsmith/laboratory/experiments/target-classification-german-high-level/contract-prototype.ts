// PROTOTYPE ONLY — deterministic comparison contract for issue #85.

import { createHash } from "node:crypto";

import { z } from "zod";
import { stableJson } from "../../../../lib/stable-json";
import {
	assembleSystemPrompt,
	assertCaseSelectionsUncontaminated,
	defineLocalDemonstrations,
	definePromptSource,
} from "../../../assembly";
import { promptPart as productionPromptPart } from "../../../production/prompt-part/target-classification/de/high-level-whole-unit";
import { corpus } from "../../canonical-classification-corpus/target-classification/de/high-level-whole-unit/corpus";
import {
	adaptiveDevelopmentSelection,
	demonstrationSelection,
	diagnosticSelection,
	evaluationSelection,
} from "../../canonical-classification-corpus/target-classification/de/high-level-whole-unit/selections";
import {
	evaluateGermanHighLevelClickInvariance,
	evaluateGermanHighLevelTargetClassification,
	GERMAN_HIGH_LEVEL_TARGET_EVALUATOR_VERSION,
} from "./evaluator";
import {
	EVALUATOR_SEMANTIC_FIXTURE_MATRIX_VERSION,
	proveEvaluatorSemanticDependencies,
} from "./evaluator-semantic-fixtures";
import {
	classificationInputSchema,
	materializeRepresentation,
	outputSchemaForRepresentation,
	parseAndCanonicalizeRepresentation,
	projectClassificationInput,
	proveAdapterPostconditions,
	REPRESENTATION_IDS,
	type RepresentationId,
} from "./representations";

export const PROTOTYPE_QUESTION =
	"Does the lean additional-member indices contract preserve the German high-level target policy across the development suite?";
export const RUNNER_VERSION =
	"target-classification-high-level-contracts-v16-no-collocation";
export const RUN_MODEL = "gpt-5.6-luna";
export const EXPECTED_RESOLVED_MODEL = "gpt-5.6-luna";
export const REASONING_EFFORT = "none";
export const TEXT_VERBOSITY = "low";
export const MAX_OUTPUT_TOKENS = 1024;
export const ATTEMPTS_PER_ARM = 2;
export const EXPECTED_EVALUATION_CASES = 94;
export const EXPECTED_CALLS_PER_ARM =
	EXPECTED_EVALUATION_CASES * ATTEMPTS_PER_ARM;
export const EXACT_CALL_CAP =
	EXPECTED_CALLS_PER_ARM * REPRESENTATION_IDS.length;
export const MAXIMUM_SPEND_USD = 2;
export const MINIMUM_ATTEMPT_CONTRACT_SCORE = 90;
export const MINIMUM_ATTEMPT_CONTRACT_RATIO =
	MINIMUM_ATTEMPT_CONTRACT_SCORE / EXPECTED_EVALUATION_CASES;
export const TIE_MARGIN = 0.01;
export const DECISION_POLICY = Object.freeze({
	expectedCallsPerArm: EXPECTED_CALLS_PER_ARM,
	expectedEvaluationCasesPerAttempt: EXPECTED_EVALUATION_CASES,
	minimumAttemptContractScore: MINIMUM_ATTEMPT_CONTRACT_SCORE,
	minimumAttemptContractRatio: MINIMUM_ATTEMPT_CONTRACT_RATIO,
	tieMargin: TIE_MARGIN,
	tieRule: "inclusive-best-ratio-margin" as const,
});
export const DIAGNOSTIC_DECISION_POLICY = Object.freeze({
	purpose: "failure-triangulation" as const,
	expectedCallsPerArm: diagnosticSelection.ids.length * ATTEMPTS_PER_ARM,
	expectedEvaluationCasesPerAttempt: diagnosticSelection.ids.length,
	winnerEligible: false as const,
});
export const ADAPTIVE_ITERATION_POLICY = Object.freeze({
	purpose: "prompt-development" as const,
	expectedEvaluationCasesPerAttempt: 30,
	attemptsPerProfile: ATTEMPTS_PER_ARM,
	gates: Object.freeze([
		"zero-execution-errors",
		"zero-unclassified-misses",
		"membership-safety",
		"click-invariance",
	] as const),
	primaryRanking: Object.freeze([
		"maximum-worst-replicate-score",
		"maximum-aggregate-score",
	] as const),
	parsimonyThresholdPerReplicate: 0.95,
	parsimonyRanking: Object.freeze([
		"minimum-demonstration-count",
		"minimum-prompt-utf8-bytes",
	] as const),
	finalRegressionProfile: "frozen-94" as const,
	noPromptChangesAfterFinalSelection: true as const,
	regressionFallback:
		"When no profile passes every eligibility gate, the requested regression may freeze the highest worst-replicate then aggregate scorer as an explicitly ineligible fallback." as const,
});
export const BATCH_CACHE_POLICY = Object.freeze({
	transport: "openai-batch" as const,
	endpoint: "/v1/responses" as const,
	completionWindow: "24h" as const,
	promptCacheMode: "explicit" as const,
	promptCacheTtl: "30m" as const,
	promptCacheBreakpoint: "end-of-stable-system-prompt" as const,
	maximumScheduledRequestsPerCacheKey: 12,
});
export const DIRECT_RESPONSES_POLICY = Object.freeze({
	transport: "openai-responses" as const,
	endpoint: "/v1/responses" as const,
	concurrency: 8,
	promptCacheMode: "explicit" as const,
	promptCacheTtl: "30m" as const,
	promptCacheBreakpoint: "end-of-stable-system-prompt" as const,
	maximumScheduledRequestsPerCacheKey: 12,
});
export const BATCH_PRICE_SCHEDULE = Object.freeze({
	id: "openai-batch-gpt-5.6-luna-2026-08-09",
	longContextThresholdTokens: 272_000,
	shortContext: Object.freeze({
		inputUsdPerMillion: 0.1,
		cachedInputUsdPerMillion: 0.01,
		cacheWriteUsdPerMillion: 0.125,
		outputUsdPerMillion: 0.6,
	}),
	longContext: Object.freeze({
		inputUsdPerMillion: 0.2,
		cachedInputUsdPerMillion: 0.02,
		cacheWriteUsdPerMillion: 0.25,
		outputUsdPerMillion: 0.9,
	}),
});
export const DIRECT_PRICE_SCHEDULE = Object.freeze({
	id: "openai-responses-gpt-5.6-luna-2026-08-10",
	longContextThresholdTokens: 272_000,
	shortContext: Object.freeze({
		inputUsdPerMillion: 0.2,
		cachedInputUsdPerMillion: 0.02,
		cacheWriteUsdPerMillion: 0.25,
		outputUsdPerMillion: 1.2,
	}),
	longContext: Object.freeze({
		inputUsdPerMillion: 0.4,
		cachedInputUsdPerMillion: 0.04,
		cacheWriteUsdPerMillion: 0.5,
		outputUsdPerMillion: 1.8,
	}),
});
export type PrototypePriceSchedule =
	| typeof BATCH_PRICE_SCHEDULE
	| typeof DIRECT_PRICE_SCHEDULE;

export const RUNNER_POOL_IDS = [
	"development",
	"adaptive",
	"diagnostic",
] as const;
export type RunnerPoolId = (typeof RUNNER_POOL_IDS)[number];
export const RUN_PROFILE_IDS = [
	"frozen-94",
	"adaptive-1",
	"adaptive-2",
	"adaptive-3",
	"adaptive-4",
	"adaptive-5",
	"diagnostic",
] as const;
export type RunProfileId = (typeof RUN_PROFILE_IDS)[number];
export const runnerParametersSchema = z.preprocess(
	(value) => {
		if (typeof value !== "object" || value === null) return value;
		const parameters = value as Record<string, unknown>;
		if (parameters.profile !== undefined) return value;
		return {
			...parameters,
			profile:
				parameters.pool === "adaptive"
					? "adaptive-1"
					: parameters.pool === "diagnostic"
						? "diagnostic"
						: "frozen-94",
		};
	},
	z
		.strictObject({
			batching: z.boolean(),
			pool: z.enum(RUNNER_POOL_IDS).default("development"),
			profile: z.enum(RUN_PROFILE_IDS),
		})
		.superRefine((parameters, context) => {
			const expectedPool = parameters.profile.startsWith("adaptive-")
				? "adaptive"
				: parameters.profile === "diagnostic"
					? "diagnostic"
					: "development";
			if (parameters.pool !== expectedPool) {
				context.addIssue({
					code: "custom",
					path: ["profile"],
					message: `Profile ${parameters.profile} requires pool ${expectedPool}.`,
				});
			}
		}),
);
export type RunnerParameters = z.output<typeof runnerParametersSchema>;
export type RunnerParameterInput = Readonly<{
	batching: boolean;
	pool?: RunnerPoolId;
	profile?: RunProfileId;
}>;

// biome-ignore lint/correctness/noUnusedVariables: Retained as the historical prompt comparison artifact while the newer prompt is tested.
const oldBsCommonPrompt = `You are resolving exactly one clicked segment for a German learner. Return the complete high-level language unit that contains the click and its Family/Kind route. This is target selection only: no grammatical drill-down, lemma resolution, or canonical form.

Dumling's big picture:

- An ordinary word is a Lexeme with its contextually correct UD-like word class.
- Dumling can also select established Phraseme and Construction units that bare word-by-word analysis would miss.
- A separable, multi-part, perfect, future, or passive realization of one verb counts here as one inflected Lexeme/VERB.

CLICK FIRST — this constraint is non-negotiable:

1. clickedIndex is zero-based and identifies the exact clicked position in segments.
2. Consider only targets containing that exact segment. Discard every target that does not contain it, even if it is the most salient expression in the surrounding context.
3. If the click is on a free word inside, between, or beside the members of another unit, return the clicked word as its own Lexeme. Do not return the nearby unit.

FIXED TOGETHER. FREE APART.

Idiom: fixed members only; skip inserted free modifiers, and a modifier click = that Lexeme only.

Parts go together for three reasons:

- FIXED EXPRESSION: realized fixed members of an established Phraseme or Construction.
- VALENCY: a verb plus its governed preposition, or an inherently reflexive verb plus its required reflexive pronoun. The argument itself stays free.
- GRAMMAR: the realized pieces of one inflected verb, including separable pieces and tense or voice auxiliaries.

Idiom recognition is about the meaning of this occurrence, not whether its words match a known idiom. When the supplied context makes the wording physical or otherwise compositional, do not group it as an Idiom.

Read all supplied context; it may contain several sentences. Choose the largest defensible unit containing the click. Mere syntactic relation or familiar co-occurrence is not enough. If the larger unit is doubtful, choose the smaller defensible target.

Route only the click-containing target:

- Lexeme is the default for one word and for a multi-segment realization of one verb. Use the contextually correct word-class kind.
- Phraseme is a sufficiently fixed multiword expression: Aphorism for a fixed concise maxim; Collocation for a conventional lexical combination with a restricted or non-obvious component; Proverb for a conventional sentential saying; DiscourseFormula for a conventional interactional formula; Idiom for a fixed expression used here with a non-compositional meaning.
- Construction/Fusion is exactly the clicked fused source segment; take no neighbors.
- PairedFrame: anchor click = all anchors, no fillers; filler click = that Lexeme only.

The input contains markedSentence with the exact click wrapped in <target>...</target>, plus targetable words as { s, i }. Each i is the stable coordinate among all non-whitespace source segments, not an array position; omitted punctuation or unreadable context may leave gaps. clickedIndex equals the marked word's i. Only values present as segments[].i can be target members.

Membership is positional. The click is an implicit member. For Resolved, list every other member in the top-level additionalMemberIndices array; use [] when the click is the only member. Include all and only the source segments realizing the selected unit in this occurrence, including every realized member when the unit is discontinuous. Exclude the clicked index, punctuation, unreadable text, free material, neighboring units, and identical spellings at the wrong position. Preserve increasing array order; do not rewrite the members into lemma, canonical, or grammatical order. For Unresolved, additionalMemberIndices must be null.

Return Unresolved only when the clicked segment has no defensible Family/Kind route. If a standalone route is defensible but a larger fixed group is uncertain, choose the standalone target. For Resolved, target must be non-null. For Unresolved, target must be null.

Before returning, silently verify that the selected target contains the exact clicked segment, contains every and only member required by the policy, and follows the representation-specific membership instruction supplied after this policy.

Return only an object matching the supplied output schema. Do not return a lemma, canonical form, surface form, explanation, or alternative candidate.`;

// biome-ignore lint/correctness/noUnusedVariables: Retained as the v12/v14 comparison prompt.
const newCommonPrompt = `<agent_role>
You are helping a learner of German who has selected one part of a sentence. Classify the selected target in a custom UD-like system, prioritizing the highest-level defensible language unit.
</agent_role>

<classification_model>
The system has 3 Families. Each one has multiple Kinds.
\`\`\`
    {
        Lexeme: { // UD POS
            ADJ,
            ADP,
            ADV,
            AUX,
            CCONJ,
            DET,
            INTJ,
            NOUN,
            NUM,
            PART,
            PRON,
            PROPN,
            PUNCT,
            SCONJ,
            SYM,
            VERB, // Note: under our system, all temporal AUX are counted as being a part of the "VERB". The same goes for governed prepositions and reflexivity.
            X, // Unknown
        },
        Phraseme: {
            Aphorism, // \`Zeit ist Geld.\`
            Collocation, // \`eine Entscheidung treffen\`. Note: Classify a target as a Collocation only if it is a conventional lexical combination and at least one component is selected in a notably restricted or non-obvious way. Do not classify combinations that speakers can construct freely from the ordinary meanings of their components. YES: Maßnahmen ergreifen, Kritik üben, Rücksicht nehmen. NO:  ein Buch lesen, schnell laufen, ein großes Haus kaufen
            DiscourseFormula, // \`Guten Tag!\`
            Idiom, // \`Was wollte er gerade sagen? „Entschuldigung, ich habe **den Faden verloren**.“\` . Note: only idiomatic uses qualify as an Idiom. Literal uses are classified as Lexemes.
            Proverb, // \`Morgenstund hat Gold im Mund.\`
        },
        Construction: {
            Fusion, // "zum" (zu + dem)
            PairedFrame, // "entweder ... oder"
        },
    };
\`\`\`
</classification_model>

<input_format>
The input is one JSON object:

\`\`\`
{
    markedSentence: string, // Natural source text with the exact clicked segment wrapped once in <target>...</target>.
    segments: { s: string, i: number }[], // Only targetable words. i is a stable non-whitespace source coordinate, not the array position, so values may have gaps.
    clickedIndex: number, // Equals the marked segment's i.
}
\`\`\`

Read markedSentence for meaning and the authoritative click. Use segments only as membership candidates, copying their i values into the output. Punctuation and unreadable context may clarify the sentence but are absent from segments and can never be target members.
</input_format>

<output_format>
Return exactly one JSON object in one of these forms:

\`\`\`
{
    decision: "Resolved",
    target: {
        family: "Lexeme" | "Phraseme" | "Construction",
        kind: string, // A Kind belonging to the selected Family in classification_model.
    },
    additionalMemberIndices: number[], // Every target member except clickedIndex, in increasing source order. Use [] when the click is the only member. Example: clickedIndex 1 in ["Sie", "hört", "mit", "dem", "Rauchen", "auf", "."] => [2, 5] for governed "mit" and separable "auf"; exclude the free argument "dem Rauchen".
} 

or

{
    decision: "Unresolved", // no Family/Kind classification is defensible
    target: null,
    additionalMemberIndices: null,
}
\`\`\`

</output_format>

<classification_rules>
We have 3 big-picture policies, that distigiush us from the vanilla UD:

1) Prefer the biggest defensible win for the learner.
Example: In "Guten Morgen, Mutter!", clicking "Guten" selects "Guten" and "Morgen" as Phraseme/DiscourseFormula — not "Guten" alone. Clicking "Mutter" still selects only "Mutter" as Lexeme/NOUN.

2) Fixed material belongs together; free material stays separate.
Examples: 
- In "Sie trifft eine Entscheidung", "trifft eine Entscheidung" is a conventional Collocation and belongs together. In "Sie liest ein Buch", the combination is freely formed: clicking "liest" selects only the VERB, while clicking "Buch" selects only the NOUN.
- In "Sie wartet auf den Bus", "auf" is governed by "wartet", so clicking either "wartet" or "auf" selects "wartet + auf" as one Lexeme/VERB; "den Bus" remains free.
- In "Sie wartet auf dem Bahnsteig", "auf dem Bahnsteig" is a freely added location, so clicking "wartet" selects only the VERB, while clicking "auf" selects only Lexeme/ADP.

3) Idiomatic use belongs together; literal use stays separate.
Examples: 
- In "Nach der Frage verlor sie den Faden", "verlor den Faden" is a Phraseme/Idiom. 
- In "Beim Nähen verlor sie den Faden", the thread is literal, so clicking "Faden" selects only Lexeme/NOUN.
</classification_rules>

`;
const iterationOnePrompt = `<agent_role>
Classify the exact German source segment marked <target>...</target>. Select the complete learner-facing language unit that contains that marked segment, then return its high-level Family/Kind route and membership. Do not perform lemma resolution, canonicalization, or grammatical drill-down.
</agent_role>

<input_format>
Input is exactly:

{
  markedSentence: string,
  segments: { s: string, i: number }[],
  clickedIndex: number
}

markedSentence is the natural source text. Exactly one source segment is wrapped in <target>...</target>; that marker is authoritative.

segments is the complete list of targetable words in source order. s is surface text. i is an opaque source occurrence ID, not an array position. Punctuation and unreadable source material are omitted from segments, so i values may have gaps. clickedIndex equals the marked word's i.
</input_format>

<classification_model>
Choose exactly one reachable route:

- Lexeme: ADJ | ADP | ADV | AUX | CCONJ | DET | INTJ | NOUN | NUM | PART | PRON | PROPN | SCONJ | SYM | VERB
- Phraseme: Aphorism | Collocation | DiscourseFormula | Idiom | Proverb
- Construction: Fusion | PairedFrame
</classification_model>

<decision_procedure>
1. Start at the marked <target>. Reject every candidate unit that does not contain that exact occurrence.
2. Decide which source words are fixed members of the marked occurrence. Fixed material belongs together; free material stays separate.
3. Choose the largest defensible fixed unit containing the mark. Mere syntax, proximity, or familiar co-occurrence does not make material fixed. When a larger unit is doubtful, choose the defensible smaller unit.
4. Route that unit. Lexeme is the default for one word and for all realized pieces of one inflected verb. Phraseme requires an established expression. Fusion is one fused source word. PairedFrame contains only its correlated anchors.
5. Copy membership IDs only from segments[].i. The marked word is implicit: never include clickedIndex. additionalMemberIndices contains every other fixed member's i in increasing source order. Use [] for a singleton.
6. Silently verify: the route contains the marked occurrence; every output index exists in segments; clickedIndex is absent; no free word, punctuation, unreadable text, duplicate, or neighboring unit is included.
</decision_procedure>

<fixedness_policy>
Treat these as one Lexeme/VERB when they realize one verb: separable pieces; lexical verb plus perfect, future, or passive auxiliaries; verb plus a lexically governed preposition; inherently reflexive verb plus its required reflexive pronoun. A governed preposition joins the verb, but its nominal argument remains free.

Keep these separate: meaning-bearing modal AUX plus infinitive; copula AUX plus predicate; optional or contextual reflexive objects; ordinary arguments, objects, complements, adjuncts, modifiers, fillers, and inserted words.

An established non-compositional occurrence is Phraseme/Idiom; the same wording used literally is separate. A Collocation must be a conventional lexical combination with a restricted or non-obvious component, not a freely composed phrase. A PairedFrame includes only fixed anchors; a marked filler is its own Lexeme. A marked fused source word is Construction/Fusion unless it is a fixed member of a larger established unit.
</fixedness_policy>

<output_format>
Return exactly one object:

Resolved:
{
  decision: "Resolved",
  target: { family: "Lexeme" | "Phraseme" | "Construction", kind: string },
  additionalMemberIndices: number[]
}

Unresolved, only when no Family/Kind route is defensible for the marked word:
{
  decision: "Unresolved",
  target: null,
  additionalMemberIndices: null
}

Return no explanation, lemma, surface form, or alternatives.
</output_format>`;

const iterationTwoPrompt = `${iterationOnePrompt}

<hard_boundary_checks>
Apply these occurrence-level checks before returning:

- Collocation: when a conventional support-verb combination is defensible, include every fixed realized lexical and function-word member, including a fixed determiner. Every click on one of those fixed members selects the same Collocation. Do not downgrade a fixed-member click to its standalone POS.
- Fusion: a single source word that contracts a preposition with an article is Construction/Fusion, not Lexeme/ADP. It remains a one-word target, so additionalMemberIndices is [].
- PairedFrame: first identify only the lexical correlating anchors. An anchor click selects all anchors. Any marked filler between, around, or after the anchors is its standalone Lexeme and must not select or join the frame.
- Idiom: include fixed function words such as articles when they are part of the established wording. Exclude freely inserted descriptive modifiers. A click on a fixed function word selects the whole Idiom; a click on an inserted modifier selects only that modifier.
- Repeated spelling: resolve the exact marked occurrence. A marked preposition that introduces a nominal phrase is standalone Lexeme/ADP even if an identical later particle completes a separable verb. Never merge two occurrences merely because their surface strings match.

Final click-consistency check: if the marked word is a fixed member, return the same whole unit that any other fixed-member click would return. If it is free material, return its standalone route even when a larger unit is visible nearby.
</hard_boundary_checks>`;

// biome-ignore lint/correctness/noUnusedVariables: Retained as the iteration-4 comparison prompt.
const iterationFourPrompt = `${iterationTwoPrompt}

<remaining_contrasts>
- Collocation has a high threshold. A light/support verb with a determiner and noun is not automatically a Collocation, even if the wording is conventional. Select Phraseme/Collocation only when the lexical choice is notably restricted or non-obvious in this occurrence; otherwise each marked word is its standalone Lexeme. Follow the positive and negative demonstrations as the threshold anchors.
- In a proportional PairedFrame, the anchors are the closed-class correlating operators. Comparative adjectives and their phrases carry the freely supplied payload: never include them as anchors. When an operator is marked, include only the operators. When a comparative payload word is marked, return only that Lexeme.
- For repeated forms, assign a role to each occurrence before membership. A preposition with its own nominal phrase is not a separable particle. The same earlier preposition stays excluded when the marked finite verb or its later particle selects the separable VERB.
</remaining_contrasts>`;

// biome-ignore lint/correctness/noUnusedVariables: Retained as the v15 iteration-5 comparison prompt.
const iterationFivePrompt = `${iterationTwoPrompt}

<final_error_checks>
- Collocation: a lexically restricted action/result combination may include its support verb, fixed determiner, and noun. A freely predictable speech-act/content object selected by a general placement, production, or communication verb remains compositional: each marked word is a standalone Lexeme. Do not generalize Collocation from the syntactic pattern alone.
- PairedFrame: output only the small closed-class correlating operators. Degree adjectives, comparative forms, predicates, and other payload words are fillers even when the construction requires a slot there. If such payload is marked, stop and return its standalone Lexeme. Before returning a PairedFrame, remove every proposed member that carries the comparison's lexical content rather than the correlation itself.
- Repeated forms: membership follows occurrence role, never spelling. When the marked finite verb or final separable particle is selected, exclude every earlier same-spelled preposition that introduces a nominal phrase. When that earlier preposition is marked, return ADP only.
</final_error_checks>`;

const noCollocationPrompt = `<agent_role>
Classify the exact German source segment marked <target>...</target>. Select the complete learner-facing language unit containing that occurrence, then return its high-level Family/Kind route and membership. Do not perform lemma resolution, canonicalization, or grammatical drill-down.
</agent_role>

<input_format>
Input is exactly:
{
  markedSentence: string,
  segments: { s: string, i: number }[],
  clickedIndex: number
}

markedSentence is the natural source text. Its one <target>...</target> span is authoritative. segments is the complete list of targetable words in source order. s is surface text. i is an opaque occurrence ID, not an array position. Omitted punctuation or unreadable context may leave gaps. clickedIndex equals the marked word's i.
</input_format>

<classification_model>
Choose exactly one reachable route:

- Lexeme: ADJ | ADP | ADV | AUX | CCONJ | DET | INTJ | NOUN | NUM | PART | PRON | PROPN | SCONJ | SYM | VERB
- Phraseme: Aphorism | DiscourseFormula | Idiom | Proverb
- Construction: Fusion | PairedFrame
</classification_model>

<decision_procedure>
1. Start at the marked occurrence. Reject every unit that does not contain it.
2. Decide which words are fixed members of that occurrence. Fixed material belongs together; free material stays separate.
3. Choose the largest available fixed unit containing the mark. Mere syntax, proximity, conventionality, or frequent co-occurrence is insufficient. Ordinary compositional combinations, including conventional verb–noun combinations, have no larger route here: classify the marked word as its standalone Lexeme.
4. Route the chosen unit. Lexeme is the default for one word and for all realized pieces of one inflected verb. Phraseme requires one of the four available established-expression routes. Fusion is one fused source word. PairedFrame contains only its correlating operators.
5. Copy membership only from segments[].i. The marked word is implicit: never include clickedIndex. additionalMemberIndices contains every other fixed member's i in increasing source order. Use [] for a singleton.
6. Verify silently: the route contains the exact marked occurrence; every output ID exists in segments; clickedIndex is absent; no free word, punctuation, unreadable text, duplicate, or neighboring unit is included.
</decision_procedure>

<verbal_units>
Treat these as one Lexeme/VERB when they realize one verb: separable pieces; lexical verb plus perfect, future, or passive auxiliaries; verb plus a lexically governed preposition; inherently reflexive verb plus its required reflexive pronoun.

Keep these separate: meaning-bearing modal AUX plus infinitive; copula AUX plus predicate; optional or contextual reflexive objects; ordinary arguments, objects, complements, adjuncts, modifiers, and inserted words.

For a possible governed preposition, first ask whether this verb lexically selects that exact preposition in this meaning. If yes, verb and preposition are one Lexeme/VERB. A click on either fixed member selects the same verb target. Include the other member's i only; the marked member is already implicit. Exclude the preposition's determiner, noun phrase, and every other argument word. If the prepositional phrase merely adds place, time, manner, instrument, or another circumstance, keep verb and preposition separate.
</verbal_units>

<paired_frames>
PairedFrame anchors are the small closed-class correlating operators. Fillers are the open-class words and phrases carrying the construction's lexical content. An anchor click selects every anchor and no filler. A filler click returns only that filler as its standalone Lexeme, even when the construction requires a slot there.

Comparative adjectives, degree words, predicates, noun phrases, and all other content-bearing payload stay outside PairedFrame membership. Before returning PairedFrame, remove every proposed member that supplies lexical content rather than correlation. If the marked occurrence is payload, do not return the nearby frame.
</paired_frames>

<other_fixedness>
An established non-compositional occurrence is Phraseme/Idiom; the same wording used literally is separate. Include fixed function words inside an Idiom, but exclude freely inserted modifiers. A marked fused source word is Construction/Fusion unless it belongs to a larger available fixed unit. Membership follows occurrence role, never spelling: a preposition introducing its own nominal phrase is not a separable particle merely because an identical form occurs later.
</other_fixedness>

<output_format>
Return exactly one object.

Resolved:
{
  decision: "Resolved",
  target: { family: "Lexeme" | "Phraseme" | "Construction", kind: string },
  additionalMemberIndices: number[]
}

Unresolved, only when no Family/Kind route is defensible for the marked word:
{
  decision: "Unresolved",
  target: null,
  additionalMemberIndices: null
}

Final mechanical check: if additionalMemberIndices contains clickedIndex, delete it. Return no explanation, lemma, surface form, or alternatives.
</output_format>`;

const commonPrompt = noCollocationPrompt;

const adaptiveIterationOnePrompt = `${noCollocationPrompt}

<boundary_repairs>
- A fused contraction such as zum, zur, am, or beim is a singleton Construction/Fusion. Its internal article is not a separate segment, and neighboring words never become members merely because they form a familiar phrase.
- Decide membership before considering the marked word's standalone POS. When the mark is a fixed article or preposition inside an Idiom, select the same complete Idiom as for any other fixed member. When it is an inserted modifier, select that modifier alone.
- Free payload stays singleton even beside a fixed unit: comparative words around a PairedFrame, adverbs around a perfect or separable verb, and a preposition governing its own noun phrase are not members of the nearby unit.
- Assign each repeated surface form its occurrence-level role. A preposition with a nominal complement stays ADP; only the objectless particle occurrence joins its separable verb.
</boundary_repairs>`;

const adaptiveIterationTwoPrompt = `${adaptiveIterationOnePrompt}

<membership_decision_order>
Resolve these boundaries before collecting indices:

1. PairedFrame: classify the marked word itself as operator or payload. Operators are closed-class correlators; comparative, degree, predicate, and other open-class words are payload. If the mark is payload, stop with its singleton Lexeme. Do not collect nearby operators around a payload click.
2. Repeated adposition/particle: assign each occurrence by its right-hand complement. An occurrence that introduces a determiner or noun phrase is an ADP: on that click return the ADP alone, and on a verb click exclude it. Only an objectless occurrence can be the separable particle. Never include both same-spelled occurrences in the verb. Decide required reflexivity independently: retain a required reflexive pronoun; do not replace it with a nearby preposition.
3. Idiom: reconstruct the established wording, then exclude ordinary dependents. A fixed article or preposition click selects the whole Idiom, just like its content-word click. A dative participant, possessor, intensifier, or descriptive modifier stays out unless that exact word is lexicalized in the established expression. All fixed-member clicks must produce identical membership.
</membership_decision_order>`;

const adaptiveIterationThreeDemonstrationCaseIds = Object.freeze(
	demonstrationSelection.ids.map((caseId) => {
		switch (caseId) {
			case "target-de-demo-paired-einerseits-click-einerseits":
				return "target-de-demo-paired-einerseits-click-lokal";
			case "target-de-demo-repeated-anfangen-click-final-an":
				return "target-de-demo-repeated-anfangen-click-first-an";
			case "target-de-demo-idiom-katze-click-verdammte":
				return "target-de-demo-idiom-katze-click-aus";
			default:
				return caseId;
		}
	}),
);

const adaptiveIterationFourPrompt = `${adaptiveIterationTwoPrompt}

<reflexive_separable_membership>
Build a separable inherently reflexive verb conjunctively. After excluding every preposition that heads its own nominal phrase, include all remaining realized verb pieces: finite verb, required reflexive pronoun, and objectless separable particle. None of these three replaces another. A click on the verb, required pronoun, or particle must produce the same complete membership. If the pronoun is merely an optional object, keep it separate as usual.
</reflexive_separable_membership>`;

const adaptiveIterationFourDemonstrationCaseIds = Object.freeze([
	...adaptiveIterationThreeDemonstrationCaseIds.map((caseId) => {
		switch (caseId) {
			case "target-de-demo-idiom-katze-click-aus":
				return "target-de-demo-idiom-katze-click-verdammte";
			case "target-de-demo-idiom-kragen-click-kragen":
				return "target-de-demo-idiom-kragen-click-der";
			default:
				return caseId;
		}
	}),
	"target-de-diagnostic-idiom-oel-click-ins",
]);

const adaptiveIterationFivePrompt = productionPromptPart;

const adaptiveIterationFiveDemonstrationCaseIds = Object.freeze(
	adaptiveIterationFourDemonstrationCaseIds.map((caseId) => {
		switch (caseId) {
			case "target-de-demo-idiom-katze-click-verdammte":
				return "target-de-demo-idiom-katze-click-dem";
			case "target-de-demo-question-stattfinden-click-statt":
				return "target-de-diagnostic-repeated-click-final-an";
			default:
				return caseId;
		}
	}),
);

type RunProfileConfiguration = Readonly<{
	pool: RunnerPoolId;
	prompt: string;
	demonstrationCaseIds: readonly string[];
}>;

// Each adaptive slot is independently addressable from the CLI. Later sessions
// may change one entry without swapping the active prompt or losing prior identity.
const RUN_PROFILE_CONFIGURATIONS: Readonly<
	Record<RunProfileId, RunProfileConfiguration>
> = Object.freeze({
	"frozen-94": Object.freeze({
		pool: "development",
		prompt: adaptiveIterationFivePrompt,
		demonstrationCaseIds: adaptiveIterationFiveDemonstrationCaseIds,
	}),
	"adaptive-1": Object.freeze({
		pool: "adaptive",
		prompt: adaptiveIterationOnePrompt,
		demonstrationCaseIds: demonstrationSelection.ids,
	}),
	"adaptive-2": Object.freeze({
		pool: "adaptive",
		prompt: adaptiveIterationTwoPrompt,
		demonstrationCaseIds: demonstrationSelection.ids,
	}),
	"adaptive-3": Object.freeze({
		pool: "adaptive",
		prompt: adaptiveIterationTwoPrompt,
		demonstrationCaseIds: adaptiveIterationThreeDemonstrationCaseIds,
	}),
	"adaptive-4": Object.freeze({
		pool: "adaptive",
		prompt: adaptiveIterationFourPrompt,
		demonstrationCaseIds: adaptiveIterationFourDemonstrationCaseIds,
	}),
	"adaptive-5": Object.freeze({
		pool: "adaptive",
		prompt: adaptiveIterationFivePrompt,
		demonstrationCaseIds: adaptiveIterationFiveDemonstrationCaseIds,
	}),
	diagnostic: Object.freeze({
		pool: "diagnostic",
		prompt: commonPrompt,
		demonstrationCaseIds: demonstrationSelection.ids,
	}),
});

function configurationForProfile(profile: RunProfileId) {
	return RUN_PROFILE_CONFIGURATIONS[profile];
}

function demonstrationsForProfile(profile: RunProfileId) {
	return corpus.select(configurationForProfile(profile).demonstrationCaseIds);
}

const DEMONSTRATION_GUIDANCE: Readonly<Record<string, string>> = Object.freeze({
	"target-de-demo-perfect-arbeiten-click-habe":
		"habe + gearbeitet = one perfect verb. Take both. gestern is extra. VERB.",
	"target-de-demo-perfect-arbeiten-click-gearbeitet":
		"gearbeitet is the lexical part of this perfect. Take habe + gearbeitet as one VERB. Leave gestern out.",
	"target-de-demo-governed-rechnen-click-rechnet":
		"mit is lexically governed by rechnet. The marked verb is implicit; return only mit's i as the additional member. The nominal complement remains free. VERB.",
	"target-de-demo-governed-rechnen-click-mit":
		"mit is required by rechnen. Same verb target: rechnet + mit. No Regen.",
	"target-de-demo-adjunct-rechnen-click-mit":
		"mit dem Taschenrechner tells how the calculation happens; rechnen does not require mit in this sense. The clicked mit is ADP only.",
	"target-de-demo-idiom-faden-click-verlor":
		"She lost the train of thought. Idiom. Take verlor + den + Faden. völlig is extra.",
	"target-de-demo-idiom-faden-click-den":
		"den is a fixed idiom word here. Take verlor + den + Faden. völlig is extra.",
	"target-de-demo-aphorism-zeit-click-ist":
		"Zeit ist Geld is one fixed Aphorism. The clicked middle word still selects every realized member: Zeit + ist + Geld.",
	"target-de-demo-idiom-faden-click-faden":
		"Faden means the train of thought here. Same idiom: verlor + den + Faden.",
	"target-de-demo-literal-faden-click-faden":
		"Sewing thread. Physical thread. No idiom. Faden/NOUN only.",
	"target-de-demo-literal-handtuch-click-warf":
		"Laundry towel goes into the machine. Literal action. No idiom. warf/VERB only.",
	"target-de-demo-literal-gras-click-biss":
		"A rabbit physically bites grass. Familiar idiom-shaped words do not matter. No death meaning, no Idiom. biss/VERB only.",
	"target-de-demo-literal-gras-click-gras":
		"This is physical grass in a feeding scene. No death meaning, no Idiom. Gras/NOUN only.",
	"target-de-demo-idiom-katze-click-die":
		"The idiom members are ließ + die + Katze + aus + dem + Sack. verdammte is inserted inside that sequence but remains free. Never include it.",
	"target-de-demo-idiom-katze-click-verdammte":
		"The click is on the inserted modifier. Return verdammte/ADJ alone. Do not return or include any part of the surrounding idiom.",
	"target-de-demo-idiom-katze-click-katze":
		"Katze is fixed idiom material, but the adjective immediately before it is inserted and free. Take ließ + die + Katze + aus + dem + Sack. Do not take verdammte.",
	"target-de-demo-idiom-katze-click-aus":
		"aus is a fixed preposition inside this idiom, not a standalone ADP here. Take ließ + die + Katze + aus + dem + Sack. Exclude the inserted adjective verdammte.",
	"target-de-demo-idiom-katze-click-dem":
		"dem is the fixed article following fixed aus inside the Idiom. Its click selects ließ + die + Katze + aus + dem + Sack. Exclude the inserted adjective verdammte.",
	"target-de-demo-idiom-kragen-click-kragen":
		"platzte + der + Kragen are fixed. Take those three. ihm and sprichwörtliche are free; leave them out.",
	"target-de-demo-idiom-kragen-click-der":
		"der is a fixed article in platzte + der + Kragen. Its function-word click selects the whole Idiom. ihm and sprichwörtliche are ordinary dependents; leave them out.",
	"target-de-diagnostic-idiom-oel-click-ins":
		"The marked function token is a fixed realized member of the Idiom. Its click selects the complete Idiom, while the inserted descriptive modifier remains outside membership.",
	"target-de-demo-paired-entweder-click-entweder":
		"entweder + oder are the frame. hier and dort fill slots. Take the anchors only.",
	"target-de-demo-paired-entweder-click-hier":
		"hier fills a slot between the anchors. Slot word, not frame member. ADV only.",
	"target-de-demo-paired-entweder-click-oder":
		"oder is the clicked second anchor. Its partner is the earlier entweder, not the following filler dort. Take entweder + oder only.",
	"target-de-demo-paired-entweder-click-dort":
		"dort comes after oder, but it fills a slot; it is not an anchor. Return dort/ADV only. Do not pair it with oder.",
	"target-de-demo-paired-einerseits-click-einerseits":
		"einerseits + andererseits are the two anchors. lokal and digital are adjective fillers. Take the anchors only.",
	"target-de-demo-paired-einerseits-click-lokal":
		"lokal fills the first adjective slot before the comma. It is not an anchor. Return lokal/ADJ only.",
	"target-de-demo-paired-einerseits-click-andererseits":
		"andererseits is the clicked second anchor. Its partner is the earlier einerseits, not adjacent lokal or digital. Take both anchors only.",
	"target-de-demo-paired-einerseits-click-digital":
		"digital fills the adjective slot after the second anchor. It is not an anchor. Return digital/ADJ only.",
	"target-de-demo-paired-sowohl-click-robust":
		"sowohl + als + auch are anchors. robust is a filler click. Take robust/ADJ only.",
	"target-de-demo-inherent-reflexive-click-beeile":
		"beeilen needs a reflexive pronoun. Take beeile + mich. VERB.",
	"target-de-demo-inherent-reflexive-click-mich":
		"mich is required by beeilen. Same verb target: beeile + mich. VERB.",
	"target-de-demo-optional-reflexive-click-kaemmst":
		"kämmen works without dich. The click is on the verb, so take kämmst/VERB only. dich remains a separate pronoun.",
	"target-de-demo-optional-reflexive-click-dich":
		"kämmen works without dich. dich is an object, not part of the verb. PRON only.",
	"target-de-demo-modal-arbeiten-click-kann":
		"kann means ability. It is not tense or voice glue. AUX only.",
	"target-de-demo-modal-arbeiten-click-arbeiten":
		"kann means ability, not verb inflection. The clicked arbeiten is VERB only. Do not include kann.",
	"target-de-demo-passive-briefe-click-werden":
		"werden + verschickt = one passive realization. Whole target is VERB, not AUX. morgen is extra.",
	"target-de-demo-passive-briefe-click-verschickt":
		"verschickt belongs with passive werden. Take both. Free words do not split the verb.",
	"target-de-demo-collocation-kenntnis-click-nahm":
		"The wording is conventional but not idiomatic. Keep ordinary support-verb words separate. nahm/VERB only.",
	"target-de-demo-collocation-kenntnis-click-zur":
		"zur is one fused source token: zu + der. Fusion only. Do not absorb the surrounding wording.",
	"target-de-demo-symbol-percent":
		"% is the clicked symbol. zwölf is a separate number. SYM only.",
	"target-de-core-unresolved-qzxv":
		"The marked string has no defensible German Family/Kind route in this context. Return Unresolved with both nullable fields null.",
	"target-de-route-phraseme-collocation-antrag-click-einen":
		"The marked determiner is a fixed realized member of this strong conventional support-verb combination. Select the whole Collocation, including its verb, determiner, and noun; exclude free context.",
	"target-de-demo-default-interjection-oh":
		"Oh is one reaction word. Not a multiword discourse formula. INTJ only.",
	"target-de-demo-repeated-anfangen-click-faengt":
		"The first an governs the noun phrase der Kreuzung, so it is an ADP. The objectless final an completes fängt. Take fängt + final an only.",
	"target-de-demo-repeated-anfangen-click-final-an":
		"This final an has no governed noun phrase; it completes fängt. Take fängt + final an. The earlier an + der Kreuzung stays out.",
	"target-de-demo-repeated-anfangen-click-first-an":
		"This first an introduces and governs der Kreuzung. It is an ADP, not the objectless final verb particle. Return this an alone.",
	"target-de-diagnostic-repeated-click-final-an":
		"The marked final an is objectless and completes kommt. Take kommt + final an only. Exclude the earlier an because it introduces der Haltestelle.",
	"target-de-demo-question-stattfinden-click-findet":
		"The question mark is only context. findet + statt are the two realized pieces of stattfinden. Take both as Lexeme/VERB.",
	"target-de-demo-question-stattfinden-click-statt":
		"statt completes findet here. Question punctuation does not split the separable verb. Take findet + statt as Lexeme/VERB.",
	"target-de-demo-typo-mitmachen-click-mit":
		"mact is an obvious typo for macht. The objectless final mit still completes that separable verb. Take mact + mit as Lexeme/VERB.",
	"target-de-demo-predicative-cringe-click-cringe":
		"cringe describes the subject after wirkt. It is an indeclinable borrowed property word here: ADJ, not NOUN.",
});

const membershipInstructions: Readonly<Record<RepresentationId, string>> = {
	"additional-compact-indices":
		"For Resolved, the semantic target contains the click implicitly. additionalMemberIndices lists every other member by its segments[].i value in strictly increasing source order. i is an opaque occurrence ID, not an array position. Use [] when the click is the only member. Never include clickedIndex or a value absent from segments[].i. For Unresolved, use additionalMemberIndices: null.",
};

export type PreparedRepresentationCase = Readonly<{
	caseId: string;
	canonicalInput: (typeof evaluationSelection.cases)[number]["input"];
	canonicalIdealOutput: (typeof evaluationSelection.cases)[number]["idealOutput"];
	privateInput: z.output<typeof classificationInputSchema>;
	privateIdealOutput: unknown;
}>;

export function systemPromptForRepresentation(
	id: RepresentationId,
	profile: RunProfileId = "frozen-94",
): string {
	const outputSchema = outputSchemaForRepresentation(id);
	const profileConfiguration = configurationForProfile(profile);
	// The final regression profile is a byte-identical freeze of the selected
	// adaptive artifact, including its prompt-source identity.
	const promptSourceProfile =
		profile === "frozen-94" ? "adaptive-5" : profile;
	const profileDemonstrations = demonstrationsForProfile(profile);
	const demonstrations = defineLocalDemonstrations({
		inputSchema: classificationInputSchema,
		outputSchema,
		cases: profileDemonstrations.ids.map((caseId, index) => {
			const goldenCase = profileDemonstrations.cases[index];
			if (goldenCase === undefined) {
				throw new Error(`Demonstration ${caseId} is missing.`);
			}
			const explanation = DEMONSTRATION_GUIDANCE[caseId];
			if (explanation === undefined) {
				throw new Error(
					`Demonstration ${caseId} has no prompt guidance.`,
				);
			}
			return {
				...materializeRepresentation(id, goldenCase),
				explanation,
				...(goldenCase.contaminationKeys === undefined
					? {}
					: { contaminationKeys: goldenCase.contaminationKeys }),
			};
		}),
	});
	return assembleSystemPrompt(
		definePromptSource({
			route: `prototype/target-classification/de/high-level/${id}/${promptSourceProfile}`,
			inputSchema: classificationInputSchema,
			outputSchema,
			body: `${profileConfiguration.prompt}\n\n${membershipInstructions[id]}`,
			demonstrations,
		}),
	);
}

export function prepareRepresentationCases(
	id: RepresentationId,
	pool: RunnerPoolId = "development",
): readonly PreparedRepresentationCase[] {
	const selection = selectionForRunnerPool(pool);
	return selection.ids.map((caseId, index) => {
		const goldenCase = selection.cases[index];
		if (goldenCase === undefined) {
			throw new Error(`Frozen case ${caseId} is missing.`);
		}
		const materialized = materializeRepresentation(id, goldenCase);
		return Object.freeze({
			caseId,
			canonicalInput: goldenCase.input,
			canonicalIdealOutput: goldenCase.idealOutput,
			privateInput: classificationInputSchema.parse(materialized.input),
			privateIdealOutput: outputSchemaForRepresentation(id).parse(
				materialized.idealOutput,
			),
		});
	});
}

export type ArmBinding = Readonly<{
	id: RepresentationId;
	promptSha256: string;
	schemaSha256: string;
	adapterSha256: string;
	postconditionFixturesSha256: string;
}>;

export type PrototypePreflight = Readonly<{
	runnerParameters: RunnerParameters;
	runnerVersion: string;
	question: string;
	model: string;
	expectedResolvedModel: string;
	modelConfigSha256: string;
	corpusSha256: string;
	evaluatorBinding: Readonly<{
		version: string;
		sourceSha256: string;
		semanticFixtureMatrixVersion: string;
		semanticFixtureMatrixSha256: string;
	}>;
	decisionPolicy:
		| typeof DECISION_POLICY
		| typeof ADAPTIVE_ITERATION_POLICY
		| typeof DIAGNOSTIC_DECISION_POLICY;
	decisionPolicySha256: string;
	batchPolicy: typeof BATCH_CACHE_POLICY;
	batchPolicySha256: string;
	directResponsesPolicy: typeof DIRECT_RESPONSES_POLICY;
	directResponsesPolicySha256: string;
	evaluationCaseIds: readonly string[];
	demonstrationCaseIds: readonly string[];
	promptUtf8Bytes: number;
	attemptsPerArm: number;
	exactCallCap: number;
	winnerEligible: boolean;
	inputTokenUpperBound: number;
	outputTokenUpperBound: number;
	maximumEstimatedCostUsd: number;
	maximumSpendUsd: number;
	priceSchedule: PrototypePriceSchedule;
	arms: readonly ArmBinding[];
}>;

export function preparePrototypePreflight(
	parameters: RunnerParameterInput,
): PrototypePreflight {
	const runnerParameters = runnerParametersSchema.parse(parameters);
	const evaluationCases = selectionForRunnerPool(runnerParameters.pool);
	const profileConfiguration = configurationForProfile(
		runnerParameters.profile,
	);
	const profileDemonstrations = demonstrationsForProfile(
		runnerParameters.profile,
	);
	assertCaseSelectionsUncontaminated({
		route: corpus.route,
		demonstrations: profileDemonstrations,
		evaluation: evaluationCases,
	});
	const exactCallCap =
		evaluationCases.ids.length *
		ATTEMPTS_PER_ARM *
		REPRESENTATION_IDS.length;
	const decisionPolicy =
		runnerParameters.pool === "development"
			? DECISION_POLICY
			: runnerParameters.pool === "adaptive"
				? ADAPTIVE_ITERATION_POLICY
				: DIAGNOSTIC_DECISION_POLICY;
	const priceSchedule = runnerParameters.batching
		? BATCH_PRICE_SCHEDULE
		: DIRECT_PRICE_SCHEDULE;
	assertFrozenSuite();
	const selected = profileDemonstrations.union(evaluationCases);
	const privateStimuliByArm = new Map<RepresentationId, Set<string>>();
	const armBindings = REPRESENTATION_IDS.map((id) => {
		const privateStimuli = new Set<string>();
		const adapterProof = selected.ids.map((caseId, index) => {
			const goldenCase = selected.cases[index];
			if (goldenCase === undefined)
				throw new Error(`Missing case ${caseId}.`);
			const materialized = materializeRepresentation(id, goldenCase);
			const privateInput = classificationInputSchema.parse(
				materialized.input,
			);
			const privateOutput = outputSchemaForRepresentation(id).parse(
				materialized.idealOutput,
			);
			const fingerprint = stableJson(privateInput);
			if (privateStimuli.has(fingerprint)) {
				throw new Error(`${id} collapses selected case ${caseId}.`);
			}
			privateStimuli.add(fingerprint);
			const roundTrip = parseAndCanonicalizeRepresentation({
				id,
				canonicalInput: goldenCase.input,
				privateInput,
				output: privateOutput,
			});
			if (stableJson(roundTrip) !== stableJson(goldenCase.idealOutput)) {
				throw new Error(`${id} fails ideal round-trip for ${caseId}.`);
			}
			return { caseId, privateInput, privateOutput, roundTrip };
		});
		privateStimuliByArm.set(id, privateStimuli);
		return Object.freeze({
			id,
			promptSha256: sha256(
				systemPromptForRepresentation(id, runnerParameters.profile),
			),
			schemaSha256: sha256(
				stableJson({
					input: z.toJSONSchema(classificationInputSchema),
					output: z.toJSONSchema(outputSchemaForRepresentation(id)),
				}),
			),
			adapterSha256: sha256(stableJson(adapterProof)),
			postconditionFixturesSha256: sha256(
				stableJson(proveAdapterPostconditions(id)),
			),
		});
	});

	for (const caseId of selected.ids) {
		const canonical = corpus.cases[caseId];
		if (canonical === undefined) throw new Error(`Missing case ${caseId}.`);
		const expected = stableJson(
			projectClassificationInput(canonical.input).input,
		);
		for (const id of REPRESENTATION_IDS) {
			const actual = stableJson(
				materializeRepresentation(id, canonical).input,
			);
			if (actual !== expected) {
				throw new Error(
					`${id} does not share the classification stimulus for ${caseId}.`,
				);
			}
		}
	}

	let inputTokenUpperBound = 0;
	let maximumEstimatedCostUsd = 0;
	for (const id of REPRESENTATION_IDS) {
		const systemPrompt = systemPromptForRepresentation(
			id,
			runnerParameters.profile,
		);
		for (const testCase of prepareRepresentationCases(
			id,
			runnerParameters.pool,
		)) {
			const requestInput = stableJson([
				{ role: "system", content: systemPrompt },
				{ role: "user", content: stableJson(testCase.privateInput) },
			]);
			const requestInputUpperBound =
				Buffer.byteLength(requestInput, "utf8") + 64;
			inputTokenUpperBound += requestInputUpperBound * ATTEMPTS_PER_ARM;
			const price =
				requestInputUpperBound >
				priceSchedule.longContextThresholdTokens
					? priceSchedule.longContext
					: priceSchedule.shortContext;
			maximumEstimatedCostUsd +=
				ATTEMPTS_PER_ARM *
				((requestInputUpperBound / 1_000_000) *
					Math.max(
						price.inputUsdPerMillion,
						price.cacheWriteUsdPerMillion,
					) +
					(MAX_OUTPUT_TOKENS / 1_000_000) *
						price.outputUsdPerMillion);
		}
	}
	const outputTokenUpperBound = exactCallCap * MAX_OUTPUT_TOKENS;
	if (maximumEstimatedCostUsd > MAXIMUM_SPEND_USD) {
		throw new Error(
			`Conservative cost ceiling $${maximumEstimatedCostUsd.toFixed(2)} exceeds $${MAXIMUM_SPEND_USD.toFixed(2)}.`,
		);
	}
	return Object.freeze({
		runnerParameters: Object.freeze({ ...runnerParameters }),
		runnerVersion: RUNNER_VERSION,
		question: PROTOTYPE_QUESTION,
		model: RUN_MODEL,
		expectedResolvedModel: EXPECTED_RESOLVED_MODEL,
		modelConfigSha256: sha256(
			stableJson({
				model: RUN_MODEL,
				expectedResolvedModel: EXPECTED_RESOLVED_MODEL,
				reasoningEffort: REASONING_EFFORT,
				textVerbosity: TEXT_VERBOSITY,
				maxOutputTokens: MAX_OUTPUT_TOKENS,
				retries: 0,
				store: false,
				runnerParameters,
				batchPolicy: BATCH_CACHE_POLICY,
				directResponsesPolicy: DIRECT_RESPONSES_POLICY,
			}),
		),
		corpusSha256: sha256(
			stableJson({
				route: corpus.route,
				ids: selected.ids,
				cases: selected.cases,
			}),
		),
		evaluatorBinding: Object.freeze({
			version: GERMAN_HIGH_LEVEL_TARGET_EVALUATOR_VERSION,
			sourceSha256: sha256(
				stableJson({
					targetClassification:
						evaluateGermanHighLevelTargetClassification.toString(),
					clickInvariance:
						evaluateGermanHighLevelClickInvariance.toString(),
				}),
			),
			semanticFixtureMatrixVersion:
				EVALUATOR_SEMANTIC_FIXTURE_MATRIX_VERSION,
			semanticFixtureMatrixSha256: sha256(
				stableJson(proveEvaluatorSemanticDependencies()),
			),
		}),
		decisionPolicy,
		decisionPolicySha256: sha256(stableJson(decisionPolicy)),
		batchPolicy: BATCH_CACHE_POLICY,
		batchPolicySha256: sha256(stableJson(BATCH_CACHE_POLICY)),
		directResponsesPolicy: DIRECT_RESPONSES_POLICY,
		directResponsesPolicySha256: sha256(
			stableJson(DIRECT_RESPONSES_POLICY),
		),
		evaluationCaseIds: Object.freeze([...evaluationCases.ids]),
		demonstrationCaseIds: Object.freeze([...profileDemonstrations.ids]),
		promptUtf8Bytes: Buffer.byteLength(profileConfiguration.prompt, "utf8"),
		attemptsPerArm: ATTEMPTS_PER_ARM,
		exactCallCap,
		winnerEligible: runnerParameters.pool === "development",
		inputTokenUpperBound,
		outputTokenUpperBound,
		maximumEstimatedCostUsd,
		maximumSpendUsd: MAXIMUM_SPEND_USD,
		priceSchedule,
		arms: Object.freeze(armBindings),
	});
}

function selectionForRunnerPool(pool: RunnerPoolId) {
	if (pool === "development") return evaluationSelection;
	if (pool === "adaptive") return adaptiveDevelopmentSelection;
	return diagnosticSelection;
}

export const SLICE_IDS = [
	"routes",
	"boundaries",
	"robustness",
	"adaptiveDevelopment",
] as const;
export type SliceId = (typeof SLICE_IDS)[number];

export function sliceForCase(caseId: string): SliceId {
	for (const id of SLICE_IDS) {
		if (corpus.collections[id].has(caseId)) return id;
	}
	throw new Error(`Case ${caseId} is outside the named canonical slices.`);
}

export type ArmEvidenceSummary = Readonly<{
	id: RepresentationId;
	attemptCount: number;
	contractScore: number;
	attemptContractScores: readonly number[];
	executionErrorCount: number;
	unclassifiedMissCount: number;
	safetyGatePass: boolean;
	clickGatePass: boolean;
	sliceRatios: Readonly<Record<SliceId, number>>;
}>;

export type PrototypeVerdict =
	| Readonly<{ decision: "Winner"; winner: RepresentationId }>
	| Readonly<{ decision: "Tie"; arms: readonly RepresentationId[] }>
	| Readonly<{ decision: "NoWinner"; reasons: readonly string[] }>;

export type AdaptiveIterationEvidence = Readonly<{
	profile: Extract<RunProfileId, `adaptive-${number}`>;
	attemptContractScores: readonly [number, number];
	evaluationCasesPerAttempt: number;
	executionErrorCount: number;
	unclassifiedMissCount: number;
	safetyGatePass: boolean;
	clickGatePass: boolean;
	demonstrationCount: number;
	promptUtf8Bytes: number;
}>;

export function rankAdaptiveIterations(
	candidates: readonly AdaptiveIterationEvidence[],
): readonly AdaptiveIterationEvidence[] {
	const eligible = candidates.filter(
		(candidate) =>
			candidate.evaluationCasesPerAttempt === 30 &&
			candidate.executionErrorCount === 0 &&
			candidate.unclassifiedMissCount === 0 &&
			candidate.safetyGatePass &&
			candidate.clickGatePass,
	);
	const thresholdCandidates = eligible.filter((candidate) =>
		candidate.attemptContractScores.every(
			(score) =>
				score / candidate.evaluationCasesPerAttempt >=
				ADAPTIVE_ITERATION_POLICY.parsimonyThresholdPerReplicate,
		),
	);
	const ranked = [
		...(thresholdCandidates.length > 0 ? thresholdCandidates : eligible),
	].toSorted((left, right) => {
		if (thresholdCandidates.length > 0) {
			const demonstrationDifference =
				left.demonstrationCount - right.demonstrationCount;
			if (demonstrationDifference !== 0) return demonstrationDifference;
			const byteDifference = left.promptUtf8Bytes - right.promptUtf8Bytes;
			if (byteDifference !== 0) return byteDifference;
		}
		const worstDifference =
			Math.min(...right.attemptContractScores) -
			Math.min(...left.attemptContractScores);
		if (worstDifference !== 0) return worstDifference;
		const aggregateDifference =
			right.attemptContractScores[0] +
			right.attemptContractScores[1] -
			(left.attemptContractScores[0] + left.attemptContractScores[1]);
		if (aggregateDifference !== 0) return aggregateDifference;
		if (thresholdCandidates.length === 0) {
			const demonstrationDifference =
				left.demonstrationCount - right.demonstrationCount;
			if (demonstrationDifference !== 0) return demonstrationDifference;
			const byteDifference = left.promptUtf8Bytes - right.promptUtf8Bytes;
			if (byteDifference !== 0) return byteDifference;
		}
		return left.profile.localeCompare(right.profile);
	});
	return Object.freeze(ranked);
}

export function decidePrototypeWinner(
	summaries: readonly ArmEvidenceSummary[],
): PrototypeVerdict {
	const eligible = summaries.filter(
		(summary) =>
			summary.attemptCount === EXPECTED_CALLS_PER_ARM &&
			summary.executionErrorCount === 0 &&
			summary.unclassifiedMissCount === 0 &&
			summary.safetyGatePass &&
			summary.clickGatePass &&
			summary.attemptContractScores.length === ATTEMPTS_PER_ARM &&
			summary.attemptContractScores.every(
				(score) => score >= MINIMUM_ATTEMPT_CONTRACT_SCORE,
			),
	);
	if (eligible.length === 0) {
		return Object.freeze({
			decision: "NoWinner",
			reasons: Object.freeze([
				"No arm passed the frozen call-count, error, classification, safety, click, and per-attempt 90/94 score gates.",
			]),
		});
	}
	const ranked = eligible.toSorted(
		(a, b) =>
			b.contractScore / b.attemptCount - a.contractScore / a.attemptCount,
	);
	const best = ranked[0];
	if (best === undefined) throw new Error("Eligible arm ranking is empty.");
	const bestRatio = best.contractScore / best.attemptCount;
	const tied = ranked.filter(
		(summary) =>
			bestRatio - summary.contractScore / summary.attemptCount <=
			TIE_MARGIN,
	);
	if (tied.length > 1) {
		return Object.freeze({
			decision: "Tie",
			arms: Object.freeze(tied.map(({ id }) => id)),
		});
	}
	return Object.freeze({ decision: "Winner", winner: best.id });
}

function assertFrozenSuite(): void {
	if (evaluationSelection.ids.length !== EXPECTED_EVALUATION_CASES) {
		throw new Error(
			`Issue #85 keeps ${EXPECTED_EVALUATION_CASES} development cases for historical comparison; found ${evaluationSelection.ids.length}.`,
		);
	}
	if (
		demonstrationSelection.ids.length === 0 ||
		demonstrationSelection.ids.length > 35
	) {
		throw new Error(
			"The development prompt requires between one and thirty-five demonstrations.",
		);
	}
	if (EXACT_CALL_CAP !== 188) {
		throw new Error("Issue #85 exact call cap must remain 188.");
	}
	if (adaptiveDevelopmentSelection.ids.length !== 30) {
		throw new Error(
			`Adaptive prompt development requires exactly 30 cases; found ${adaptiveDevelopmentSelection.ids.length}.`,
		);
	}
}

function sha256(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}
