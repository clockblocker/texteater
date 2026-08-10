// PROTOTYPE ONLY — deterministic comparison contract for issue #85.

import { createHash } from "node:crypto";

import { z } from "zod";
import { stableJson } from "../../../../lib/stable-json";
import {
	assembleSystemPrompt,
	defineLocalDemonstrations,
	definePromptSource,
} from "../../../assembly";
import { corpus } from "../../canonical-classification-corpus/target-classification/de/high-level-whole-unit/corpus";
import {
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
	compactInputSchema,
	materializeRepresentation,
	outputSchemaForRepresentation,
	parseAndCanonicalizeRepresentation,
	projectCompactInput,
	proveAdapterPostconditions,
	REPRESENTATION_IDS,
	type RepresentationId,
} from "./representations";

export const PROTOTYPE_QUESTION =
	"Does the additional-member compact-indices contract preserve the German high-level target policy across the development suite?";
export const RUNNER_VERSION = "target-classification-high-level-contracts-v10";
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

export const RUNNER_POOL_IDS = ["development", "diagnostic"] as const;
export type RunnerPoolId = (typeof RUNNER_POOL_IDS)[number];
export const runnerParametersSchema = z.strictObject({
	batching: z.boolean(),
	pool: z.enum(RUNNER_POOL_IDS).default("development"),
});
export type RunnerParameters = z.output<typeof runnerParametersSchema>;
export type RunnerParameterInput = Readonly<{
	batching: boolean;
	pool?: RunnerPoolId;
}>;

const commonPrompt = `You are resolving exactly one clicked segment for a German learner. Return the complete high-level language unit that contains the click and its Family/Kind route. This is target selection only: no grammatical drill-down, lemma resolution, or canonical form.

Dumling's big picture:

- An ordinary word is a Lexeme with its contextually correct UD-like word class.
- Dumling can also select established Phraseme and Construction units that bare word-by-word analysis would miss.
- A separable, multi-part, perfect, future, or passive realization of one verb counts here as one inflected Lexeme/VERB.

CLICK FIRST — this constraint is non-negotiable:

1. Compact indices are zero-based. Locate the one segment whose clicked field is true and verify that its compactIndex equals clickedCompactIndex.
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
- Phraseme is a sufficiently fixed multiword expression: Aphorism for a fixed concise maxim; Proverb for a conventional sentential saying; DiscourseFormula for a conventional interactional formula; Idiom for a fixed expression used here with a non-compositional meaning.
- Construction/Fusion is exactly the clicked fused source segment; take no neighbors.
- PairedFrame: anchor click = all anchors, no fillers; filler click = that Lexeme only.

The input is a compact projection of the source:

- each segment states its zero-based compactIndex and whether it is clicked;
- Whitespace was removed; read the remaining sequence as if adjacent items were separated by one space;
- Punctuation and OpaqueText remain as context and occupy compact positions;
- only ResolvableText segments can be target members.

Membership is positional. Include all and only the source segments realizing the selected unit in this occurrence, including every realized member when the unit is discontinuous. Exclude punctuation, OpaqueText, free material, neighboring units, and identical spellings at the wrong position. Preserve increasing compact source order; do not rewrite the members into lemma, canonical, or grammatical order.

Return Unresolved only when the clicked ResolvableText has no defensible Family/Kind route. If a standalone route is defensible but a larger fixed group is uncertain, choose the standalone target. For Resolved, target must be non-null. For Unresolved, target must be null.

Before returning, silently verify that the selected target contains the exact clicked segment, contains every and only member required by the policy, and follows the representation-specific membership instruction supplied after this policy.

Return only an object matching the supplied output schema. Do not return a lemma, canonical form, surface form, explanation, or alternative candidate.`;

