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
export const RUNNER_VERSION = "target-classification-high-level-contracts-v8";
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
export const MAXIMUM_SPEND_USD = 5;
export const MINIMUM_CONTRACT_RATIO = 0.8;
export const MINIMUM_SLICE_RATIO = 0.8;
export const TIE_MARGIN = 0.01;
export const DECISION_POLICY = Object.freeze({
	expectedCallsPerArm: EXPECTED_CALLS_PER_ARM,
	minimumContractRatio: MINIMUM_CONTRACT_RATIO,
	minimumSliceRatio: MINIMUM_SLICE_RATIO,
	tieMargin: TIE_MARGIN,
	tieRule: "inclusive-best-ratio-margin" as const,
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
export const PRICE_SCHEDULE = Object.freeze({
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

const commonPrompt = `You are resolving exactly one clicked segment for a German learner. Return the complete high-level language unit that contains the click and its Family/Kind route. This is the big-picture selection pass, not grammatical drill-down, lemma resolution, or canonicalization.

CLICK FIRST — this constraint is non-negotiable:

1. Compact indices are zero-based. Locate the one segment whose clicked field is true and verify that its compactIndex equals clickedCompactIndex.
2. Consider only targets containing that exact segment. Discard every target that does not contain it, even if it is the most salient expression in the surrounding context.
3. If the click is on a free word inside, between, or beside the members of another unit, return the clicked word as its own Lexeme. Do not return the nearby unit.

The central linguistic policy is: fixed parts go together; free parts stay apart.

For this high-level pass, parts belong together for three distinct reasons:

- LEXICAL FIXEDNESS: group the realized fixed members of an established Phraseme or Construction.
- LEXICAL VALENCY: group a verb with its lexically governed preposition, but not with the preposition's free nominal argument; group an inherently reflexive verb with its required reflexive pronoun.
- GRAMMATICAL COMPOSITION: group separable and other multi-segment realizations of one verb. Also group the grammatical auxiliary or auxiliaries of perfect, future, and passive forms with the lexical verb. At this level, such a verbal complex is the temporal or voice realization of one lemma and routes as Lexeme/VERB.

Mind that wording associated with an idiom is not necessarily idiomatic in the supplied occurrence. Route Phraseme/Idiom only when the complete context supports the idiomatic, non-compositional reading. When the same wording is used compositionally and literally, do not classify it as an Idiom. This warning concerns idiom recognition; it does not override the valency or grammatical-composition rules above.

Read the complete supplied context before deciding; it may contain more than one sentence. Choose the largest defensible fixed unit containing the click, but do not absorb a phrase or clause merely because its words are syntactically related. If a larger unit is doubtful, choose the smaller defensible target.

Keep free material separate, including arguments, objects, complements, adjuncts, modifiers, fillers, and freely inserted words. Keep an optional or contextual reflexive pronoun separate from its verb. Keep a meaning-bearing modal AUX separate from its governed VERB. Keep a copula AUX separate from its predicate unless the occurrence belongs to an established fixed expression.

Conventionality or restricted lexical choice alone does not make a high-level multi-segment target. For an ordinary non-idiomatic collocation or support-verb combination such as eine Entscheidung treffen or eine Frage stellen, classify only the clicked word as its Lexeme. Phraseme/Collocation is not reachable under this policy.

Route only the click-containing target:

- Lexeme is the default for an individual word and for a multi-segment realization of one verb. Use the contextually correct German word-class kind.
- A standalone symbol such as %, €, or another non-word symbol is Lexeme/SYM. A neighboring quantity remains a separate Lexeme/NUM.
- Phraseme is a sufficiently fixed multiword expression: Aphorism for a fixed concise maxim; Proverb for a conventional sentential saying; DiscourseFormula for a conventional interactional formula; Idiom for a fixed expression used here with a non-compositional meaning.
- Construction/Fusion is exactly one source segment that fuses grammatical words, for example zum = zu + dem, unless it participates in a larger fixed target. Route that segment as Construction/Fusion, not Lexeme/ADP.
- Construction/PairedFrame contains only its fixed correlated anchors. A freely supplied filler is not a member; if the filler is clicked, return it as its own Lexeme.

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
		"The clicked auxiliary belongs to habe ... gearbeitet; both fixed verb-form members form one Lexeme/VERB while gestern stays free.",
	"target-de-demo-perfect-arbeiten-click-gearbeitet":
		"Changing the click to gearbeitet selects the same complete perfect Lexeme/VERB as clicking habe.",
	"target-de-demo-perfect-arbeiten-click-gestern":
		"The click is on the free temporal adverb gestern, so return only Lexeme/ADV rather than the neighboring perfect verb form.",
	"target-de-demo-governed-rechnen-click-rechnet":
		"The clicked verb and its lexically governed preposition mit form one Lexeme/VERB; the argument starkem Regen stays free.",
	"target-de-demo-governed-rechnen-click-mit":
		"Clicking the governed preposition selects the same rechnet mit Lexeme/VERB as clicking the verb.",
	"target-de-demo-governed-rechnen-click-regen":
		"The click is on the free nominal argument Regen, so return only Lexeme/NOUN rather than rechnet mit.",
	"target-de-demo-idiom-faden-click-verlor":
		"The occurrence is figurative; clicking verlor selects the fixed verb, determiner, and noun of the Phraseme/Idiom, excluding völlig.",
	"target-de-demo-idiom-faden-click-faden":
		"Clicking Faden in the same figurative occurrence selects exactly the same fixed Idiom members as clicking verlor.",
	"target-de-demo-idiom-faden-click-voellig":
		"The click is on the freely inserted modifier völlig, so return only Lexeme/ADV rather than the surrounding Idiom.",
	"target-de-demo-literal-faden-click-faden":
		"The sewing context makes the wording literal; the clicked Faden is only Lexeme/NOUN despite matching words from a familiar idiom.",
	"target-de-demo-literal-handtuch-click-warf":
		"The washing context makes warf das Handtuch literal; familiarity with the idiom das Handtuch werfen does not override occurrence meaning, so the clicked warf is only Lexeme/VERB.",
	"target-de-demo-paired-entweder-click-entweder":
		"Clicking either fixed anchor selects both anchors of Construction/PairedFrame and excludes the free fillers.",
	"target-de-demo-paired-entweder-click-oder":
		"Clicking the other anchor selects the same two-member PairedFrame.",
	"target-de-demo-paired-je-click-laenger":
		"In je ... desto, the clicked comparative länger is a freely supplied filler, so return only Lexeme/ADJ rather than either PairedFrame anchor.",
	"target-de-demo-optional-reflexive-click-kaemmst":
		"In dich kämmen, the pronoun is contextual rather than lexically required; the clicked verb is its own Lexeme/VERB.",
	"target-de-demo-optional-reflexive-click-dich":
		"Changing the click to the optional reflexive object selects only Lexeme/PRON; it does not join kämmst.",
	"target-de-demo-modal-arbeiten-click-kann":
		"The meaning-bearing modal kann is the clicked target and remains a standalone Lexeme/AUX.",
	"target-de-demo-modal-arbeiten-click-arbeiten":
		"Clicking the governed arbeiten selects only Lexeme/VERB; the modal kann is a separate target.",
	"target-de-demo-fusion-zum":
		"The single clicked source segment zum fuses zu and dem, so route it as Construction/Fusion rather than Lexeme/ADP.",
	"target-de-demo-symbol-percent":
		"The clicked percent sign is a standalone Lexeme/SYM; the neighboring quantity zwölf is not part of its membership.",
	"target-de-demo-repeated-anfangen-click-final-an":
		"The clicked final an is the separable particle of fängt ... an; include fängt and this final an, but exclude the earlier identical free preposition an.",
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
): readonly PreparedRepresentationCase[] {
	return evaluationSelection.ids.map((caseId, index) => {
		const goldenCase = evaluationSelection.cases[index];
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
	decisionPolicy: typeof DECISION_POLICY;
	decisionPolicySha256: string;
	batchPolicy: typeof BATCH_CACHE_POLICY;
	batchPolicySha256: string;
	evaluationCaseIds: readonly string[];
	demonstrationCaseIds: readonly string[];
	attemptsPerArm: number;
	exactCallCap: number;
	inputTokenUpperBound: number;
	outputTokenUpperBound: number;
	maximumEstimatedCostUsd: number;
	maximumSpendUsd: number;
	priceSchedule: typeof PRICE_SCHEDULE;
	arms: readonly ArmBinding[];
}>;

export function preparePrototypePreflight(): PrototypePreflight {
	assertFrozenSuite();
	const selected = demonstrationSelection.union(evaluationSelection);
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
		for (const testCase of prepareRepresentationCases(id)) {
			const requestInput = stableJson([
				{ role: "system", content: systemPrompt },
				{ role: "user", content: stableJson(testCase.privateInput) },
			]);
			const requestInputUpperBound =
				Buffer.byteLength(requestInput, "utf8") + 64;
			inputTokenUpperBound += requestInputUpperBound * ATTEMPTS_PER_ARM;
			const price =
				requestInputUpperBound >
				PRICE_SCHEDULE.longContextThresholdTokens
					? PRICE_SCHEDULE.longContext
					: PRICE_SCHEDULE.shortContext;
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
	const outputTokenUpperBound = EXACT_CALL_CAP * MAX_OUTPUT_TOKENS;
	if (maximumEstimatedCostUsd > MAXIMUM_SPEND_USD) {
		throw new Error(
			`Conservative cost ceiling $${maximumEstimatedCostUsd.toFixed(2)} exceeds $${MAXIMUM_SPEND_USD.toFixed(2)}.`,
		);
	}
	return Object.freeze({
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
				batchPolicy: BATCH_CACHE_POLICY,
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
		decisionPolicy: DECISION_POLICY,
		decisionPolicySha256: sha256(stableJson(DECISION_POLICY)),
		batchPolicy: BATCH_CACHE_POLICY,
		batchPolicySha256: sha256(stableJson(BATCH_CACHE_POLICY)),
		evaluationCaseIds: Object.freeze([...evaluationSelection.ids]),
		demonstrationCaseIds: Object.freeze([...demonstrationSelection.ids]),
		attemptsPerArm: ATTEMPTS_PER_ARM,
		exactCallCap: EXACT_CALL_CAP,
		inputTokenUpperBound,
		outputTokenUpperBound,
		maximumEstimatedCostUsd,
		maximumSpendUsd: MAXIMUM_SPEND_USD,
		priceSchedule: PRICE_SCHEDULE,
		arms: Object.freeze(armBindings),
	});
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
			summary.contractScore / summary.attemptCount >=
				MINIMUM_CONTRACT_RATIO &&
			Object.values(summary.sliceRatios).every(
				(ratio) => ratio >= MINIMUM_SLICE_RATIO,
			),
	);
	if (eligible.length === 0) {
		return Object.freeze({
			decision: "NoWinner",
			reasons: Object.freeze([
				"No arm passed the frozen call-count, error, classification, safety, click, overall-score, and per-slice gates.",
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
	if (demonstrationSelection.ids.length !== 21) {
		throw new Error("Issue #85 is frozen to twenty-one demonstrations.");
	}
	if (EXACT_CALL_CAP !== 188) {
		throw new Error("Issue #85 exact call cap must remain 188.");
	}
}

function sha256(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}
