/**
 * Answers `resolve.grammar`'s questions from a case's gold Attestation, as
 * a judge that is always right would: the stand-in answers a pricing pass
 * replays to find the follow-up requests a run would send, and the fake
 * answers the harness's tests run on. It reads gold only; no model.
 */

import type { Question, Questions } from "@typesafe-ai/sdk";
import { isRecord } from "common-utils";
import { foldCase, lemmaIdentityKey } from "dumling";
import { z } from "zod";
import {
	authoredOptions,
	openOptions,
} from "../../../src/resolve/de/closed-class.js";
import { auxiliaryUses } from "../../../src/resolve/de/prompts.js";
import { targetOf } from "../../../src/resolve/de/target.js";
import type { Answer, Answers } from "../../../src/segment/ask.js";
import { storedAs } from "../../stored-json.js";
import type { GrammarCase } from "./cases.js";

type Values = Readonly<Record<string, unknown>>;

const picked = (choice: string): Answer => ({
	type: "choice",
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 },
});

/** The Surface features a use of an auxiliary makes, to match gold against. */
const useFeatures: Readonly<Record<string, Values>> = {
	"haben 🏁": { perfect: "Yes" },
	"sein 🏁": { perfect: "Yes" },
	"werden 🔮": { future: "Yes" },
	"werden 🔄": { passive: "Process" },
	"bekommen 🎁": { passive: "Recipient" },
	"lassen 🗣👉": { voice: "Cau" },
};
const articleOfGender: Readonly<Record<string, string>> = {
	Masc: "der",
	Fem: "die",
	Neut: "das",
};
/**
 * The articles gold's Core gender takes: its one gender's, or each of a
 * mixed gender's, in catalog order (Rule de/noun-gender-in-free-variation).
 */
const articlesOf = (gender: unknown): readonly string[] =>
	(isRecord(gender) && Array.isArray(gender.mixed)
		? gender.mixed
		: [gender]
	).flatMap((member) => articleOfGender[String(member)] ?? []);
const useOf = Object.fromEntries(
	Object.entries(auxiliaryUses).map(([use, text]) => [text, use]),
);

/** The option whose key or description is `value`, or Unresolved. */
function option(question: Question, value: unknown): string {
	if (question.type !== "choice") return "Unresolved";
	const text =
		value === null || value === undefined ? undefined : String(value);
	if (text !== undefined && text in question.criteria) return text;
	const found = Object.entries(question.criteria).find(
		([, description]) => description === text,
	);
	return found?.[0] ?? "Unresolved";
}

/** The closed-class cell answer: the option whose Lemma and cell are gold's. */
function cellAnswer(goldCase: GrammarCase, question: Question): string {
	const { unit, ideal } = goldCase;
	if (unit.route === "Unresolved") return "Unresolved";
	const target = targetOf(goldCase.sentence, unit, unit.route);
	const { options } = authoredOptions(target, unit.identity);
	const lemmaKey = lemmaIdentityKey(ideal.surface.lemma);
	const bag: Values | null =
		"inflectionalFeatures" in ideal.surface
			? ideal.surface.inflectionalFeatures
			: null;
	const index = options.findIndex(
		(entry) =>
			lemmaIdentityKey(entry.member.lemma) === lemmaKey &&
			Object.entries(entry.cell ?? {}).every(
				([key, value]) => (bag?.[key] ?? null) === value,
			),
	);
	if (index >= 0) return `o${index}`;
	// A stem's Surface Syncretism has its units' Lemma; its units' cells
	// tell it apart.
	const goldUnits = (
		"syncretized" in ideal.surface ? (ideal.surface.syncretized ?? []) : []
	).map(
		(syncretic): Values =>
			"inflectionalFeatures" in syncretic
				? (syncretic.inflectionalFeatures ?? {})
				: {},
	);
	const open = openOptions(options).findIndex((answer) =>
		"syncretism" in answer
			? lemmaIdentityKey(answer.syncretism.member.lemma) === lemmaKey &&
				answer.units.length === goldUnits.length &&
				answer.units.every(({ cell }) =>
					goldUnits.some((unit) =>
						Object.entries(cell ?? {}).every(
							([key, value]) => (unit[key] ?? null) === value,
						),
					),
				)
			: lemmaIdentityKey(answer.lemma) === lemmaKey,
	);
	return open >= 0 &&
		question.type === "choice" &&
		`s${open}` in question.criteria
		? `s${open}`
		: "Unresolved";
}