const DEMONSTRATION_GUIDANCE: Readonly<Record<string, string>> = Object.freeze({
	"target-de-demo-perfect-arbeiten-click-habe":
		"habe + gearbeitet = one perfect verb. Take both. gestern is extra. VERB.",
	"target-de-demo-perfect-arbeiten-click-gearbeitet":
		"gearbeitet is the lexical part of this perfect. Take habe + gearbeitet as one VERB. Leave gestern out.",
	"target-de-demo-governed-rechnen-click-rechnet":
		"rechnen needs mit. Take rechnet + mit. Regen is the argument; leave it out. VERB.",
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
	"target-de-demo-idiom-kragen-click-kragen":
		"platzte + der + Kragen are fixed. Take those three. ihm and sprichwörtliche are free; leave them out.",
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
	"target-de-demo-default-interjection-oh":
		"Oh is one reaction word. Not a multiword discourse formula. INTJ only.",
	"target-de-demo-repeated-anfangen-click-faengt":
		"The first an governs the noun phrase der Kreuzung, so it is an ADP. The objectless final an completes fängt. Take fängt + final an only.",
	"target-de-demo-repeated-anfangen-click-final-an":
		"This final an has no governed noun phrase; it completes fängt. Take fängt + final an. The earlier an + der Kreuzung stays out.",
	"target-de-demo-repeated-anfangen-click-first-an":
		"This first an introduces and governs der Kreuzung. It is an ADP, not the objectless final verb particle. Return this an alone.",
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
		"For Resolved, the semantic target still contains the click, but membership.additionalMemberCompactIndices encodes every other member compact index except the clicked index in strictly increasing source order; do not repeat the click or another index.",
};

export type PreparedRepresentationCase = Readonly<{
	caseId: string;
	canonicalInput: (typeof evaluationSelection.cases)[number]["input"];
	canonicalIdealOutput: (typeof evaluationSelection.cases)[number]["idealOutput"];
	privateInput: z.output<typeof compactInputSchema>;
	privateIdealOutput: unknown;
}>;

export function systemPromptForRepresentation(id: RepresentationId): string {
	const outputSchema = outputSchemaForRepresentation(id);
	const demonstrations = defineLocalDemonstrations({
		inputSchema: compactInputSchema,
		outputSchema,
		cases: demonstrationSelection.ids.map((caseId, index) => {
			const goldenCase = demonstrationSelection.cases[index];
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
			route: `prototype/target-classification/de/high-level/${id}`,
			inputSchema: compactInputSchema,
			outputSchema,
			body: `${commonPrompt}\n\n${membershipInstructions[id]}`,
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
			privateInput: compactInputSchema.parse(materialized.input),
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
	decisionPolicy: typeof DECISION_POLICY | typeof DIAGNOSTIC_DECISION_POLICY;
	decisionPolicySha256: string;
	batchPolicy: typeof BATCH_CACHE_POLICY;
	batchPolicySha256: string;
	directResponsesPolicy: typeof DIRECT_RESPONSES_POLICY;
	directResponsesPolicySha256: string;
	evaluationCaseIds: readonly string[];
	demonstrationCaseIds: readonly string[];
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
	const exactCallCap =
		evaluationCases.ids.length *
		ATTEMPTS_PER_ARM *
		REPRESENTATION_IDS.length;
	const decisionPolicy =
		runnerParameters.pool === "development"
			? DECISION_POLICY
			: DIAGNOSTIC_DECISION_POLICY;
	const priceSchedule = runnerParameters.batching
		? BATCH_PRICE_SCHEDULE
		: DIRECT_PRICE_SCHEDULE;
	assertFrozenSuite();
	const selected = demonstrationSelection.union(evaluationCases);
	const privateStimuliByArm = new Map<RepresentationId, Set<string>>();
	const armBindings = REPRESENTATION_IDS.map((id) => {
		const privateStimuli = new Set<string>();
		const adapterProof = selected.ids.map((caseId, index) => {
			const goldenCase = selected.cases[index];
			if (goldenCase === undefined)
				throw new Error(`Missing case ${caseId}.`);
			const materialized = materializeRepresentation(id, goldenCase);
			const privateInput = compactInputSchema.parse(materialized.input);
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
			promptSha256: sha256(systemPromptForRepresentation(id)),
			schemaSha256: sha256(
				stableJson({
					input: z.toJSONSchema(compactInputSchema),
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
		const expected = stableJson(projectCompactInput(canonical.input).input);
		for (const id of REPRESENTATION_IDS) {
			const actual = stableJson(
				materializeRepresentation(id, canonical).input,
			);
			if (actual !== expected) {
				throw new Error(
					`${id} does not share the compact stimulus for ${caseId}.`,
				);
			}
		}
	}

	let inputTokenUpperBound = 0;
	let maximumEstimatedCostUsd = 0;
	for (const id of REPRESENTATION_IDS) {
		const systemPrompt = systemPromptForRepresentation(id);
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
		demonstrationCaseIds: Object.freeze([...demonstrationSelection.ids]),
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
	return pool === "development" ? evaluationSelection : diagnosticSelection;
}

export type SliceId = "routes" | "boundaries" | "robustness";

export function sliceForCase(caseId: string): SliceId {
	for (const id of ["routes", "boundaries", "robustness"] as const) {
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
}

function sha256(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}
