/**
 * Answers `resolve.grammar`'s questions from a case's gold Attestation, as
 * a judge that is always right would: the stand-in answers a pricing pass
 * replays to find the follow-up requests a run would send, and the fake
 * answers the harness's tests run on. It reads gold only; no model.
 */

import type { Question, Questions } from "@typesafe-ai/sdk";
import { foldCase, lemmaIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import {
	authoredOptions,
	openOptions,
} from "../../../src/resolve/de/closed-class.js";
import { auxiliaryUses } from "../../../src/resolve/de/prompts.js";
import { targetOf } from "../../../src/resolve/de/target.js";
import type { Answer, Answers } from "../../../src/segment/ask.js";
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
	const bag = (
		"inflectionalFeatures" in ideal.surface
			? ideal.surface.inflectionalFeatures
			: null
	) as Values | null;
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
		(
			ideal.surface as {
				syncretized?: readonly {
					inflectionalFeatures?: Values | null;
				}[];
			}
		).syncretized ?? []
	).map(({ inflectionalFeatures }) => inflectionalFeatures ?? {});
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

/**
 * Gold's answers to one jev request of a case. A question gold says
 * nothing about answers Unresolved; a speculative one is then not read.
 */
export function goldAnswers(
	goldCase: GrammarCase,
	questions: Questions,
): Answers {
	const { ideal, unit } = goldCase;
	const surface = ideal.surface as unknown as Values & {
		lemma: Dumling.Lemma;
	};
	const core = surface.lemma.coreFeatures as Values;
	const bag = (surface.inflectionalFeatures ?? null) as Values | null;
	const members = ideal.members;
	const valency = (
		(ideal as { valencyEvidence?: readonly Values[] }).valencyEvidence ?? []
	).map((slot) => slot as Values & { complement: Values });
	const governedAt = (position: number) =>
		valency.find(
			(slot) =>
				slot.complement.kind === "Preposition" &&
				slot.member === position,
		);
	const caseSlot = valency.find((slot) => slot.complement.kind === "Case");
	const answers: Record<string, Answer> = {};
	for (const [id, question] of Object.entries(questions)) {
		const answer = (value: unknown) => {
			answers[id] = picked(option(question, value));
		};
		if (id === "orthography") {
			const criteria =
				question.type === "choice" ? question.criteria : {};
			const irregular = members.flatMap((member, position) =>
				member.orthography === "Typo"
					? [`t${position}`]
					: member.orthography === "Shorthand"
						? [`s${position}`]
						: [],
			);
			answer(irregular.find((key) => key in criteria) ?? "None");
		} else if (id === "citation")
			answer(bag === null ? "Citation" : "Used");
		else if (id === "spelling") {
			const spelling = surface.spelling as {
				kind: string;
				variantTags?: string[];
			};
			answer(
				spelling.kind === "Canonical"
					? "Canonical"
					: spelling.variantTags?.[0],
			);
		} else if (id === "archaic")
			answer(
				(surface.surfaceFeatures as Values | null)?.historicalStatus ===
					"Archaic"
					? "Archaic"
					: "Current",
			);
		else if (id.startsWith("reading_s")) {
			const segment = Number(id.slice("reading_s".length));
			let reading: string | undefined;
			for (const [position, member] of members.entries()) {
				if (member.orthography !== "Fused") continue;
				const own = unit.segments[position] ?? -1;
				reading ??=
					member.fusion.components[member.component + segment - own]
						?.surface;
			}
			const found =
				question.type === "choice"
					? Object.entries(question.criteria).find(
							([, text]) => text === reading,
						)?.[0]
					: undefined;
			answers[id] = picked(found ?? "Unresolved");
		} else if (id.startsWith("aux_m")) {
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
			answers[id] = picked(matching?.[0] ?? "Main");
		} else if (id === "prefix") answer(core.hasSepPrefix ?? "None");
		else if (id === "reflexive") answer(core.lexicallyReflexive);
		else if (id === "expletive")
			answer(bag?.expletive === "Subject" ? "Subject" : "None");
		else if (id === "verbForm") answer(bag?.verbForm);
		else if (id === "mood") answer(bag?.mood);
		else if (id === "tense") answer(bag?.tense);
		else if (id === "person") answer(bag?.person);
		else if (id === "number") answer(bag?.number);
		else if (id === "participle") answer(bag?.participleForm);
		else if (id === "article")
			answer(core.article === "Definite" ? "Definite" : "Bare");
		else if (id === "gender")
			answer(articleOfGender[String(core.gender)] ?? "None");
		else if (id === "indefinite")
			answer(
				members[0]?.orthography === "Shorthand" ? "Indefinite" : "Asks",
			);
		else if (id === "nounKind")
			answer(
				core.gender !== null && core.gender !== undefined
					? "Ordinary"
					: goldCase.rules.includes("de/adjectival-noun-lemma")
						? "Adjectival"
						: "PluralOnly",
			);
		else if (id === "formGender")
			answer(articleOfGender[String(bag?.gender)]);
		else if (id.startsWith("short_s")) {
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
			answers[id] = picked(found ?? "Unresolved");
		} else if (id === "case") answer(bag?.case ?? "Unmarked");
		else if (id === "comparable")
			answer(core.comparable === "Yes" ? "Yes" : "No");
		else if (id === "degree") answer(bag?.degree);
		else if (id === "attributive")
			answer((bag?.case ?? null) !== null ? "Yes" : "No");
		else if (id === "agreement.case") answer(bag?.case);
		else if (id === "agreement.gender") answer(bag?.gender ?? "Unmarked");
		else if (id === "agreement.number") answer(bag?.number);
		else if (id === "inflects")
			answer(
				bag &&
					["case", "gender", "number"].some((key) => bag[key] != null)
					? "Yes"
					: "No",
			);
		else if (id === "realizedCase")
			answer(caseSlot ? caseSlot.realizedCase : "None");
		else if (id === "answer")
			answer(core.partType === "Res" ? "Res" : "None");
		else if (id === "sourceLanguage") answer(core.sourceLang);
		else if (id === "coverage") answer(ideal.realizationCoverage);
		else if (id.startsWith("governed_m")) {
			const position = Number(id.slice("governed_m".length));
			const attested = foldCase(members[position]?.attested ?? "", "de");
			const governs =
				governedAt(position) !== undefined ||
				!String(surface.normalizedSurface)
					.split(" ")
					.some((token) => foldCase(token, "de") === attested);
			answer(governs ? "Governed" : "Free");
		} else if (id.startsWith("governedCase_m"))
			answer(
				governedAt(Number(id.slice("governedCase_m".length)))
					?.complement.governedCase,
			);
		else if (id.startsWith("governedReferent_m"))
			answer(
				governedAt(Number(id.slice("governedReferent_m".length)))
					?.complement.referent ?? "Either",
			);
		else if (id === "cell")
			answers[id] = picked(cellAnswer(goldCase, question));
		else answers[id] = picked("Unresolved");
	}
	return answers;
}

/**
 * Gold's answer to the Canonical Form call: gold's headword, and each
 * member spelled as gold's Surface spells it, a member outside the
 * headword or fixed by the table as the request has it.
 */
export function goldWritten(goldCase: GrammarCase, input: unknown): unknown {
	const { ideal } = goldCase;
	const request = input as {
		members: readonly {
			member: string;
			text: string;
			orthography: string;
		}[];
		fixedMembers?: Readonly<Record<string, string>>;
		outsideHeadword?: readonly string[];
	};
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
	const gender = (lemma.coreFeatures as Values).gender;
	return {
		canonicalForm: lemma.canonicalForm,
		members,
		...(lemma.family === "Lexeme" && lemma.kind === "NOUN"
			? { article: articleOfGender[String(gender)] ?? "none" }
			: {}),
	};
}
