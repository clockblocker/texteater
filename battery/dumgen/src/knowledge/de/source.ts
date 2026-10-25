/**
 * A single word's Source (system ADR 0050): the one word it was formed from
 * whole, one step back. Every Source comes from this stage.
 *
 * - jev judges the formation first (`sourceFormation`): a participle (ADJ
 *   only), a conversion, a clipping, an acronym or none. None asks nothing
 *   more, so Luna is paid only for a formation. The type is not stored.
 * - A participle takes ADR 0036's stage (`participle-source.ts`).
 * - Any other formation has Luna write its base (`sourceBase`), code check
 *   the letters by type (`source-letters.ts`), and jev confirm the claim
 *   (`sourceJudgment`): a conversion's direction as a closed pick
 *   (`Lauf` from `laufen`, never `laufen` from `Lauf`), a shortening's base
 *   as yes or no. The base links as a Breakdown piece does, by its Unit
 *   Shadow.
 *
 * What fails decides what the host does next (Dumgen ADR 0007): a Reading
 * with a Source runs neither segmenter, and one with none runs
 * `segment.inConstituents`. A conversion that doesn't pass is none, since
 * splitting it as a bottom word shows the same letters (`lauf · ∅`). A
 * clipping or acronym that doesn't pass is `KnowledgeUnresolved`, like a
 * failed call, so the host holds both segmenters and no split is invented
 * for `Kita`. A multiword Lexeme has no Source and asks nothing.
 */
import { isRecord } from "common-utils";
import { normalizeForm } from "dumling";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { choice, choiceOf } from "../../segment/ask.js";
import { withoutReflexive } from "../../segment/de/candidates.js";
import type { GermanKnowledgeChange } from "../types.js";
import {
	type AspectContext,
	type AspectError,
	checked,
	judgeState,
	KnowledgeUnresolved,
	unusable,
	write,
} from "./context.js";
import { produceParticipleSource } from "./participle-source.js";
import { shared } from "./prompts.js";
import { isConversionOf, isShorteningOf } from "./source-letters.js";
import { formation } from "./structure-prompts.js";

/** The formations the judge may name for a word of `kind`: a participle is an adjective. */
const formationQuestion = (kind: string) =>
	choice(formation.question, {
		...(kind === "ADJ" ? { Participle: formation.Participle } : {}),
		Conversion: formation.Conversion,
		Clipping: formation.Clipping,
		Acronym: formation.Acronym,
		None: formation.None,
		Unresolved: formation.Unresolved,
	});

const directionQuestion = choice(formation.directionQuestion, {
	Formed: formation.Formed,
	Reverse: formation.Reverse,
	Neither: formation.Neither,
});

const shorteningQuestion = choice(formation.shorteningQuestion, {
	Short: formation.Short,
	NotShort: formation.NotShort,
});

const basePrompt = [shared.reading, shared.evidence, formation.base].join("\n");

/** The Kinds a base may take. */
const baseKinds = ["NOUN", "VERB", "ADJ", "ADV", "PROPN", "NUM"] as const;

const baseSchema = {
	type: "object",
	properties: {
		base: { type: ["string", "null"] },
		kind: { type: "string", enum: baseKinds },
	},
	required: ["base"],
	additionalProperties: false,
} as const;

/** The base Luna wrote, as the Unit Shadow its Source links to, or none. */
function baseOf(
	output: unknown,
): Dumrel.UnitShadow | null | ReturnType<typeof unusable> {
	if (isRecord(output) && output.base === null) return null;
	const kind = isRecord(output) ? output.kind : undefined;
	const base = isRecord(output) ? output.base : undefined;
	if (
		typeof base !== "string" ||
		base.trim() === "" ||
		!baseKinds.some((known) => known === kind)
	)
		return unusable(
			"sourceBase",
			`Luna wrote no usable base: ${JSON.stringify(output).slice(0, 120)}`,
		);
	// A base is the bare Lemma a lookup finds (ADR 0052).
	const canonicalForm = withoutReflexive(normalizeForm(base));
	// Sound: a German word's or Locution's route on a Kind from `baseKinds`;
	// Dumrel's check refuses one the Locution family lacks.
	return {
		language: "de",
		family: /\s/u.test(canonicalForm) ? "Locution" : "Lexeme",
		kind,
		canonicalForm,
	} as Dumrel.UnitShadow;
}

const unresolved = (message: string) => new KnowledgeUnresolved({ message });

/** A conversion's, clipping's or acronym's Source: Luna writes the base, code and jev check it. */
const produceBaseSource = (
	context: AspectContext,
	word: string,
	type: "Conversion" | "Clipping" | "Acronym",
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
	Effect.gen(function* () {
		const shortening = type !== "Conversion";
		const target = yield* write(
			context,
			"sourceBase",
			basePrompt,
			{ formation: type },
			baseSchema,
			baseOf,
		);
		const { kind } = context.lemma;
		const fits =
			target !== null &&
			(shortening
				? isShorteningOf(word, kind, target)
				: isConversionOf(word, kind, target));
		if (target === null || !fits) {
			context.log.event({
				name: "RejectedSource",
				data: { type, base: target?.canonicalForm ?? null },
			});
			if (shortening)
				return yield* unresolved(
					`The ${type} has no base its letters fit`,
				);
			return [];
		}
		const answers = yield* context.ask({
			stage: "sourceJudgment",
			state: judgeState(context, {
				word,
				base: target.canonicalForm,
			}),
			questions: shortening
				? { shortening: shorteningQuestion }
				: { direction: directionQuestion },
		});
		if (shortening) {
			if (choiceOf(answers, "shortening").choice !== "Short")
				return yield* unresolved(
					`jev doesn't confirm ${word} as short for ${target.canonicalForm}`,
				);
		} else if (choiceOf(answers, "direction").choice !== "Formed") {
			context.log.event({
				name: "RejectedSource",
				data: { type, base: target.canonicalForm },
			});
			return [];
		}
		return yield* checked(context, "source", { target });
	});

/**
 * A single word's Source, or none (ADR 0050): jev judges the formation, then
 * the participle's stage or the base's writes and checks it.
 */
export const produceSource = (
	context: AspectContext,
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
	Effect.gen(function* () {
		const word = context.lemma.canonicalForm;
		if (/\s/u.test(word)) return [];
		const answers = yield* context.ask({
			stage: "sourceFormation",
			state: judgeState(context),
			questions: { formation: formationQuestion(context.lemma.kind) },
		});
		const type = choiceOf(answers, "formation").choice;
		switch (type) {
			case "None":
				return [];
			case "Participle":
				return yield* produceParticipleSource(context);
			case "Conversion":
			case "Clipping":
			case "Acronym":
				return yield* produceBaseSource(context, word, type);
			default:
				return yield* unresolved(
					"jev left the word's formation undecided",
				);
		}
	});
