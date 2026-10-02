/**
 * Drafts a Dumling Attestation for an expected target by running Grammatical
 * Resolution on it: its Family, Kind and members, never a classifier's
 * answer (ADR 0037). Shared by the drafting scripts of the stages whose gold
 * lacks Attestations. Paid: it calls the live generation and judgment models.
 */
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import type { ModelConfiguration } from "promptsmith/evaluation";
import { createOpenAIExecutor } from "promptsmith/openai";
import { createTypeSafeExecutor } from "promptsmith/typesafe";
import type { DumgenOptions, Segment } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { effectiveConfiguration } from "../src/universal/model-configuration.js";
import { judgmentConfiguration } from "../src/universal/trace.js";
import { validateEncounter } from "../src/universal/validation.js";

export type AttestationDraft =
	| { attestation: Dumling.Attestation }
	| { failure: string };

/** The target Grammatical Resolution drafts, as an Analysis Target. */
export type ExpectedTarget = {
	family: string;
	kind: string;
	memberSegmentIndices: readonly number[];
};

/** A failure no retry fixes: the provider wants payment. */
export const unpaid = (draft: AttestationDraft) =>
	"failure" in draft && /\b402\b/u.test(draft.failure);

export function createAttestationDrafter(settings: {
	attempts: number;
	judgmentTimeoutMs: number;
}) {
	const execute = createOpenAIExecutor();
	const judge = createTypeSafeExecutor();
	const options: DumgenOptions = {
		execute: (request) =>
			execute({
				...request,
				configuration: request.configuration as ModelConfiguration,
			}),
		judge: (request, callOptions) => judge(request, callOptions),
		judgmentConfiguration: { timeoutMs: settings.judgmentTimeoutMs },
	};
	const dumgen = createDumgen(options);

	/** Drafts the target, retrying up to `attempts` times unless unpaid. */
	async function draft(
		sentenceId: string,
		segments: readonly Segment[],
		target: ExpectedTarget,
	): Promise<AttestationDraft> {
		let failure = "not attempted";
		for (let attempt = 0; attempt < settings.attempts; attempt++) {
			try {
				const encounter = validateEncounter({
					sentence: { id: sentenceId, language: "de", segments },
					target,
				});
				const result = await Effect.runPromise(
					Effect.either(
						dumgen.resolveGrammar({
							...encounter,
							contextAvailable: false,
						}),
					),
				);
				if (result._tag === "Left") {
					failure = `${result.left._tag}: ${result.left.message}`;
					if (unpaid({ failure })) break;
					continue;
				}
				if ("decision" in result.right) {
					failure = `Decision ${result.right.decision}`;
					continue;
				}
				const parsed = parseUnit(result.right);
				if (
					!parsed.success ||
					parsed.chain.unitKind !== "Attestation"
				) {
					failure = "The Attestation fails strict parseUnit";
					continue;
				}
				return {
					attestation: parsed.chain.value as Dumling.Attestation,
				};
			} catch (error) {
				failure =
					error instanceof Error ? error.message : String(error);
			}
		}
		return { failure };
	}

	return {
		draft,
		/** The effective model settings, recorded beside the drafts. */
		configuration: {
			generation: effectiveConfiguration(options),
			judgment: judgmentConfiguration(options),
		},
	};
}