/** What a case's gold answers its questions from. */
function goldOf(goldCase: GrammarCase) {
	const { ideal, unit } = goldCase;
	const { surface } = ideal;
	const core: Values = surface.lemma.coreFeatures;
	const bag: Values | null =
		"inflectionalFeatures" in surface ? surface.inflectionalFeatures : null;
	const valency = "valencyEvidence" in ideal ? ideal.valencyEvidence : [];
	return {
		goldCase,
		ideal,
		unit,
		surface,
		core,
		bag,
		members: ideal.members,
		/** The Preposition slot gold governs at member `position`. */
		governedAt: (position: number) =>
			valency.find(
				(slot) =>
					slot.complement.kind === "Preposition" &&
					slot.member === position,
			),
		caseSlot: valency.find((slot) => slot.complement.kind === "Case"),
	};
}

type Gold = ReturnType<typeof goldOf>;

/** Gold's answer to one question, given the rest of its id after a prefix. */
type Answering = (gold: Gold, question: Question, suffix: string) => Answer;

/** Answers the option that names the gold value `read` gives. */
const reads =
	(read: (gold: Gold) => unknown): Answering =>
	(gold, question) =>
		picked(option(question, read(gold)));

/**
 * The article of gold's Core gender, None for none; a mixed gender's
 * articles share the weight, the first in catalog order chosen.
 */
const genderAnswer: Answering = ({ core }, question) => {
	const articles = articlesOf(core.gender);
	const [first] = articles;
	if (first === undefined || articles.length === 1)
		return picked(option(question, first ?? "None"));
	const weight = 1 / articles.length;
	return {
		type: "choice",
		choice: option(question, first),
		confidence: weight,
		probabilities: Object.fromEntries(
			articles.map((article) => [option(question, article), weight]),
		),
	};
};

/** The first irregular member the question offers, or None. */
const orthographyAnswer: Answering = ({ members }, question) => {
	const criteria = question.type === "choice" ? question.criteria : {};
	const irregular = members.flatMap((member, position) =>
		member.orthography === "Typo"
			? [`t${position}`]
			: member.orthography === "Shorthand"
				? [`s${position}`]
				: [],
	);
	return picked(
		option(question, irregular.find((key) => key in criteria) ?? "None"),
	);
};

/** The fused component that segment `suffix` reads as. */
const readingAnswer: Answering = ({ members, unit }, question, suffix) => {
	const segment = Number(suffix);
	let reading: string | undefined;
	for (const [position, member] of members.entries()) {
		if (member.orthography !== "Fused") continue;
		const own = unit.segments[position] ?? -1;
		reading ??=
			member.fusion.components[member.component + segment - own]?.surface;
	}
	const found =
		question.type === "choice"
			? Object.entries(question.criteria).find(
					([, text]) => text === reading,
				)?.[0]
			: undefined;
	return picked(found ?? "Unresolved");
};

/** The auxiliary use whose features gold's bag has, or Main. */
const auxiliaryAnswer: Answering = ({ bag }, question) => {
	const uses =
		question.type === "choice"
			? Object.entries(question.criteria).filter(([key]) =>
					key.startsWith("u"),
				)
			: [];
	const matching = uses.find(([, text]) => {
		const features = useFeatures[useOf[String(text)] ?? ""];
		return (
			features !== undefined &&
			Object.entries(features).every(
				([feature, value]) => bag?.[feature] === value,
			)
		);
	});
	return picked(matching?.[0] ?? "Main");
};

