/**
 * The Valency Frame of a Reading (Sys ADR 0034): Luna proposes the
 * Satzbauplan of the one Lesart the Emoji Description names, in the Slot
 * shape of #674, holding only the complement kinds the route allows
 * (`allowedComplementKinds`). Dumrel checks it Slot by Slot: a Slot it
 * refuses, such as a Place on a German noun, is dropped and named in a
 * `DroppedValencySlots` event, and its siblings stay (#675).
 *
 * The occurrence's `valencyEvidence` joins the frame only when the
 * occurrence created the Reading (`origin` New, #677): each governed
 * preposition no complement of any Slot covers, alternatives included,
 * comes in as an Optional Slot. A later occurrence's government changes
 * nothing; a preposition no governor selects stays an attributable
 * failure.
 */

import { germanAdpositionAllows } from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import { allowedComplementKinds, applyKnowledgeChange } from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type {
	GermanKnowledgeChange,
	KnowledgeFailure,
	KnowledgeOrigin,
} from "../types.js";
import {
	type AspectContext,
	type AspectError,
	checkedChanges,
	unusable,
	write,
} from "./context.js";
import { shared, valency } from "./prompts.js";

/**
 * The German prepositions a governor can select, the list LegacyDumgen
 * reviewed (#616); a proposal or an attestation of any other is no frame
 * complement.
 */
export const governablePrepositions = [
	"an",
	"auf",
	"aus",
	"bei",
	"für",
	"gegen",
	"in",
	"mit",
	"nach",
	"über",
	"um",
	"unter",
	"von",
	"vor",
	"zu",
	"zwischen",
] as const;

const governable = new Set<string>(governablePrepositions);

export const valencyPrompt = [
	shared.reading,
	shared.evidence,
	valency.task,
	valency.subject,
	valency.lesart,
	valency.status,
	valency.alternatives,
	valency.freeMarker,
	valency.preposition,
	valency.route,
	valency.fixed,
	valency.referent,
	valency.shapes,
	valency.output,
].join("\n");

type ComplementKind = Dumrel.GermanValencyComplement["kind"];

/** A German Valency Slot: its status and its German complements. */
export type GermanSlot = {
	readonly status: Dumrel.ValencySlotStatus;
	readonly complements: readonly Dumrel.GermanValencyComplement[];
};

const referent = { type: "string", enum: ["Someone", "Something", "Either"] };
const complementSchemas: Readonly<
	Record<ComplementKind, Readonly<Record<string, unknown>>>
> = {
	Case: {
		type: "object",
		properties: {
			kind: { type: "string", enum: ["Case"] },
			governedCase: {
				type: "string",
				enum: ["Nom", "Acc", "Dat", "Gen"],
			},
			referent,
		},
		required: ["kind", "governedCase", "referent"],
		additionalProperties: false,
	},
	Preposition: {
		type: "object",
		properties: {
			kind: { type: "string", enum: ["Preposition"] },
			preposition: { type: "string", enum: governablePrepositions },
			governedCase: { type: "string", enum: ["Acc", "Dat", "Gen"] },
			referent,
		},
		required: ["kind", "preposition", "governedCase", "referent"],
		additionalProperties: false,
	},
	Adverbial: {
		type: "object",
		properties: {
			kind: { type: "string", enum: ["Adverbial"] },
			standIn: {
				type: "string",
				enum: [
					"Irgendwo",
					"Irgendwohin",
					"Irgendwie",
					"IrgendwieLange",
					"IrgendwieViel",
				],
			},
		},
		required: ["kind", "standIn"],
		additionalProperties: false,
	},
	Predicative: {
		type: "object",
		properties: {
			kind: { type: "string", enum: ["Predicative"] },
			of: { type: "string", enum: ["Subject", "Object"] },
			marker: { type: "string", enum: ["None", "Als", "Für"] },
		},
		required: ["kind", "of", "marker"],
		additionalProperties: false,
	},
	Clause: {
		type: "object",
		properties: {
			kind: { type: "string", enum: ["Clause"] },
			form: {
				type: "string",
				enum: ["ZuInfinitive", "BareInfinitive", "Dass", "Ob", "W"],
			},
			correlate: { type: "string", enum: ["Required", "Optional"] },
		},
		required: ["kind", "form"],
		additionalProperties: false,
	},
};

