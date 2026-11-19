/**
 * The Valency Frame of a Reading (Sys ADR 0034): Luna proposes the
 * Satzbauplan of the one Lesart the Emoji Description names, in the Slot
 * shape of #674, holding only the complement kinds the route allows
 * (`allowedComplementKinds`). Luna writes it in German dictionary
 * notation in case letters (`N (A|(es) dass)`, `valency-notation.ts`),
 * one string a strict schema's pattern holds, read back into those Slots.
 * Dumrel checks them Slot by Slot: a Slot it refuses, such as a Place on a
 * German noun, is dropped and named in a `DroppedValencySlots` event, and
 * its siblings stay (#675).
 *
 * The occurrence's `valencyEvidence` joins the frame only when the
 * occurrence created the Reading (`origin` New, #677): each governed
 * preposition no complement of any Slot covers, alternatives included,
 * comes in as an Optional Slot. A later occurrence's government changes
 * nothing; a preposition no governor selects stays an attributable
 * failure.
 *
 * The Reading's 🪞 settles its Reflexive Slot (ADR 0052): a 🪞 Reading's
 * frame has a Required one, right after the subject, as the creating
 * occurrence's reflexive realized it where its evidence names the case,
 * which it does only where the form or the preposition shows it, else as
 * Luna proposed it: sich hides its case; a Reading
 * without 🪞 has no Required one, though an Optional one may stand: a
 * Required sich Luna proposes for it is the ordinary object it stands for
 * (`sich wenden` ↪: an Acc object). A
 * Reflexive inside a fixed phrase names its preposition (`außer sein`:
 * `außer` + Dat).
 */

import { isRecord } from "common-utils";
import {
	germanAdpositionAllows,
	germanGovernablePrepositions,
	reflexiveMarker,
} from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import { allowedComplementKinds, applyKnowledgeChange } from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import type { InvalidModelOutput } from "../../errors.js";
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
import { germanFramePattern, parseGermanFrame } from "./valency-notation.js";
import { examplesParagraph, notationParagraphs } from "./valency-prompts.js";

/**
 * The German prepositions a governor can select (dumcorpus's ADP Case
 * Table); a proposal or an attestation of any other is no frame complement.
 */
const governable = new Set<string>(germanGovernablePrepositions);

export const valencyPrompt = [
	shared.reading,
	shared.evidence,
	valency.task,
	valency.subject,
	valency.reflexive,
	valency.lesart,
	valency.status,
	valency.alternatives,
	valency.freeMarker,
	valency.preposition,
	valency.route,
	valency.fixed,
	...notationParagraphs,
	examplesParagraph,
].join("\n");

/** One entry of an Attestation's `valencyEvidence`, on any route that records it. */
type ValencyEvidence = Extract<
	Dumling.Attestation<"de">,
	{ readonly valencyEvidence: unknown }
>["valencyEvidence"][number];

/** A German Valency Slot: its status and its German complements. */
type GermanSlot = {
	readonly status: Dumrel.ValencySlotStatus;
	readonly complements: readonly Dumrel.GermanValencyComplement[];
};

/**
 * The answer Luna writes under, strict: the frame as one string the
 * notation's pattern holds, so every answer reads back.
 */
const frameAnswer = { type: "string", pattern: germanFramePattern } as const;

/**
 * The Slots Luna's notation reads as, each preposition its Canonical Form,
 * or why it reads as none: under the pattern only a frame the German table
 * refuses (a correlate before a noun phrase, a case its preposition cannot
 * take) fails, as an answer outside the schema did.
 */
function frameOf(output: unknown): readonly unknown[] | InvalidModelOutput {
	if (typeof output !== "string")
		return unusable("valency", "Luna answered no frame");
	const read = parseGermanFrame(output);
	return read.ok
		? read.frame
		: unusable(
				"valency",
				`Luna's frame «${output.slice(0, 120)}» does not read: ${read.error}`,
			);
}

/** A preposition's ADP Lemma, as Grammatical Resolution writes it in `valencyEvidence`. */
const prepositionLemma = (
	canonicalForm: string,
): Dumling.Lemma<"de", "Lexeme", "ADP"> => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {},
});

/**
 * A proposed complement in Dumrel's shape: a preposition becomes its ADP
 * Lemma.
 */
function complementOf(value: unknown): unknown {
	if (
		!isRecord(value) ||
		(value.kind !== "Preposition" && value.kind !== "Reflexive") ||
		typeof value.preposition !== "string"
	)
		return value;
	return { ...value, preposition: prepositionLemma(value.preposition) };
}

/**
 * A Slot as Luna proposed it, each preposition made its ADP Lemma: model
 * output, so nothing about it is known until Dumgen and Dumrel check it.
 */