/** The shortened word that is gold's headword or one of its words. */
const shortAnswer: Answering = ({ surface }, question) => {
	const words = new Set(
		[
			surface.lemma.canonicalForm,
			...String(surface.normalizedSurface).split(" "),
		].map((word) => foldCase(word, "de")),
	);
	const found =
		question.type === "choice"
			? Object.entries(question.criteria).find(([, text]) =>
					words.has(foldCase(String(text), "de")),
				)?.[0]
			: undefined;
	return picked(found ?? "Unresolved");
};

/** Whether member `suffix` is governed: a gold slot, or absent from the Surface. */
const governedAnswer: Answering = (gold, question, suffix) => {
	const position = Number(suffix);
	const { members, surface } = gold;
	const attested = foldCase(members[position]?.attested ?? "", "de");
	const governs =
		gold.governedAt(position) !== undefined ||
		!String(surface.normalizedSurface)
			.split(" ")
			.some((token) => foldCase(token, "de") === attested);
	return picked(option(question, governs ? "Governed" : "Free"));
};

/** The questions asked by their whole id. */
const answeringOf: ReadonlyMap<string, Answering> = new Map<string, Answering>([
	["orthography", orthographyAnswer],
	["citation", reads(({ bag }) => (bag === null ? "Citation" : "Used"))],
	[
		"spelling",
		reads(({ surface: { spelling } }) =>
			spelling.kind === "Canonical"
				? "Canonical"
				: spelling.variantTags[0],
		),
	],
	[
		"archaic",
		reads(({ surface }) =>
			surface.surfaceFeatures?.historicalStatus === "Archaic"
				? "Archaic"
				: "Current",
		),
	],
	["prefix", reads(({ core }) => core.hasSepPrefix ?? "None")],
	["reflexive", reads(({ core }) => core.lexicallyReflexive)],
	[
		"expletive",
		reads(({ bag }) => (bag?.expletive === "Subject" ? "Subject" : "None")),
	],
	["verbForm", reads(({ bag }) => bag?.verbForm)],
	["mood", reads(({ bag }) => bag?.mood)],
	["tense", reads(({ bag }) => bag?.tense)],
	["person", reads(({ bag }) => bag?.person)],
	["number", reads(({ bag }) => bag?.number)],
	["participle", reads(({ bag }) => bag?.participleForm)],
	[
		"article",
		reads(({ core }) =>
			core.article === "Definite" ? "Definite" : "Bare",
		),
	],
	["gender", genderAnswer],
	["freeGender", reads(({ core }) => (isRecord(core.gender) ? "Yes" : "No"))],
	[
		"indefinite",
		reads(({ members }) =>
			members[0]?.orthography === "Shorthand" ? "Indefinite" : "Asks",
		),
	],
	[
		"nounKind",
		reads(({ core, goldCase }) =>
			core.gender !== null && core.gender !== undefined
				? "Ordinary"
				: goldCase.rules.includes("de/adjectival-noun-lemma")
					? "Adjectival"
					: "PluralOnly",
		),
	],
	["formGender", reads(({ bag }) => articleOfGender[String(bag?.gender)])],
	["case", reads(({ bag }) => bag?.case ?? "Unmarked")],
	[
		"comparable",
		reads(({ core }) => (core.comparable === "Yes" ? "Yes" : "No")),
	],
	["degree", reads(({ bag }) => bag?.degree)],
	[
		"attributive",
		reads(({ bag }) => ((bag?.case ?? null) !== null ? "Yes" : "No")),
	],
	["agreement.case", reads(({ bag }) => bag?.case)],
	["agreement.gender", reads(({ bag }) => bag?.gender ?? "Unmarked")],
	["agreement.number", reads(({ bag }) => bag?.number)],
	[
		"inflects",
		reads(({ bag }) =>
			bag && ["case", "gender", "number"].some((key) => bag[key] != null)
				? "Yes"
				: "No",
		),
	],
	[
		"realizedCase",
		reads(({ caseSlot }) => (caseSlot ? caseSlot.realizedCase : "None")),
	],
	["answer", reads(({ core }) => (core.partType === "Res" ? "Res" : "None"))],
	["sourceLanguage", reads(({ core }) => core.sourceLang)],
	["coverage", reads(({ ideal }) => ideal.realizationCoverage)],
	[
		"cell",
		({ goldCase }, question) => picked(cellAnswer(goldCase, question)),
	],
]);

