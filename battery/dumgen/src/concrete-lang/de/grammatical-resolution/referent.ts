import type { ChoiceQuestion } from "promptsmith/typesafe";
import type { SentenceContext } from "../../../types.js";
import { choice } from "../../../universal/questions.js";
import { authoredRealizations } from "../authored-closed-sets/realizations.js";
import { isParadigmCell } from "../authored-closed-sets/select.js";

/**
 * What the caller knows about the Text around the Encounter's Sentence. With
 * `MayAskForContext` the Sentence arrives alone although neighbours exist, so
 * resolution may answer MoreContextRequired. `MustAnswer` always picks a cell:
 * with the neighbouring Sentences when the caller supplies them, or from the
 * Sentence alone when it has none.
 */
export type ReferentMode =
	| { readonly mode: "MayAskForContext" }
	| { readonly mode: "MustAnswer"; readonly context?: SentenceContext };

/** The Core coordinates only a referent decides between: `sie` is her or them. */
export const referentKeys = ["gender", "number", "person", "polite"] as const;
export type ReferentCell = Readonly<
	Record<(typeof referentKeys)[number], string | null>
>;
type Grouped = {
	readonly group: string;
	readonly cell: ReferentCell;
	readonly en: readonly string[];
};

const key = (text: string) => text.normalize("NFC");
const cellKey = (cell: ReferentCell) =>
	referentKeys.map((name) => String(cell[name])).join("|");
const groupOf = (core: Readonly<Record<string, unknown>>) =>
	[core.case, core.pronType, core.extPos ?? null].map(String).join("|");

/**
 * Personal and demonstrative pillar cells whose spelling is shared by another
 * cell of the same case and subtype: accusative `sie` (Fem Sing or Plur),
 * genitive `ihrer`, `ihm`, `seiner`, `dem`, `dessen`, and sentence-initial
 * `Sie`, which may also be formal address. Relative pronouns are left out:
 * their antecedent is in their own Sentence. Grammar tells apart cells of a
 * different case, such as dative `ihr` and nominative `ihr`.
 */
function sharedCells(spellings: readonly string[]): readonly Grouped[] {
	const seen = new Map<string, Grouped>();
	for (const { member, spelled, inflection } of authoredRealizations) {
		const core = member.lemma.coreFeatures as Record<string, unknown>;
		if (
			member.lemma.kind !== "PRON" ||
			inflection ||
			!isParadigmCell(member.lemma) ||
			(core.pronType !== "Prs" && core.pronType !== "Dem") ||
			!spellings.includes(key(spelled))
		)
			continue;
		const cell = Object.fromEntries(
			referentKeys.map((name) => [name, (core[name] ?? null) as string]),
		) as ReferentCell;
		const id = `${groupOf(core)}#${cellKey(cell)}`;
		const prior = seen.get(id);
		seen.set(id, {
			group: groupOf(core),
			cell,
			en: [
				...new Set([
					...(prior?.en ?? []),
					...(member.knowledge.translations?.en ?? []),
				]),
			],
		});
	}
	const counts = new Map<string, number>();
	for (const { group } of seen.values())
		counts.set(group, (counts.get(group) ?? 0) + 1);
	return [...seen.values()].filter(
		({ group }) => (counts.get(group) ?? 0) > 1,
	);
}

const personNames: Record<string, string> = {
	"1": "first person",
	"2": "second person",
	"3": "third person",
};
const genderNames: Record<string, string> = {
	Masc: "masculine",
	Fem: "feminine",
	Neut: "neuter",
};
function describe(cell: ReferentCell, en: readonly string[]): string {
	const grammar =
		cell.polite === "Form"
			? "formal address (Sie, Ihnen, Ihrer): speaks to one or more people formally"
			: [
					cell.person ? personNames[cell.person] : "demonstrative",
					cell.number === "Plur" ? "plural" : "singular",
					cell.gender ? genderNames[cell.gender] : null,
				]
					.filter(Boolean)
					.join(" ") +
				(cell.number === "Plur"
					? ": stands for several people or things"
					: cell.gender
						? `: stands for one ${genderNames[cell.gender]} noun or person`
						: "");
	return en.length ? `${grammar} (${en.join(", ")})` : grammar;
}

