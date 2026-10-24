/**
 * The structural aspects that take one value each (#883 addenda): a
 * Locution's, Saying's or formula's type, and the Variation Dimensions of a
 * Lemma's Paradigm (ADR 0048): a noun's plural and a verb's principal
 * parts. Luna writes what must be written (plural forms, a verb's principal
 * parts, a Winged Word's attribution) and jev judges every closed choice
 * (plurality, the three types). Code splits written forms into Paradigm
 * Variants; conjugation classes are derived from the Präteritum, never
 * stored (ADR 0038). A single word's Source is `source.ts`.
 */
import { isRecord } from "common-utils";
import { normalizeForm } from "dumling";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { InvalidModelOutput } from "../../errors.js";
import { choice, choiceOf } from "../../segment/ask.js";
import type { GermanKnowledgeChange, KnowledgeFailure } from "../types.js";
import {
	type AspectContext,
	type AspectError,
	checked,
	checkedParadigmChanges,
	judgeState,
	KnowledgeUnresolved,
	textOf,
	textsOf,
	unusable,
	write,
} from "./context.js";
import { shared } from "./prompts.js";
import {
	formulaRole,
	locutionType,
	plural,
	sayingType,
	verbForms,
} from "./structure-prompts.js";

const formsSchema = (maxItems: number) =>
	({
		type: "array",
		items: { type: "string", minLength: 1 },
		maxItems,
	}) as const;

// Plural (#657): Luna writes the forms while jev judges the plurality.

const pluralPrompt = [
	shared.reading,
	shared.evidence,
	plural.task,
	plural.adjectival,
	plural.measure,
	plural.output,
].join("\n");

const pluralQuestion = choice(plural.question, {
	HasPlural: plural.hasPlural,
	NoPlural: plural.noPlural,
	PluralOnly: plural.pluralOnly,
});

/**
 * A noun's `plural` dimension: its forms when jev says it has a plural, else
 * the marker jev picked, as the Paradigm Changes that license them to the
 * Reading. A plural with no form written is unresolved.
 */
export const producePlural = (
	context: AspectContext,
): Effect.Effect<Dumrel.ParadigmChange[], AspectError> =>
	Effect.gen(function* () {
		const [forms, answers] = yield* Effect.all(
			[
				write(
					context,
					"plural",
					pluralPrompt,
					{},
					formsSchema(3),
					(output) => {
						const texts = textsOf("plural", output, 3);
						if (!Array.isArray(texts)) return texts;
						const words = texts.map(normalizeForm);
						return words.some((word) => !/^\S+$/u.test(word))
							? unusable("plural", "A plural form is one word")
							: words;
					},
				),
				context.ask({
					stage: "plurality",
					state: judgeState(context),
					questions: { plurality: pluralQuestion },
				}),
			],
			{ concurrency: "unbounded" },
		);
		const plurality = choiceOf(answers, "plurality").choice;
		if (forms.length === 0 && plurality === "HasPlural")
			return yield* new KnowledgeUnresolved({
				message: "jev judged a plural, and Luna wrote no plural form",
			});
		const changes = checkedParadigmChanges(
			context,
			"plural",
			plurality === "NoPlural" || plurality === "PluralOnly"
				? [plurality]
				: forms,
		);
		return Array.isArray(changes) ? changes : yield* changes;
	});

// Principal Parts (ADR 0038): Luna writes the forms in one call, and every
// verb dimension comes from that one write (#1209, #1217).

const verbFormsPrompt = [
	shared.reading,
	shared.evidence,
	verbForms.task,
	verbForms.spelling,
	verbForms.subjunctive,
	verbForms.output,
].join("\n");

const formsField = formsSchema(2);
const verbFormsSchema = {
	type: "object",
	properties: {
		preterite: formsField,
		presentSingular: {
			type: "object",
			properties: {
				first: formsField,
				second: formsField,
				third: formsField,
			},
			required: ["first", "second", "third"],
			additionalProperties: false,
		},
		pastParticiple: formsField,
		subjunctivePast: formsField,
	},
	required: [
		"preterite",
		"presentSingular",
		"pastParticiple",
		"subjunctivePast",
	],
	additionalProperties: false,
} as const;

/** The dimensions the one principal-parts write gives a verb. */
export type VerbDimension = Exclude<Dumrel.DimensionId, "plural">;

/** What Luna wrote: the Präteritum, which every dimension needs, and the rest unread. */
type VerbFormsDraft = {
	readonly preterite: string[];
	readonly written: Readonly<Record<string, unknown>>;
};

/** The forms of one field Luna wrote, or why there are none. */
function fieldForms(
	written: Readonly<Record<string, unknown>>,
	field: string,
): string[] | InvalidModelOutput {
	if (written[field] === undefined)
		return unusable("verbForms", `Luna wrote no ${field}`);
	const texts = textsOf("verbForms", written[field], 2);
	if (!Array.isArray(texts)) return texts;
	return texts.length === 0
		? unusable("verbForms", `Luna wrote no ${field}`)
		: texts;
}

