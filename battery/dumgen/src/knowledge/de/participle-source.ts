/**
 * A participial adjective's Source (system ADR 0036), once `source.ts`'s
 * formation judge has called the adjective a participle: Luna names the
 * verb by form, code checks the participle spells the adjective, and jev
 * checks the claim and judges the Participle Meaning.
 */
import { isRecord } from "common-utils";
import { germanInseparablePrefixes } from "dumcorpus/inventories";
import { foldCase, normalizeForm } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { choice, choiceOf } from "../../segment/ask.js";
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
import { shared } from "./prompts.js";
import { participle } from "./structure-prompts.js";

const participlePrompt = [
	shared.reading,
	shared.evidence,
	participle.task,
	participle.reflexive,
	participle.parts,
	participle.none,
].join("\n");

const nullableString = { type: ["string", "null"] } as const;
const participleSchema = {
	type: "object",
	properties: {
		verb: nullableString,
		reflexive: { type: ["string", "null"], enum: ["Acc", "Dat", null] },
		separablePrefix: nullableString,
		preterite: nullableString,
		participle: nullableString,
	},
	required: ["verb"],
	additionalProperties: false,
} as const;

/** The source verb Luna named by form: its parts, or none. */
type SourceDraft = {
	readonly verb: string;
	readonly reflexive: "Acc" | "Dat" | null;
	readonly separablePrefix: string | null;
	readonly preterite: string;
	readonly participle: string;
};

/**
 * Whether the adjective is the source verb's participle: the Partizip II
 * Luna wrote, or the Partizip I, which is always the infinitive and -d.
 */
function isParticipleOf(
	adjective: string,
	draft: Pick<SourceDraft, "verb" | "participle">,
): "PartizipI" | "PartizipII" | undefined {
	const folded = foldCase(adjective, "de");
	if (foldCase(draft.participle, "de") === folded) return "PartizipII";
	if (foldCase(`${draft.verb}d`, "de") === folded) return "PartizipI";
	return undefined;
}

function sourceDraftOf(output: unknown): SourceDraft | null | undefined {
	if (!isRecord(output)) return undefined;
	if (output.verb === null) return null;
	const { verb, reflexive, separablePrefix, preterite } = output;
	const participleForm = output.participle;
	if (
		typeof verb !== "string" ||
		typeof preterite !== "string" ||
		typeof participleForm !== "string" ||
		(reflexive !== null && reflexive !== "Acc" && reflexive !== "Dat") ||
		(separablePrefix !== null && typeof separablePrefix !== "string")
	)
		return undefined;
	const infinitive = normalizeForm(verb).replace(/^sich\s+/u, "");
	const named =
		separablePrefix === null ? null : normalizeForm(separablePrefix);
	// An inseparable prefix is no separable one, whatever Luna calls it.
	const prefix =
		named !== null && germanInseparablePrefixes.has(named) ? null : named;
	if (
		!/^\p{Ll}+$/u.test(infinitive) ||
		(prefix !== null &&
			(prefix === "" ||
				!infinitive.startsWith(prefix) ||
				infinitive === prefix))
	)
		return undefined;
	return {
		verb: infinitive,
		reflexive: reflexive ?? null,
		separablePrefix: prefix,
		preterite: normalizeForm(preterite),
		participle: normalizeForm(participleForm),
	};
}

const participleQuestions = {
	form: choice(participle.formQuestion, {
		Participle: participle.formYes,
		NotParticiple: participle.formNo,
		Unresolved: participle.unsure,
	}),
	meaning: choice(participle.meaningQuestion, {
		Verbal: participle.verbal,
		Drifted: participle.drifted,
		Unresolved: participle.unsure,
	}),
};

/** The source verb's Lemma, with the identity Core Features grammar gives a verb. */
function sourceVerbLemma(
	draft: Pick<SourceDraft, "verb" | "reflexive" | "separablePrefix">,
): Dumling.Lemma<"de", "Lexeme", "VERB"> {
	return {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm:
			draft.reflexive === null ? draft.verb : `sich ${draft.verb}`,
		coreFeatures: {
			hasSepPrefix: draft.separablePrefix,
			lexicallyReflexive: draft.reflexive,
		},
	};
}

/**
 * The Source of an adjective jev judged a participle, the verb it is a
 * participle of, or none (ADR 0036): Luna names the verb by form, code checks
 * the form it spells, and jev checks the claim and judges the meaning in one
 * request. An adjective Luna names no verb for takes no judgment.
 */
export const produceParticipleSource = (
	context: AspectContext,
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
	Effect.gen(function* () {
		const draft = yield* write(
			context,
			"participleSource",
			participlePrompt,
			{},
			participleSchema,
			(output) => {
				const parsed = sourceDraftOf(output);
				return parsed === undefined
					? unusable(
							"participleSource",
							`Luna named no usable source verb: ${JSON.stringify(output).slice(0, 120)}`,
						)
					: parsed;
			},
		);
		const adjective = context.lemma.canonicalForm;
		const form =
			draft === null ? undefined : isParticipleOf(adjective, draft);
		if (draft === null || form === undefined) {
			context.log.event({
				name: "NoParticipleSource",
				data: draft === null ? null : { ...draft },
			});
			return [];
		}
		const answers = yield* context.ask({
			stage: "participleJudgment",
			state: judgeState(context, {
				adjective,
				verb: sourceVerbLemma(draft).canonicalForm,
				preterite: draft.preterite,
			}),
			// A Partizip I is the infinitive and -d, so code has checked
			// its form; only a Partizip II's claimed form needs the judge.
			questions:
				form === "PartizipI"
					? { meaning: participleQuestions.meaning }
					: participleQuestions,
		});
		const verdict =
			form === "PartizipI"
				? "Participle"
				: choiceOf(answers, "form").choice;
		const meaning = choiceOf(answers, "meaning").choice;
		if (verdict === "NotParticiple") {
			context.log.event({
				name: "RejectedParticipleSource",
				data: { verb: draft.verb },
			});
			return [];
		}
		if (verdict !== "Participle" || meaning === "Unresolved")
			return yield* new KnowledgeUnresolved({
				message: "jev left the participle's form or meaning undecided",
			});
		return yield* checked(context, "source", {
			target: sourceVerbLemma(draft),
			meaning,
		});
	});