/** The questions asked per member or segment: a prefix, then its number. */
const answeringByPrefix: readonly (readonly [string, Answering])[] = [
	["reading_s", readingAnswer],
	["aux_m", auxiliaryAnswer],
	["short_s", shortAnswer],
	["governed_m", governedAnswer],
	[
		"governedCase_m",
		(gold, question, suffix) =>
			picked(
				option(
					question,
					gold.governedAt(Number(suffix))?.complement.governedCase,
				),
			),
	],
	[
		"governedReferent_m",
		(gold, question, suffix) =>
			picked(
				option(
					question,
					gold.governedAt(Number(suffix))?.complement.referent ??
						"Either",
				),
			),
	],
];

/** Gold's answer to question `id`; one it says nothing about is Unresolved. */
function goldAnswer(gold: Gold, id: string, question: Question): Answer {
	const answering = answeringOf.get(id);
	if (answering) return answering(gold, question, "");
	for (const [prefix, byPrefix] of answeringByPrefix)
		if (id.startsWith(prefix))
			return byPrefix(gold, question, id.slice(prefix.length));
	return picked("Unresolved");
}

/**
 * Gold's answers to one jev request of a case. A question gold says
 * nothing about answers Unresolved; a speculative one is then not read.
 */
export function goldAnswers(
	goldCase: GrammarCase,
	questions: Questions,
): Answers {
	const gold = goldOf(goldCase);
	const answers: Record<string, Answer> = {};
	for (const [id, question] of Object.entries(questions))
		answers[id] = goldAnswer(gold, id, question);
	return answers;
}

/** What the Canonical Form call sends Luna, as gold's answer reads it. */
const canonicalFormInputSchema = z.object({
	members: z.array(
		z.object({
			member: z.string(),
			text: z.string(),
			orthography: z.string(),
		}),
	),
	fixedMembers: z.record(z.string(), z.string()).optional(),
	outsideHeadword: z.array(z.string()).optional(),
});

/**
 * Gold's answer to the Canonical Form call: gold's headword, and each
 * member spelled as gold's Surface spells it, a member outside the
 * headword or fixed by the table as the request has it.
 */
export function goldWritten(goldCase: GrammarCase, input: unknown): unknown {
	const { ideal } = goldCase;
	const request = storedAs(
		canonicalFormInputSchema,
		input,
		"The Canonical Form request's input",
	);
	const outside = new Set(request.outsideHeadword ?? []);
	const tokens = ideal.surface.normalizedSurface.split(" ");
	let cursor = 0;
	const last = request.members.length - 1;
	const members = request.members.map(({ member, text, orthography }, at) => {
		const fixed = request.fixedMembers?.[member];
		if (outside.has(member) || fixed !== undefined) return fixed ?? text;
		// A Typo, a Shorthand and a suspended fragment take their place's word.
		if (orthography === "Shorthand" && at === last)
			return tokens.slice(cursor).join(" ") || text;
		if (orthography !== "Standard" || /[-\u2010\u2011]$/u.test(text))
			return tokens[cursor++] ?? text;
		const index = tokens.findIndex(
			(token, position) =>
				position >= cursor &&
				foldCase(token, "de") === foldCase(text, "de"),
		);
		if (index < 0) return text;
		cursor = index + 1;
		return tokens[index] ?? text;
	});
	const { lemma } = ideal.surface;
	const core: Values = lemma.coreFeatures;
	const { gender } = core;
	return {
		canonicalForm: lemma.canonicalForm,
		members,
		...(lemma.family === "Lexeme" && lemma.kind === "NOUN"
			? { article: articlesOf(gender)[0] ?? "none" }
			: {}),
	};
}