/** The frame Luna answers under: only the route's complement kinds (#675). */
export function frameSchema(kinds: readonly string[]) {
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
						complements: {
							type: "array",
							minItems: 1,
							items: {
								anyOf: kinds.flatMap((kind) => {
									const schema =
										complementSchemas[
											kind as ComplementKind
										];
									return schema ? [schema] : [];
								}),
							},
						},
					},
					required: ["status", "complements"],
					additionalProperties: false,
				},
			},
		},
		required: ["valency"],
		additionalProperties: false,
	} as const;
}

/** A preposition's ADP Lemma, as Grammatical Resolution writes it in `valencyEvidence`. */
export const prepositionLemma = (
	canonicalForm: string,
): Dumling.Lemma<"de", "Lexeme", "ADP"> =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm,
		coreFeatures: {},
	}) as Dumling.Lemma<"de", "Lexeme", "ADP">;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	value !== null && typeof value === "object" && !Array.isArray(value);

/** A proposed complement in Dumrel's shape: a preposition becomes its ADP Lemma. */
function complementOf(value: unknown): unknown {
	if (!isRecord(value) || value.kind !== "Preposition") return value;
	return {
		...value,
		preposition:
			typeof value.preposition === "string"
				? prepositionLemma(value.preposition.trim().toLowerCase())
				: value.preposition,
	};
}

/** Why Dumgen refuses a Slot before Dumrel sees it, if it does. */
function slotProblem(slot: GermanSlot): string | undefined {
	for (const complement of slot.complements) {
		if (complement.kind !== "Preposition") continue;
		const form = complement.preposition.canonicalForm;
		if (!governable.has(form))
			return `${form} is no preposition a governor selects`;
		if (
			!germanAdpositionAllows(
				{ family: "Lexeme", canonicalForm: form },
				complement.governedCase,
			)
		)
			return `${form} governs no ${complement.governedCase}`;
	}
	return undefined;
}

/**
 * The Slots Dumrel accepts, checked one by one onto the ones kept before
 * them, and the ones it refused with why.
 */
export function validFrame(
	reading: Dumling.Reading<"de">,
	slots: readonly unknown[],
): {
	readonly kept: GermanSlot[];
	readonly dropped: { readonly slot: unknown; readonly reason: string }[];
} {
	const kept: GermanSlot[] = [];
	const dropped: { slot: unknown; reason: string }[] = [];
	for (const slot of slots) {
		const candidate =
			isRecord(slot) && Array.isArray(slot.complements)
				? ({
						...slot,
						complements: slot.complements.map(complementOf),
					} as unknown as GermanSlot)
				: undefined;
		if (!candidate) {
			dropped.push({ slot, reason: "Expected a Slot with complements" });
			continue;
		}
		const problem = slotProblem(candidate);
		if (problem) {
			dropped.push({ slot, reason: problem });
			continue;
		}
		const applied = applyKnowledgeChange({
			source: reading,
			knowledge: {},
			change: {
				kind: "Contribute",
				aspect: "valency",
				value: [...kept, candidate],
			},
		});
		if (applied.success) kept.push(candidate);
		else
			dropped.push({ slot, reason: applied.error.message.slice(0, 200) });
	}
	return { kept, dropped };
}

/** Each Preposition complement of a frame, alternatives included, as `form/case`. */
const coveredPrepositions = (frame: readonly GermanSlot[]) =>
	new Set(
		frame.flatMap((slot) =>
			slot.complements.flatMap((complement) =>
				complement.kind === "Preposition"
					? [
							`${complement.preposition.canonicalForm}/${complement.governedCase}`,
						]
					: [],
			),
		),
	);

