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
	"Which private compact membership representation most reliably preserves the frozen German high-level target contract under identical evidence and evaluation?";
export const RUNNER_VERSION = "target-classification-high-level-contracts-v4";
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
export const PRICE_SCHEDULE = Object.freeze({
	id: "openai-standard-2026-08-09",
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

const commonPrompt = `We are helping a German learner select the complete high-level language unit represented by one clicked segment. This is the big-picture classification pass: identify the whole learner-facing unit and its route. Do not perform a later grammatical drill-down, lemma resolution, or canonicalization.

The central policy is: fixed parts go together; free parts stay apart.

Read the complete sentence before deciding. The same spelling may be fixed in one occurrence and free in another. Choose the largest defensible fixed unit containing the click, but never absorb a whole phrase or clause merely because its words are syntactically related. When the fixedness of a borderline expression is doubtful, prefer the smaller separate target.

Group all realized fixed members of:

- established Phrasemes and Constructions;
- separable and other multi-segment realizations of one verb;
- a verb with its lexically governed preposition, excluding the preposition's free nominal argument;
- an inherently reflexive verb with its required reflexive pronoun;
- perfect, future, and passive verb forms: group the grammatical auxiliary or auxiliaries with the lexical verb and route the result as Lexeme/VERB.

Keep free material separate, including arguments, objects, complements, adjuncts, modifiers, and freely inserted words. Keep an optional or contextual reflexive pronoun separate. Keep a meaning-bearing modal AUX separate from its governed verb. Keep a copula AUX separate from its predicate unless the occurrence belongs to a larger established fixed expression.

Route the selected target as follows:

- Lexeme is the default for an individual word and for a multi-segment realization of one verb. Use the contextually correct German word-class kind.
- Phraseme is an established multiword expression: Aphorism for a fixed concise maxim; Proverb for a conventional sentential saying; DiscourseFormula for a conventional interactional formula; Idiom for a fixed expression whose occurrence has a non-compositional meaning; Collocation for another conventional lexical combination.
- Construction/Fusion is one source segment that fuses grammatical words, unless that segment participates in a larger fixed target.
- Construction/PairedFrame contains only the fixed correlated anchors; its freely supplied fillers stay outside the target.

Input uses compact source positions. Whitespace segments have been removed; reconstruct normal spacing by reading the remaining sequence as if adjacent items were separated by one space. Punctuation and OpaqueText remain for context and still occupy compact positions. Only ResolvableText segments can be target members.

Membership means all and only the source segments that realize the selected unit in this occurrence:

- include the clicked compact position;
- include every fixed realized member even when the members are discontinuous;
- exclude punctuation, OpaqueText, and all free context;
- preserve compact source order, using positions rather than spellings to distinguish repetitions;
- do not rewrite members into lemma, canonical, or grammatical order.

Return Unresolved only when the clicked ResolvableText has no defensible Family/Kind route. Do not use Unresolved for uncertainty between a speculative larger group and a defensible smaller target: choose the smaller target. For Resolved, target must be non-null. For Unresolved, target must be null. Return only the strict JSON contract, with no lemma, canonical form, surface form, explanation, or alternative candidates.`;

const DEMONSTRATION_GUIDANCE: Readonly<Record<string, string>> = Object.freeze({
	"target-de-core-guten-morgen-click-guten":
		"Guten Morgen is a conventional interactional formula, so both fixed words form one Phraseme/DiscourseFormula.",
	"target-de-boundary-multi-verb-click-gehen":
		"gehen ... spazieren realizes one discontinuous verb; the intervening adverb is free and excluded.",
	"target-de-core-kakao":
		"Kakao is an ordinary noun here, with no defensible larger fixed unit.",
	"target-de-route-lexeme-x":
		"The sentence identifies the clicked item as a usable other-word Lexeme/X; unfamiliar form alone does not require Unresolved.",
	"target-de-core-unresolved-qzxv":
		"The opaque-looking clicked string has no defensible route in context, so it remains Unresolved without guessed membership.",
	"target-de-demo-default-modal-kann":
		"The modal kann contributes its own meaning and stays a separate Lexeme/AUX from arbeiten.",
	"target-de-demo-default-particle-nicht":
		"The productive negator nicht is a standalone Lexeme/PART, not a fixed member of the verb.",
	"target-de-demo-default-interjection-oh":
		"The interjection Oh is a standalone Lexeme/INTJ and does not absorb the following clause.",
	"target-de-demo-default-copula-ist":
		"The copula ist stays a separate Lexeme/AUX from the freely supplied predicate müde.",
	"target-de-demo-aphorism-zeit-click-ist":
		"Zeit ist Geld is a fixed aphorism; clicking its copula therefore selects all three fixed words.",
	"target-de-demo-paired-entweder-click-oder":
		"Entweder ... oder is a PairedFrame containing only its two fixed anchors; heute and morgen are free fillers.",
	"target-de-demo-idiom-faden-click-den":
		"The context gives den Faden verlieren its figurative meaning, so verb, determiner, and noun form one Phraseme/Idiom.",
	"target-de-demo-literal-faden-click-faden":
		"The sewing context makes Faden literal; the clicked noun stays separate rather than triggering the idiom.",
	"target-de-demo-governed-rechnen-click-mit":
		"In mit Regen rechnen, mit is lexically governed: group it with rechnet but exclude the nominal argument.",
	"target-de-demo-adjunct-rechnen-click-mit":
		"In mit dem Taschenrechner rechnen, mit introduces a free instrumental adjunct and remains its own Lexeme/ADP.",
	"target-de-demo-inherent-reflexive-click-sich":
		"sich beeilen is inherently reflexive, so the required pronoun and verb form one Lexeme/VERB.",
	"target-de-demo-optional-reflexive-click-sich":
		"In sich kämmen, the contextual reflexive object is not a fixed verb member, so the clicked pronoun stays Lexeme/PRON.",
	"target-de-demo-perfect-arbeiten-click-hat":
		"hat ... gearbeitet is one perfect realization of the verb; the temporal adverb is free and excluded.",
	"target-de-demo-passive-brief-click-wird":
		"wird ... verschickt is one passive realization of the verb; the temporal adverb is free and excluded.",
	"target-de-demo-collocation-kenntnis-click-zur":
		"zur Kenntnis nehmen is a conventional collocation: include nahm, zur, and Kenntnis, but exclude the free object and modifier.",
});

const armInstructions: Readonly<Record<RepresentationId, string>> = {
	"full-compact-indices":
		"For Resolved, membership.memberCompactIndices lists every member compact index, including the click.",
	"additional-compact-indices":
		"For Resolved, membership.additionalMemberCompactIndices lists every member compact index except the clicked index in strictly increasing source order; do not repeat the click or another index.",
	"fixed-length-mask":
		"For Resolved, membership.memberMask has exactly one boolean per compact input segment; true marks members and the clicked position must be true.",
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
			body: `${commonPrompt}\n\n${armInstructions[id]}`,
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
			`Issue #85 is frozen to ${EXPECTED_EVALUATION_CASES} held-out cases; found ${evaluationSelection.ids.length}.`,
		);
	}
	if (demonstrationSelection.ids.length !== 20) {
		throw new Error("Issue #85 is frozen to twenty demonstrations.");
	}
	if (EXACT_CALL_CAP !== 564) {
		throw new Error("Issue #85 exact call cap must remain 564.");
	}
}

function sha256(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}
