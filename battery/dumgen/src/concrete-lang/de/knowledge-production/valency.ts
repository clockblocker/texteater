import type * as Dumling from "dumling/types";
import { allowedComplementKinds } from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type { DumgenOptions } from "../../../types.js";
import { DumgenFailure } from "../../../universal/failure.js";
import { executeGeneration } from "../../../universal/model.js";
import { effectiveConfiguration } from "../../../universal/model-configuration.js";
import { type OperationScope, recordEvent } from "../../../universal/trace.js";
import {
	governablePrepositionForms,
	governedCaseFor,
	isGovernablePreposition,
} from "../governable-prepositions.js";
import { projectKnowledge, type ValencySlotDraft } from "./project.js";

type ComplementKind = Dumrel.ValencyComplement["kind"];
const stage = "produceKnowledge";

/** The frame criteria of ADR 0034, with the examples #599 decides. */
function valencyFramePrompt(kinds: readonly ComplementKind[]): string {
	return [
		"Propose the Valency Frame of the fixed German Reading marked by <TARGET>: the governed complements a learner must memorize to use this word in the sense its emojiDescription names, as the E-VALBU valency dictionary lists them for one Lesart.",
		kinds.includes("Case")
			? "List every governed complement, the subject included, in E-VALBU order, subject first. The subject is a slot even when nothing else is (wohnen: a Required Nom only)."
			: "This word's frame holds only the prepositions it governs, in any sentence where it has this sense (Angst vor + Dat, Interesse an + Dat); it has no subject slot, and a bare-case attribute is not valency.",
		"Status belongs to the word, not to this sentence. Optional: the word keeps this sense when the complement is dropped, even if this sentence realizes it (Ich warte. Er ist stolz. aus Angst). Required: dropping it is ungrammatical or changes the sense. warten has a Required Nom and an Optional auf + Acc; sich gewöhnen has a Required Nom and a Required an + Acc.",
		"Fixed parts are never slots: a separable prefix, a lexical reflexive (no slot for sich in sich gewöhnen an), an expletive es, and a Phraseme's own wording (in jemandem auf den Keks gehen, auf den Keks is wording while the Nom and the Dat are slots).",
		"Governed complements only: never a free adjunct of time, place, manner or cause (im Regen in Er wartet im Regen), a free dative (dir in Ich backe dir einen Kuchen), or a preposition the speaker chooses freely (wohnen in/bei/auf).",
		"A Preposition complement names the preposition and the case it assigns in this construction: warten auf + Acc, bestehen auf + Dat, sich bedanken bei + Dat and für + Acc.",
		"Referent: Someone for a person, Something for a thing, event or proposition, Either when both are usual (warten auf jemanden/etwas).",
		"The sentence only anchors the sense. The frame belongs to the Reading: include complements this sentence leaves out and nothing only this sentence adds.",
		"Return {valency:[...]} with the slots in order, or {valency:[]} when the Reading governs nothing.",
	].join(" ");
}