type ProposedSlot = Readonly<Record<string, unknown>> & {
	readonly complements: readonly unknown[];
};

/** Why Dumgen refuses a Slot before Dumrel sees it, if it does. */
function slotProblem(slot: ProposedSlot): string | undefined {
	for (const complement of slot.complements) {
		if (!isRecord(complement)) continue;
		// A Reflexive's preposition is a fixed phrase's, so any the ADP Case
		// Table lists; a Preposition complement's is one a governor selects.
		const reflexive = complement.kind === "Reflexive";
		if (
			!(complement.kind === "Preposition") &&
			!(reflexive && complement.preposition !== undefined)
		)
			continue;
		const { preposition, governedCase } = complement;
		const form =
			isRecord(preposition) &&
			typeof preposition.canonicalForm === "string"
				? preposition.canonicalForm
				: undefined;
		if (form === undefined || (!reflexive && !governable.has(form)))
			return `${form} is no preposition a governor selects`;
		if (typeof governedCase !== "string")
			return `${form} names no case it governs`;
		if (
			!germanAdpositionAllows(
				{ family: "Lexeme", canonicalForm: form },
				governedCase,
			)
		)
			return `${form} governs no ${governedCase}`;
	}
	return undefined;
}

/**
 * Whether Dumrel accepts `candidate` onto the Slots kept before it, which
 * makes it a German Slot; `refused` hears why it does not.
 */
function acceptedSlot(
	reading: Dumling.Reading<"de">,
	kept: readonly GermanSlot[],
	candidate: ProposedSlot,
	refused: (reason: string) => void,
): candidate is ProposedSlot & GermanSlot {
	const applied = applyKnowledgeChange({
		source: reading,
		knowledge: {},
		change: {
			kind: "Contribute",
			aspect: "valency",
			value: [...kept, candidate],
		},
	});
	if (!applied.success) refused(applied.error.message.slice(0, 200));
	return applied.success;
}

/**
 * The Slots Dumrel accepts, checked one by one onto the ones kept before
 * them, and the ones it refused with why.
 */
function validFrame(
	reading: Dumling.Reading<"de">,
	slots: readonly unknown[],
): {
	readonly kept: GermanSlot[];
	readonly dropped: { readonly slot: unknown; readonly reason: string }[];
} {
	const kept: GermanSlot[] = [];
	const dropped: { slot: unknown; reason: string }[] = [];
	for (const slot of slots) {
		const candidate: ProposedSlot | undefined =
			isRecord(slot) && Array.isArray(slot.complements)
				? { ...slot, complements: slot.complements.map(complementOf) }
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
		if (
			acceptedSlot(reading, kept, candidate, (reason) =>
				dropped.push({ slot, reason }),
			)
		)
			kept.push(candidate);
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
 * preposition no complement covers comes in, Optional: a sentence does not
 * show whether the word needs it.
 */
function attestedSlots(
	lemma: Dumling.Lemma<"de">,
	proposed: readonly GermanSlot[],
	evidence: readonly ValencyEvidence[],
): {
	readonly slots: GermanSlot[];
	readonly failures: KnowledgeFailure[];
} {
	const covered = coveredPrepositions(proposed);
	const takesPrepositions = allowedComplementKinds(lemma).some(
		(kind) => kind === "Preposition",
	);
	const slots: GermanSlot[] = [];
	const failures: KnowledgeFailure[] = [];
	for (const { complement } of evidence) {
		if (complement.kind !== "Preposition") continue;
		const form = complement.preposition.canonicalForm;
		const { governedCase } = complement;
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
				},
			],
		});
	}
	return { slots, failures };
}

/** Whether a Slot holds the frame's Reflexive. */
const isReflexiveSlot = (slot: GermanSlot) =>
	slot.complements.some(({ kind }) => kind === "Reflexive");

type Reflexive = Extract<
	Dumrel.GermanValencyComplement,
	{ readonly kind: "Reflexive" }
>;

/** A Slot's Reflexive, if it has one. */
const reflexiveOf = (complements: readonly { readonly kind: string }[]) =>
	complements.find(
		(complement): complement is Reflexive =>
			complement.kind === "Reflexive",
	);

/**
 * The occurrence's Reflexive where its evidence names the case, which it
 * does only where the form (mich, mir) or a fixed phrase's preposition
 * shows it; after sich, uns or euch it names none (ADR 0052).
 */
function attestedReflexive(
	evidence: readonly ValencyEvidence[],
): Reflexive | undefined {
	for (const { complement } of evidence)
		if (complement.kind === "Reflexive" && "governedCase" in complement)
			return complement;
	return undefined;
}

/**
 * The ordinary object a Required sich becomes on a Reading without 🪞: no
 * lexical reflexive, so the sich is an object another noun phrase could
 * replace, a Case complement in its case (`sich wenden` ↪: A). None for a
 * fixed phrase's reflexive, or where the frame already has an object in
 * that case.
 */
