/**
 * The structural aspects that take one value each (#883 addenda): a
 * noun's plural, a verb's conjugation classes, an adjective's Participle
 * Source, and a Locution's, Saying's or formula's type. Luna writes what
 * must be written (plural forms, Präteritum forms, a source verb's parts,
 * a Winged Word's attribution) and jev judges every closed choice
 * (plurality, the participle's form and meaning, the three types); code
 * derives the rest (conjugation classes from the Präteritum, ADR 0038).
 */
import { foldCase } from "dumling";
import type * as Dumling from "dumling/types";
import { germanConjugationClass, normalizeText } from "dumrel";
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { choice, choiceOf } from "../../segment/ask.js";
import type { GermanKnowledgeChange } from "../types.js";
import {
	type AspectContext,
	type AspectError,
	checkedChanges,
	judgeState,
	KnowledgeUnresolved,
	textOf,
	textsOf,
	unusable,
	write,
} from "./context.js";
import {
	conjugation,
	formulaRole,
	locutionType,
	participle,
	plural,
	sayingType,
	shared,
} from "./prompts.js";

const formsSchema = (maxItems: number) =>
	({
		type: "array",
		items: { type: "string", minLength: 1 },
		maxItems,
	}) as const;

// Plural (#657): Luna writes the forms while jev judges the plurality.

export const pluralPrompt = [
	shared.reading,
	shared.evidence,
	plural.task,
	plural.adjectival,
	plural.measure,
	plural.output,
].join("\n");

export const pluralQuestion = choice(plural.question, {
	HasPlural: plural.hasPlural,
	NoPlural: plural.noPlural,
	PluralOnly: plural.pluralOnly,
});

/**
 * A noun's plural: its forms when jev says it has a plural, else the
 * marker jev picked. A plural with no form written is unresolved.
 */
export const producePlural = (
	context: AspectContext,
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
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
						const words = texts.map(normalizeText);
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
		if (plurality === "NoPlural" || plurality === "PluralOnly")
			return yield* checked(context, "plural", plurality);
		if (forms.length === 0)
			return yield* new KnowledgeUnresolved({
				message: "jev judged a plural, and Luna wrote no plural form",
			});
		return yield* checked(context, "plural", forms);
	});

/** One Contribute change of `aspect`, checked by Dumrel. */
function checked(
	context: AspectContext,
	aspect:
		| "plural"
		| "conjugationClass"
		| "participleSource"
		| "locutionType"
		| "sayingType"
		| "formulaRole",
	value: unknown,
): Effect.Effect<GermanKnowledgeChange[], AspectError> {
	const changes = checkedChanges(context, aspect, [
		{ kind: "Contribute", aspect, value },
	]);
	return Array.isArray(changes)
		? Effect.succeed(changes)
		: Effect.fail(changes);
}

// Conjugation Class (ADR 0038): Luna writes the Präteritum, code judges the stem.

export const conjugationPrompt = [
	shared.reading,
	shared.evidence,
	conjugation.task,
	conjugation.output,
].join("\n");

const classOrder: readonly Dumrel.ConjugationClass[] = [
	"Strong",
	"Weak",
	"Mixed",
];

export const produceConjugationClass = (
	context: AspectContext,
): Effect.Effect<GermanKnowledgeChange[], AspectError> =>
	Effect.gen(function* () {
		const forms = yield* write(
			context,
			"conjugationClass",
			conjugationPrompt,
			{},
			formsSchema(2),
			(output) => {
				const texts = textsOf("conjugationClass", output, 2);
				if (!Array.isArray(texts)) return texts;
				return texts.length === 0
					? unusable("conjugationClass", "Luna wrote no Präteritum")
					: texts;
			},
		);
		const classes = new Set(
			forms.map((form) =>
				germanConjugationClass(context.lemma.canonicalForm, form),
			),
		);
		return yield* checked(
			context,
			"conjugationClass",
			classOrder.filter((value) => classes.has(value)),
		);
	});

// Participle Source (ADR 0036): Luna names the verb by form, jev checks it.

export const participlePrompt = [
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

/** The German inseparable verb prefixes: never a `hasSepPrefix`. */
const inseparablePrefixes = new Set([
	"be",
	"emp",
	"ent",
	"er",
	"ge",
	"miss",
	"ver",
	"zer",
]);

/**
 * Whether the adjective is the source verb's participle: the Partizip II
 * Luna wrote, or the Partizip I, which is always the infinitive and -d.
 */
export function isParticipleOf(
	adjective: string,
	draft: Pick<SourceDraft, "verb" | "participle">,
): "PartizipI" | "PartizipII" | undefined {
	const folded = foldCase(adjective, "de");
	if (foldCase(draft.participle, "de") === folded) return "PartizipII";
	if (foldCase(`${draft.verb}d`, "de") === folded) return "PartizipI";
	return undefined;
}

function sourceDraftOf(output: unknown): SourceDraft | null | undefined {
	if (!output || typeof output !== "object") return undefined;
	const value = output as Record<string, unknown>;
	if (value.verb === null) return null;
	const { verb, reflexive, separablePrefix, preterite } = value;
	const participleForm = value.participle;
	if (
		typeof verb !== "string" ||
		typeof preterite !== "string" ||
		typeof participleForm !== "string" ||
		(reflexive !== null && reflexive !== "Acc" && reflexive !== "Dat") ||
		(separablePrefix !== null && typeof separablePrefix !== "string")
	)
		return undefined;
	const infinitive = normalizeText(verb).replace(/^sich\s+/u, "");
	const named =
		separablePrefix === null ? null : normalizeText(separablePrefix);
	// An inseparable prefix is no separable one, whatever Luna calls it.
	const prefix =
		named !== null && inseparablePrefixes.has(named) ? null : named;
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
		preterite: normalizeText(preterite),
		participle: normalizeText(participleForm),
	};
}

export const participleQuestions = {
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
export function sourceVerbLemma(
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
	} as Dumling.Lemma<"de", "Lexeme", "VERB">;
}

/**
 * An adjective's Participle Source, or none: Luna names the verb by form,
 * code checks the form it spells, and jev checks the claim and judges the
 * meaning in one request. A plain adjective takes no judgment.
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
			context.scope.event({
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
			context.scope.event({
				name: "RejectedParticipleSource",
				data: { verb: draft.verb },
			});
			return [];
		}
		if (verdict !== "Participle" || meaning === "Unresolved")
			return yield* new KnowledgeUnresolved({
				message: "jev left the participle's form or meaning undecided",
			});
		return yield* checked(context, "participleSource", {
			verb: sourceVerbLemma(draft),
			meaning,
		});
	});

// Locution Type, Saying Type and Formula Role (#669, #667): jev judges.

/** The Locution Type options: Collocation only for a VERB (ADR 0039). */
export const locutionTypeQuestion = (kind: string) =>
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

export const sayingTypeQuestion = choice(sayingType.question, {
	Proverb: sayingType.proverb,
	WingedWord: sayingType.wingedWord,
});

export const attributionPrompt = [
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

export const formulaRoleQuestion = choice(
	formulaRole.question,
	formulaRole.options,
);

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