function frameOutputSchema(kinds: readonly ComplementKind[]) {
	const referent = {
		type: "string",
		enum: ["Someone", "Something", "Either"],
	};
	const complements: Record<ComplementKind, Record<string, unknown>> = {
		Case: {
			type: "object",
			properties: {
				kind: { type: "string", enum: ["Case"] },
				case: { type: "string", enum: ["Nom", "Acc", "Dat", "Gen"] },
				referent,
			},
			required: ["kind", "case", "referent"],
			additionalProperties: false,
		},
		Preposition: {
			type: "object",
			properties: {
				kind: { type: "string", enum: ["Preposition"] },
				preposition: {
					type: "string",
					enum: governablePrepositionForms,
				},
				case: { type: "string", enum: ["Acc", "Dat", "Gen"] },
				referent,
			},
			required: ["kind", "preposition", "case", "referent"],
			additionalProperties: false,
		},
	};
	return {
		type: "object",
		properties: {
			valency: {
				type: "array",
				items: {
					type: "object",
					properties: {
						status: {
							type: "string",
							enum: ["Required", "Optional"],
						},
						complement: {
							anyOf: kinds.map((kind) => complements[kind]),
						},
					},
					required: ["status", "complement"],
					additionalProperties: false,
				},
			},
		},
		required: ["valency"],
		additionalProperties: false,
	};
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	!!value && typeof value === "object" && !Array.isArray(value);

/**
 * The valid part of a proposed frame, checked Slot by Slot through Dumrel:
 * a Slot it rejects (`für` + Dat, a bare case on a noun, a repeated
 * complement) is dropped and its siblings are kept.
 */
function validFrame(
	reading: Dumling.Reading,
	slots: readonly unknown[],
): { kept: ValencySlotDraft[]; dropped: { slot: unknown; reason: string }[] } {
	const kept: ValencySlotDraft[] = [],
		dropped: { slot: unknown; reason: string }[] = [];
	for (const slot of slots) {
		try {
			if (!isRecord(slot) || !isRecord(slot.complement))
				throw new DumgenFailure(
					"InvalidModelOutput",
					stage,
					"Expected a Slot with a complement",
				);
			const draft = slot as ValencySlotDraft;
			projectKnowledge(
				reading,
				{ valency: null },
				{ valency: [...kept, draft] },
			);
			kept.push(draft);
		} catch (error) {
			if (!(error instanceof DumgenFailure)) throw error;
			dropped.push({ slot, reason: error.message });
		}
	}
	return { kept, dropped };
}

/**
 * The Knowledge call's proposal of a new Reading's whole Valency Frame (ADR
 * 0034). It runs once per Reading, when its Knowledge has no frame yet.
 */
export function proposeValencyFrame(
	options: DumgenOptions,
	scope: OperationScope,
	state: { reading: Dumling.Reading; markedContext: string },
	route: string,
): Effect.Effect<ValencySlotDraft[], DumgenFailure> {
	const kinds = allowedComplementKinds(state.reading.lemma);
	return Effect.map(
		executeGeneration(
			options,
			scope,
			{
				stage,
				route,
				input: { ...state, aspect: "valency" },
				configuration: effectiveConfiguration(options, route),
				systemPrompt: valencyFramePrompt(kinds),
				outputSchema: frameOutputSchema(kinds),
			},
			(output) => {
				if (
					!isRecord(output) ||
					Object.keys(output).length !== 1 ||
					!Array.isArray(output.valency)
				)
					throw new DumgenFailure(
						"InvalidModelOutput",
						stage,
						"Expected only a valency list",
						route,
					);
				return output.valency as unknown[];
			},
			[],
		),
		({ output }) => {
			const { kept, dropped } = validFrame(state.reading, output);
			if (dropped.length)
				recordEvent(scope, "DroppedValencySlots", { dropped });
			return kept;
		},
	);
}

/**
 * The frame proposal followed by the governed prepositions this sentence
 * attests that the proposal lacks. A sentence shows neither whether the word
 * needs the preposition nor what fills it, so each attested Slot is Optional
 * with an Either referent. Dumrel's Contribute keeps a stored frame's Slots and
 * statuses and appends only what it lacks.
 */
export function valencyChanges(
	reading: Dumling.Reading,
	proposed: readonly ValencySlotDraft[],
	attested: readonly { preposition: string; case: Dumrel.GovernedCase }[],
	route: string,
): Dumrel.KnowledgeChange[] {
	const key = (preposition: string, governedCase: string) =>
		`${preposition}/${governedCase}`;
	const covered = new Set(
		proposed.flatMap(({ complement }) =>
			complement.kind === "Preposition"
				? [key(complement.preposition, complement.case)]
				: [],
		),
	);
	if (
		attested.length &&
		!allowedComplementKinds(reading.lemma).includes("Preposition")
	)
		throw new DumgenFailure(
			"InvalidInput",
			stage,
			"This route takes no governed preposition",
			route,
		);
	const drafts = new Map<string, ValencySlotDraft>();
	for (const { preposition, case: governedCase } of attested) {
		if (!isGovernablePreposition(preposition))
			throw new DumgenFailure(
				"InvalidInput",
				stage,
				`${preposition} is not a governable preposition`,
				route,
			);
		const complement = {
			kind: "Preposition",
			preposition,
			case: governedCaseFor(preposition, governedCase),
			referent: "Either",
		} as const;
		const slot = key(complement.preposition, complement.case);
		if (!covered.has(slot))
			drafts.set(slot, { status: "Optional", complement });
	}
	return [proposed, [...drafts.values()]].flatMap(
		(frame) =>
			projectKnowledge(reading, { valency: null }, { valency: frame })
				.changes,
	);
}