export type ReferentChoice = {
	/** Cell options keyed like the question's criteria, `cell_0` onwards. */
	readonly cells: Readonly<Record<string, ReferentCell>>;
	/** The case, subtype and extPos groups whose cells only a referent tells apart. */
	readonly groups: ReadonlySet<string>;
	readonly question: ChoiceQuestion;
	/** State the judgment reads: the cells and, when supplied, the neighbours. */
	readonly state: Readonly<Record<string, unknown>>;
};

/**
 * The referent question for a PRON target whose spelling several cells share,
 * or null. A sentence-initial capital may be formal Sie or ordinary
 * capitalization, and a lowercase sie may be formal Sie misspelled, so both
 * spellings count there. Only a capital inside the sentence is formal alone.
 */
export function referentChoice(
	spelled: string,
	sentenceInitial: boolean,
	mode: ReferentMode,
): ReferentChoice | null {
	const lowered =
		spelled.slice(0, 1).toLocaleLowerCase("de") + spelled.slice(1);
	const capitalized =
		spelled.slice(0, 1).toLocaleUpperCase("de") + spelled.slice(1);
	const shared = sharedCells(
		sentenceInitial || spelled === lowered
			? [key(lowered), key(capitalized)]
			: [key(spelled)],
	);
	if (!shared.length) return null;
	const options = new Map<string, { cell: ReferentCell; en: string[] }>();
	for (const { cell, en } of shared) {
		const prior = options.get(cellKey(cell));
		options.set(cellKey(cell), {
			cell,
			en: [...new Set([...(prior?.en ?? []), ...en])],
		});
	}
	const cells = Object.fromEntries(
		[...options.values()].map(({ cell }, index) => [`cell_${index}`, cell]),
	);
	const criteria: Record<string, string> = Object.fromEntries(
		[...options.values()].map(({ cell, en }, index) => [
			`cell_${index}`,
			describe(cell, en),
		]),
	);
	const task =
		"`members` is a form several pronoun cells share, and they differ only in what the pronoun refers to. Which cell is it in `markedContext`? Use everything the sentence shows: an antecedent anywhere inside it, also in another clause (Das Kind weint, also gebe ich ihm ein Bonbon), the verb's agreement, an address such as Herr Meier, a mid-sentence capital Sie. A pronoun that takes up a noun takes that noun's grammatical gender and number, also for a thing: after Der Plan ist riskant, dem is masculine.";
	const context = mode.mode === "MustAnswer" ? mode.context : undefined;
	const instructions =
		mode.mode === "MayAskForContext"
			? `${task} The Text goes on beyond this sentence, but you see only this sentence. Choose MoreContextRequired only when the sentence's grammar fits more than one of these cells and only a referent outside it could decide, as in Ich sehe sie or Ich traue dem nicht. A subject's verb decides its number: Die gefällt mir and Nach dem Essen liest sie are singular, Die gefallen mir is plural. Any other doubt about the analysis is never a reason to choose it.`
			: context
				? `${task} \`referentContext.before\` and \`referentContext.after\` are the sentences just before and after it in its Text; look for what the pronoun refers to there too. If the referent is still unclear, choose the cell a reader would most likely take.`
				: `${task} This sentence is the whole Text: nothing comes before or after it. If it does not settle the referent, choose the cell a reader would most likely take.`;
	if (mode.mode === "MayAskForContext")
		criteria.MoreContextRequired =
			"Only the referent decides, and it is outside this sentence: nothing in it tells these cells apart";
	return {
		cells,
		groups: new Set(shared.map(({ group }) => group)),
		question: choice(instructions, criteria),
		state: {
			referentCells: cells,
			...(context
				? {
						referentContext: {
							...(context.before
								? { before: context.before }
								: {}),
							...(context.after ? { after: context.after } : {}),
						},
					}
				: {}),
		},
	};
}

/** Whether judged Core lands in one of the groups whose cells a referent splits. */
export function inReferentGroup(
	referent: ReferentChoice,
	core: Readonly<Record<string, unknown>>,
): boolean {
	return core.poss !== "Yes" && referent.groups.has(groupOf(core));
}