/**
 * The Optional Slots the creating occurrence's government adds to a
 * proposed frame, and the evidence Knowledge cannot hold. Only a governed
 * preposition no complement covers comes in, with an Either referent: a
 * sentence shows neither whether the word needs it nor what fills it.
 */
export function attestedSlots(
	lemma: Dumling.Lemma<"de">,
	proposed: readonly GermanSlot[],
	evidence: readonly unknown[],
): {
	readonly slots: GermanSlot[];
	readonly failures: KnowledgeFailure[];
} {
	const covered = coveredPrepositions(proposed);
	const takesPrepositions = (
		allowedComplementKinds(lemma) as readonly string[]
	).includes("Preposition");
	const slots: GermanSlot[] = [];
	const failures: KnowledgeFailure[] = [];
	for (const entry of evidence) {
		const complement = isRecord(entry) ? entry.complement : undefined;
		if (!isRecord(complement) || complement.kind !== "Preposition")
			continue;
		const preposition = complement.preposition as
			| { readonly canonicalForm?: unknown }
			| undefined;
		const form = String(preposition?.canonicalForm ?? "");
		const governedCase = complement.governedCase as Dumrel.GovernedCase;
		const unusableEvidence = (message: string) =>
			failures.push({
				aspect: "valency",
				leaf: form,
				code: "Unresolved",
				message,
			});
		if (!takesPrepositions) {
			unusableEvidence(
				`The occurrence attests ${form} + ${governedCase}, and a ${lemma.family} ${lemma.kind} frame takes no preposition`,
			);
			continue;
		}
		if (!governable.has(form)) {
			unusableEvidence(
				`The occurrence attests ${form} + ${governedCase}, and ${form} is no preposition a governor selects`,
			);
			continue;
		}
		const key = `${form}/${governedCase}`;
		if (covered.has(key)) continue;
		covered.add(key);
		slots.push({
			status: "Optional",
			complements: [
				{
					kind: "Preposition",
					preposition: prepositionLemma(form),
					governedCase,
					referent: "Either",
				},
			],
		} as GermanSlot);
	}
	return { slots, failures };
}

/**
 * The Reading's proposed frame as one Contribute change, the creating
 * occurrence's government appended, or no change when it governs nothing.
 */
export const produceValency = (
	context: AspectContext,
	origin: KnowledgeOrigin,
): Effect.Effect<
	{
		readonly changes: GermanKnowledgeChange[];
		readonly failures: KnowledgeFailure[];
	},
	AspectError
> =>
	Effect.gen(function* () {
		const kinds = allowedComplementKinds(context.lemma);
		const proposed = yield* write(
			context,
			"valency",
			valencyPrompt,
			{ complementKinds: [...kinds] },
			frameSchema(kinds),
			(output) =>
				isRecord(output) && Array.isArray(output.valency)
					? (output.valency as unknown[])
					: unusable("valency", "Luna answered no valency list"),
		);
		const { kept, dropped } = validFrame(context.reading, proposed);
		if (dropped.length > 0)
			context.scope.event({
				name: "DroppedValencySlots",
				data: { dropped },
			});
		const attested =
			origin === "New"
				? attestedSlots(
						context.lemma,
						kept,
						(context.attestation as { valencyEvidence?: unknown[] })
							.valencyEvidence ?? [],
					)
				: { slots: [], failures: [] };
		const frame = [...kept, ...attested.slots];
		if (frame.length === 0)
			return { changes: [], failures: attested.failures };
		const changes = checkedChanges(context, "valency", [
			{ kind: "Contribute", aspect: "valency", value: frame },
		]);
		if (!Array.isArray(changes)) return yield* Effect.fail(changes);
		return { changes, failures: attested.failures };
	});