/** Luna writes the Präsens singular by person; each person is one dimension. */
const presentPersons: Readonly<
	Partial<Record<VerbDimension, "first" | "second" | "third">>
> = { present1: "first", present2: "second", present3: "third" };

/** The forms Luna wrote for one dimension, or why they are unusable. */
function verbFormValues(
	draft: VerbFormsDraft,
	dimension: VerbDimension,
	lemma: string,
): string[] | InvalidModelOutput {
	if (dimension === "preterite") return draft.preterite;
	const person = presentPersons[dimension];
	if (person === undefined) return fieldForms(draft.written, dimension);
	const present = draft.written.presentSingular;
	if (!isRecord(present))
		return unusable("verbForms", `Luna wrote no Präsens for ${lemma}`);
	return fieldForms(present, person);
}

/**
 * The requested dimensions of a verb's principal parts, from the forms Luna
 * writes in one call, each as the Paradigm Changes that license them to the
 * Reading. Each dimension Dumrel refuses or Luna left unusable fails on its
 * own, so a Präteritum spelled against the Lemma (`aufzog` for `aufziehen`)
 * leaves the Präsens standing; a write with no usable Präteritum fails them
 * all.
 */
export const produceVerbForms = (
	context: AspectContext,
	dimensions: readonly VerbDimension[],
): Effect.Effect<
	{
		readonly paradigmChanges: Dumrel.ParadigmChange[];
		readonly failures: KnowledgeFailure[];
	},
	AspectError
> =>
	Effect.gen(function* () {
		const draft = yield* write(
			context,
			"verbForms",
			verbFormsPrompt,
			{},
			verbFormsSchema,
			(output): VerbFormsDraft | InvalidModelOutput => {
				if (!isRecord(output))
					return unusable(
						"verbForms",
						"Luna wrote no principal parts",
					);
				const preterite = fieldForms(output, "preterite");
				return Array.isArray(preterite)
					? { preterite, written: output }
					: preterite;
			},
		);
		const lemma = context.lemma.canonicalForm;
		const paradigmChanges: Dumrel.ParadigmChange[] = [];
		const failures: KnowledgeFailure[] = [];
		for (const dimension of dimensions) {
			const values = verbFormValues(draft, dimension, lemma);
			const accepted =
				values instanceof InvalidModelOutput
					? values
					: checkedParadigmChanges(context, dimension, values);
			if (Array.isArray(accepted)) paradigmChanges.push(...accepted);
			else
				failures.push({
					aspect: dimension,
					code: accepted._tag,
					message: accepted.message,
				});
		}
		return { paradigmChanges, failures };
	});

// Locution Type, Saying Type and Formula Role (#669, #667): jev judges.

/** The Locution Type options: Collocation only for a VERB (ADR 0039). */
const locutionTypeQuestion = (kind: string) =>
	choice(locutionType.question, {
		Idiom: locutionType.idiom,
		...(kind === "VERB" ? { Collocation: locutionType.collocation } : {}),
		// "Neither", not "None": a bare None drew the judge to it (#887).
		Neither: locutionType.none,
	});

export const produceLocutionType = (
	context: AspectContext,
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
	Effect.gen(function* () {
		const answers = yield* context.ask({
			stage: "locutionType",
			state: judgeState(context),
			questions: {
				locutionType: locutionTypeQuestion(context.lemma.kind),
			},
		});
		const picked = choiceOf(answers, "locutionType").choice;
		return picked === "Neither"
			? []
			: yield* checked(context, "locutionType", picked);
	});

const sayingTypeQuestion = choice(sayingType.question, {
	Proverb: sayingType.proverb,
	WingedWord: sayingType.wingedWord,
});

const attributionPrompt = [
	shared.reading,
	sayingType.attribution,
	sayingType.attributionOutput,
].join("\n");

/** A Saying's type, and a Winged Word's attribution, which Luna writes. */
export const produceSayingType = (
	context: AspectContext,
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
	Effect.gen(function* () {
		const answers = yield* context.ask({
			stage: "sayingType",
			state: judgeState(context),
			questions: { sayingType: sayingTypeQuestion },
		});
		const type = choiceOf(answers, "sayingType").choice;
		if (type !== "WingedWord")
			return yield* checked(context, "sayingType", { type });
		const attribution = yield* write(
			context,
			"attribution",
			attributionPrompt,
			{},
			{ type: ["string", "null"] },
			(output) =>
				output === null ? null : textOf("attribution", output),
			{ withSentence: false },
		);
		return yield* checked(context, "sayingType", {
			type,
			...(attribution === null ? {} : { attribution }),
		});
	});

const formulaRoleQuestion = choice(formulaRole.question, formulaRole.options);

export const produceFormulaRole = (
	context: AspectContext,
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
	Effect.gen(function* () {
		const answers = yield* context.ask({
			stage: "formulaRole",
			state: judgeState(context),
			questions: { formulaRole: formulaRoleQuestion },
		});
		const picked = choiceOf(answers, "formulaRole").choice;
		return picked === "None"
			? []
			: yield* checked(context, "formulaRole", picked);
	});
