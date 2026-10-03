/**
 * Answers `resolve.grammar`'s questions from a case's gold Attestation, as
 * a judge that is always right would: the stand-in answers a pricing pass
 * replays to find the follow-up requests a run would send, and the fake
 * answers the harness's tests run on. It reads gold only; no model.
 */
import { foldCase, lemmaIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import type { Question, Questions } from "promptsmith/typesafe";
import {
	authoredOptions,
	referentDecides,
	syncretismOptions,
} from "../../resolve/de/closed-class.js";
import { auxiliaryUses } from "../../resolve/de/prompts.js";
import { targetOf } from "../../resolve/de/target.js";
import type { Answer, Answers } from "../../segment/ask.js";
import type { Route } from "../../segment/segmented-sentence.js";
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
	"lassen 🫴": { voice: "Cau" },
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
	const target = targetOf(goldCase.sentence, unit, unit.route as Route);
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
	const syncretisms = referentDecides(options)
		? syncretismOptions(options)
		: [];
	const open = syncretisms.findIndex(
		(member) => lemmaIdentityKey(member.lemma) === lemmaKey,
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
	const { family } = ideal.surface.lemma;
	if (family !== "Locution" && family !== "Saying")
		return { canonicalForm: ideal.surface.lemma.canonicalForm, members };
	return {
		words: tiedWords(goldCase, request, members, outside),
		members,
	};
}

/** The longest run of letters two words share, case folded. */
function sharedRun(left: string, right: string): number {
	const a = foldCase(left, "de");
	const b = foldCase(right, "de");
	let best = 0;
	for (let i = 0; i < a.length; i++)
		for (let j = 0; j < b.length; j++) {
			let k = 0;
			while (a[i + k] !== undefined && a[i + k] === b[j + k]) k++;
			best = Math.max(best, k);
		}
	return best;
}

/**
 * Gold's Canonical Form tied to the members (`tied-headword.ts`): the
 * words a member's gold spelling spells (one word, several for a
 * shorthand, or a run of glued pieces) are that member; a word left over
 * cites the leftover member it shares the longest run of letters with (a
 * verb's infinitive its finite form), and any other is a missing word.
 */
function tiedWords(
	goldCase: GrammarCase,
	request: { members: readonly { member: string }[] },
	spelled: readonly string[],
	outside: ReadonlySet<string>,
): { member: string; text: string; comma: boolean }[] {
	const { unit, sentence, ideal } = goldCase;
	const target = targetOf(sentence, unit, unit.route as Route);
	const tokens = ideal.surface.lemma.canonicalForm
		.split(" ")
		.filter((token) => token !== "…")
		.map((token) => ({
			word: token.replace(/,$/u, ""),
			comma: token.endsWith(","),
		}));
	const free = request.members
		.map(({ member }) => Number(member.slice(1)))
		.filter((position) => !outside.has(`m${position}`));
	const used = new Set<number>();
	type Tied = { member: string; text: string; comma: boolean };
	const slots: (Tied[] | undefined)[] = tokens.map(() => undefined);
	const same = (left: string, right: string) =>
		foldCase(left, "de") === foldCase(right, "de");
	for (let at = 0; at < tokens.length; at++) {
		if (slots[at]) continue;
		for (const [index, start] of free.entries()) {
			if (used.has(start)) continue;
			// One member spelling one or more words.
			const words = (spelled[start] ?? "").split(" ");
			if (
				words.every((word, offset) =>
					same(word, tokens[at + offset]?.word ?? ""),
				)
			) {
				used.add(start);
				const last = tokens[at + words.length - 1];
				slots[at] = [
					{
						member: `m${start}`,
						text: "",
						comma: last?.comma ?? false,
					},
				];
				for (let offset = 1; offset < words.length; offset++)
					slots[at + offset] = [];
				break;
			}
			// A run of glued pieces spelling one word.
			let joined = "";
			const run: number[] = [];
			for (const position of free.slice(index)) {
				if (run.length > 0 && !target.glued.has(position)) break;
				if (used.has(position)) break;
				joined += spelled[position] ?? "";
				run.push(position);
				if (run.length > 1 && same(joined, tokens[at]?.word ?? "")) {
					for (const piece of run) used.add(piece);
					slots[at] = run.map((piece, offset) => ({
						member: `m${piece}`,
						text: "",
						comma:
							offset === run.length - 1 &&
							(tokens[at]?.comma ?? false),
					}));
					break;
				}
			}
			if (slots[at]) break;
		}
	}
	for (const [at, token] of tokens.entries()) {
		if (slots[at]) continue;
		const best = free
			.filter((position) => !used.has(position))
			.map((position) => ({
				position,
				run: sharedRun(spelled[position] ?? "", token.word),
			}))
			.sort((left, right) => right.run - left.run)[0];
		if (best && best.run >= 2) {
			used.add(best.position);
			slots[at] = [
				{
					member: `m${best.position}`,
					text: token.word,
					comma: token.comma,
				},
			];
		} else
			slots[at] = [{ member: "", text: token.word, comma: token.comma }];
	}
	// A missing word cites a member still left over, in order (die for eine).
	const spare = free.filter((position) => !used.has(position));
	for (const slot of slots) {
		const [word] = slot ?? [];
		if (!word || word.member !== "") continue;
		const position = spare.shift();
		if (position === undefined) break;
		word.member = `m${position}`;
	}
	return slots.flatMap((slot) => slot ?? []);
}