function ordinaryObject(
	proposed: GermanSlot,
	rest: readonly GermanSlot[],
): GermanSlot | undefined {
	const reflexive = reflexiveOf(proposed.complements);
	if (!reflexive || reflexive.preposition !== undefined) return undefined;
	const { governedCase } = reflexive;
	const taken = rest.some(({ complements }) =>
		complements.some(
			(complement) =>
				complement.kind === "Case" &&
				complement.governedCase === governedCase,
		),
	);
	return taken
		? undefined
		: {
				status: "Required",
				complements: [{ kind: "Case", governedCase }],
			};
}

/**
 * The frame with the Reflexive Slot the Reading's 🪞 settles (ADR 0052),
 * and the Slot it drops. A 🪞 Reading's Reflexive is Required and stands
 * right after the subject. The creating occurrence's goes first where its
 * evidence names the case (`attestedReflexive`), with any fixed phrase's
 * preposition, else Luna's, then the occurrence's. A Reading without 🪞
 * keeps no Required one: its sich becomes the ordinary object
 * (`ordinaryObject`). A 🪞 Reading neither names a Reflexive's case for
 * is a failure.
 */
function settledReflexive(
	reading: Dumling.Reading<"de">,
	frame: readonly GermanSlot[],
	evidence: readonly ValencyEvidence[],
	origin: KnowledgeOrigin,
):
	| {
			readonly frame: GermanSlot[];
			readonly dropped?: {
				readonly slot: unknown;
				readonly reason: string;
			};
	  }
	| { readonly failure: KnowledgeFailure } {
	const marked =
		"emojiDescription" in reading &&
		reading.emojiDescription.startsWith(reflexiveMarker);
	const proposed = frame.find(isReflexiveSlot);
	const rest = frame.filter((slot) => slot !== proposed);
	if (!marked) {
		if (proposed?.status !== "Required") return { frame: [...frame] };
		const object = ordinaryObject(proposed, rest);
		return object
			? {
					frame: frame.map((slot) =>
						slot === proposed ? object : slot,
					),
				}
			: {
					frame: rest,
					dropped: {
						slot: proposed,
						reason: `A Reading whose Emoji Description has no ${reflexiveMarker} has no Required Reflexive Slot`,
					},
				};
	}
	const attested = attestedReflexive(evidence);
	const offered = proposed && reflexiveOf(proposed.complements);
	const complement =
		origin === "New" ? (attested ?? offered) : (offered ?? attested);
	if (complement === undefined)
		return {
			failure: {
				aspect: "valency",
				leaf: "Reflexive",
				code: "Unresolved",
				message: `A ${reflexiveMarker} Reading takes a Required Reflexive Slot, and neither Luna nor the occurrence names its case`,
			},
		};
	const subject = rest.findIndex(({ complements }) =>
		complements.some(
			(complement) =>
				complement.kind === "Case" && complement.governedCase === "Nom",
		),
	);
	const slot: GermanSlot = {
		status: "Required",
		complements: [complement],
	};
	return {
		frame: [
			...rest.slice(0, subject + 1),
			slot,
			...rest.slice(subject + 1),
		],
	};
}

/**
 * The Reading's proposed frame as one Contribute change, the creating
 * occurrence's government appended and its Reflexive Slot settled by its
 * 🪞, or no change when it governs nothing.
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
		const proposed = yield* write(
			context,
			"valency",
			valencyPrompt,
			{ complementKinds: [...allowedComplementKinds(context.lemma)] },
			frameAnswer,
			frameOf,
			{ strict: true },
		);
		const { kept, dropped } = validFrame(context.reading, proposed);
		if (dropped.length > 0)
			context.log.event({
				name: "DroppedValencySlots",
				data: { dropped },
			});
		const evidence =
			"valencyEvidence" in context.attestation
				? context.attestation.valencyEvidence
				: [];
		const attested =
			origin === "New"
				? attestedSlots(context.lemma, kept, evidence)
				: { slots: [], failures: [] };
		const settled = settledReflexive(
			context.reading,
			[...kept, ...attested.slots],
			evidence,
			origin,
		);
		if ("failure" in settled)
			return {
				changes: [],
				failures: [...attested.failures, settled.failure],
			};
		if (settled.dropped)
			context.log.event({
				name: "DroppedValencySlots",
				data: { dropped: [settled.dropped] },
			});
		const { frame } = settled;
		if (frame.length === 0)
			return { changes: [], failures: attested.failures };
		const changes = checkedChanges(context, "valency", [
			{ kind: "Contribute", aspect: "valency", value: frame },
		]);
		if (!Array.isArray(changes)) return yield* changes;
		return { changes, failures: attested.failures };
	});
