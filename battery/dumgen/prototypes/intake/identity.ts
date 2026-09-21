/**
 * Identity axis: closed-class identity selected from authored candidates.
 *
 * Code enumerates every authored DET, PRON and AUX member a spelling can
 * realize (`realizations.ts`), and one Choice per such occurrence picks the
 * member, with NoMatch and Unresolved as ways out. A closed-class word with no
 * enumerated candidate is a Miss: the realization table is missing something.
 * Identity implies route, so the selected member's Kind is compared with the
 * route the group vote gave the same occurrence.
 */
import { choice, type Questions } from "promptsmith/typesafe";
import type { AuthoredMember } from "../../src/concrete-lang/de/authored-closed-sets/member.js";
import { authoredRealizations } from "../../src/concrete-lang/de/authored-closed-sets/realizations.js";
import { sameValue } from "../../src/concrete-lang/de/authored-closed-sets/select.js";
import { isResolved, type Sentence, type Unit } from "./corpus.js";
import type { GoldSentence, IdentityProbe } from "./gold.js";

type Answers = Record<string, unknown>;
type ChoiceAnswer = {
	type: "choice";
	choice: string;
	confidence: number;
	probabilities: Record<string, number>;
};

const key = (text: string) => text.normalize("NFC").toLowerCase();

const bySpelling = new Map<string, AuthoredMember[]>();
for (const realization of authoredRealizations) {
	const spelled = key(realization.spelled);
	const members = bySpelling.get(spelled) ?? [];
	if (!members.includes(realization.member)) members.push(realization.member);
	bySpelling.set(spelled, members);
}

/** Every authored member this spelling can realize, in a stable order. */
export function candidatesFor(text: string): AuthoredMember[] {
	return [...(bySpelling.get(key(text)) ?? [])].sort((a, b) =>
		`${a.lemma.kind} ${a.lemma.canonicalForm} ${JSON.stringify(a.lemma.coreFeatures)} ${a.knowledge.definition}`.localeCompare(
			`${b.lemma.kind} ${b.lemma.canonicalForm} ${JSON.stringify(b.lemma.coreFeatures)} ${b.knowledge.definition}`,
		),
	);
}

function features(member: AuthoredMember): string {
	return Object.entries(member.lemma.coreFeatures)
		.filter(([, value]) => value !== null)
		.map(([name, value]) => `${name}=${String(value)}`)
		.join(" ");
}

/** A plain-language rubric per member: what kind of word, which headword, which cell, what it means. */
function rubric(member: AuthoredMember) {
	return {
		kind: member.lemma.kind,
		headword: member.lemma.canonicalForm,
		features: features(member) || "none",
		meaning: member.knowledge.definition,
	};
}

/**
 * The shape of the candidate list (issue 509).
 *
 * `authored` is the #489 shape: one option per authored member, its cell as
 * bare feature pairs. `headword` collapses the members to groups of Kind,
 * headword and pronType and leaves the cell to the grammar step. `rubric`
 * keeps one option per member but describes the cell in the syntactic terms
 * a judge can check against the sentence.
 */
export type IdentityShape = "authored" | "headword" | "rubric";

const pronTypeNames: Record<string, string> = {
	Prs: "personal",
	Dem: "demonstrative",
	Rel: "relative",
	Int: "interrogative",
	Neg: "negative",
	Ind: "indefinite",
	Tot: "universal",
	Art: "article",
	Rcp: "reciprocal",
	Exc: "exclamative",
	Emp: "emphatic",
};
const caseUse: Record<string, string> = {
	Nom: "nominative: the subject, or a predicate after sein/werden/bleiben",
	Acc: "accusative: the direct object, or after an accusative preposition (für, durch, ohne, gegen, um; in/an/auf with motion)",
	Dat: "dative: the indirect object, or after a dative preposition (mit, nach, bei, von, zu, aus, seit; in/an/auf with location)",
	Gen: "genitive: a possessor or complement of a genitive preposition (wegen, trotz, während)",
};
const genderNames: Record<string, string> = {
	Masc: "masculine",
	Fem: "feminine",
	Neut: "neuter",
};

/** The cell in the syntactic terms the sentence shows, for the `rubric` shape. */
function describeCell(member: AuthoredMember): string {
	const core = member.lemma.coreFeatures as Record<string, unknown>;
	const parts: string[] = [];
	if (typeof core.case === "string")
		parts.push(caseUse[core.case] ?? core.case);
	const number =
		core.number === "Sing"
			? "singular"
			: core.number === "Plur"
				? "plural"
				: null;
	const gender =
		typeof core.gender === "string" ? genderNames[core.gender] : null;
	if (number || gender)
		parts.push(
			`agreement ${[number, gender].filter(Boolean).join(" ")}${
				gender ? "" : number === "plural" ? " (any gender)" : ""
			}`,
		);
	if (typeof core.person === "string")
		parts.push(
			`${core.person}${core.person === "1" ? "st" : core.person === "2" ? "nd" : "rd"} person`,
		);
	if (core.polite === "Form")
		parts.push(
			"formal address (Sie), one identity whether one or several people are addressed",
		);
	if (core.polite === "Infm") parts.push("informal address");
	if (core.referenceNumber === "Sing")
		parts.push("refers to one person or thing");
	if (core.referenceNumber === "Plur")
		parts.push("refers to several people or things");
	if (core.poss === "Yes") parts.push("possessive");
	if (core.extPos === "DET")
		parts.push(
			"used attributively before a following noun (dessen Haus), not standing alone",
		);
	if (core.definite === "Def") parts.push("definite article");
	if (core.definite === "Ind") parts.push("indefinite article");
	if (core["gender[psor]"])
		parts.push(
			`possessor is ${genderNames[String(core["gender[psor]"])] ?? core["gender[psor]"]}`,
		);
	return parts.length ? parts.join("; ") : "invariant, no cell to decide";
}

function rubricWithCell(member: AuthoredMember) {
	const pronType = (member.lemma.coreFeatures as Record<string, unknown>)
		.pronType;
	return {
		kind: member.lemma.kind,
		headword: member.lemma.canonicalForm,
		...(typeof pronType === "string"
			? { type: pronTypeNames[pronType] ?? pronType }
			: {}),
		cell: describeCell(member),
		meaning: member.knowledge.definition,
	};
}

/** Members that share Kind, headword and pronType: the cell stays a grammar question. */
export function headwordGroups(
	candidates: readonly AuthoredMember[],
): AuthoredMember[][] {
	const groups = new Map<string, AuthoredMember[]>();
	for (const member of candidates) {
		const pronType = (member.lemma.coreFeatures as Record<string, unknown>)
			.pronType;
		const key = `${member.lemma.kind} ${member.lemma.canonicalForm} ${String(pronType ?? "")}`;
		const group = groups.get(key) ?? [];
		group.push(member);
		groups.set(key, group);
	}
	return [...groups.values()];
}

function groupRubric(group: readonly AuthoredMember[]) {
	const first = group[0]!;
	const pronType = (first.lemma.coreFeatures as Record<string, unknown>)
		.pronType;
	const cells = group.map((member) => features(member)).filter(Boolean);
	return {
		kind: first.lemma.kind,
		headword: first.lemma.canonicalForm,
		...(typeof pronType === "string"
			? { type: pronTypeNames[pronType] ?? pronType }
			: {}),
		meaning: first.knowledge.definition,
		...(cells.length > 1
			? { cells: `${cells.length} grammatical cells, decided later` }
			: {}),
	};
}

const commonPrompt = (index: number, text: string) =>
	`Which reviewed dictionary identity does occurrence <s${index}> "${text}" realize in \`sentence\`? The options are every authored determiner (DET), pronoun (PRON) and grammatical auxiliary (AUX) identity this spelling can realize. Read the whole sentence: the same spelling is an article before a noun, a standalone pronoun, or a relative pronoun after a comma. An AUX identity applies only when the word marks perfect, future or passive for another verb in the sentence; a copula, a possession verb or lexical werden is NoMatch. Choose NoMatch when the word is none of the listed identities here (an open-class word, a foreign word, or a use no option covers). Choose Unresolved only when the sentence cannot decide between two listed identities.`;

const shapePrompt: Record<IdentityShape, string> = {
	authored:
		"Each option names its word class, headword, grammatical cell and meaning.",
	headword:
		"Each option names its word class, headword, pronoun type and meaning; the grammatical cell (case, number, gender) is not asked here and is decided later, so choose by word class and headword only. A determiner (DET) option applies only when the word directly modifies a following noun; the pronoun (PRON) option with the same spelling applies when the word stands alone.",
	rubric: "Each option names its word class, headword, pronoun type, the grammatical cell it realizes with the syntactic role that cell has in a sentence, and its meaning. Decide the cell from the sentence: find what the word is the subject or object of, which preposition governs it, and which noun it agrees with or refers to. A determiner (DET) option applies only when the word directly modifies a following noun; a pronoun (PRON) option with the same headword applies when the word stands alone. A genitive cell is chosen only when the syntax is genitive.",
};

function options(
	candidates: readonly AuthoredMember[],
	shape: IdentityShape,
): Record<string, unknown> {
	if (shape === "headword")
		return Object.fromEntries(
			headwordGroups(candidates).map((group, position) => [
				`c${position}`,
				groupRubric(group),
			]),
		);
	return Object.fromEntries(
		candidates.map((member, position) => [
			`c${position}`,
			shape === "rubric" ? rubricWithCell(member) : rubric(member),
		]),
	);
}

export function identityQuestions(
	sentence: Sentence,
	shape: IdentityShape = "authored",
): Questions {
	const questions: Questions = {};
	for (const index of sentence.resolvable) {
		const text = sentence.segments[index]?.text ?? "";
		const candidates = candidatesFor(text);
		if (!candidates.length) continue;
		questions[`id_${index}`] = choice(
			`${commonPrompt(index, text)} ${shapePrompt[shape]}`,
			{
				...options(candidates, shape),
				NoMatch:
					"None of the listed identities is this word in this sentence",
				Unresolved:
					"The sentence cannot decide between listed identities",
			},
		);
	}
	return questions;
}

/** Option count per identity question under a shape. */
export function optionCount(text: string, shape: IdentityShape): number {
	const candidates = candidatesFor(text);
	return shape === "headword"
		? headwordGroups(candidates).length
		: candidates.length;
}

export type Identity =
	| {
			readonly status: "Selected";
			/** The selected member, or the first member of the selected headword group. */
			readonly member: AuthoredMember;
			/** Every member the selection covers; one for per-cell shapes. */
			readonly group: readonly AuthoredMember[];
	  }
	| { readonly status: "NoMatch" | "Unresolved" }
	| { readonly status: "Miss" };

export function solveIdentity(
	sentence: Sentence,
	answers: Answers,
	shape: IdentityShape = "authored",
): Map<number, Identity> {
	const identities = new Map<number, Identity>();
	for (const index of sentence.resolvable) {
		const candidates = candidatesFor(sentence.segments[index]?.text ?? "");
		if (!candidates.length) {
			identities.set(index, { status: "Miss" });
			continue;
		}
		const answer = answers[`id_${index}`] as ChoiceAnswer | undefined;
		if (!answer || answer.type !== "choice") {
			identities.set(index, { status: "Unresolved" });
			continue;
		}
		if (answer.choice === "NoMatch" || answer.choice === "Unresolved") {
			identities.set(index, { status: answer.choice });
			continue;
		}
		const position = Number(answer.choice.slice(1));
		const group =
			shape === "headword"
				? headwordGroups(candidates)[position]
				: candidates[position]
					? [candidates[position]!]
					: undefined;
		identities.set(
			index,
			group?.[0]
				? { status: "Selected", member: group[0], group }
				: { status: "Unresolved" },
		);
	}
	return identities;
}

const closedRoutes = new Set(["DET", "PRON"]);

/** `keiner` and `kein`, `mancher` and `manch` share a stem: the DET twin of a standalone form. */
const stem = (form: string) =>
	form.toLowerCase().replace(/(er|es|em|en|e)$/u, "");

export type IdentityScore = {
	readonly id: string;
	readonly kind: IdentityProbe["kind"];
	/** Exact authored Lemma (headword and every core feature). */
	readonly pass: boolean;
	/** Kind and headword only; the cell may differ. */
	readonly headwordPass: boolean;
	readonly expected: string;
	readonly actual: string;
	readonly candidates: number;
};

function label(identity: Identity | undefined): string {
	if (!identity) return "none";
	if (identity.status !== "Selected") return identity.status;
	return `${identity.member.lemma.kind} ${identity.member.lemma.canonicalForm} ${features(identity.member)}`;
}

/**
 * Identity accuracy against lemma gold, Kind agreement with the unit route,
 * and the Miss rate over the occurrences the route vote called closed-class.
 */
export function reportIdentity(
	pairs: readonly {
		sentence: Sentence | GoldSentence;
		units: ReadonlyMap<number, Unit> | null;
		identities: ReadonlyMap<number, Identity> | null;
	}[],
	shape: IdentityShape = "authored",
) {
	const scores: IdentityScore[] = [];
	const byKind: Record<
		string,
		{ cases: number; passed: number; headwordPassed: number }
	> = {};
	/** Gold PRON, selected the DET with the same headword stem (or the reverse). */
	let detTwin = 0;
	/** Gold Unresolved (a paradigm hole), but something was selected. */
	let genitiveHole = 0;
	let wrongCellOnly = 0;
	let optionTotal = 0;
	let optionQuestions = 0;
	const disagreement: Record<string, number> = {};
	let selected = 0;
	let selectedInRoutedUnit = 0;
	let disagree = 0;
	let closedRouted = 0;
	let misses = 0;
	const missing: Record<string, number> = {};
	const clickKinds: Record<string, number> = {};
	let occurrencesWithCandidates = 0;
	let occurrences = 0;

	for (const { sentence, units, identities } of pairs) {
		for (const index of sentence.resolvable) {
			occurrences += 1;
			const identity = identities?.get(index);
			if (identity && identity.status !== "Miss") {
				occurrencesWithCandidates += 1;
				optionQuestions += 1;
				optionTotal += optionCount(
					sentence.segments[index]?.text ?? "",
					shape,
				);
			}
			const unit = units?.get(index);
			const route = isResolved(unit) ? unit.kind : null;
			if (route && closedRoutes.has(route)) {
				closedRouted += 1;
				if (!identity || identity.status === "Miss") {
					misses += 1;
					const text = key(sentence.segments[index]?.text ?? "");
					missing[text] = (missing[text] ?? 0) + 1;
				}
			}
			if (identity?.status === "Selected") {
				selected += 1;
				if (!route) continue;
				selectedInRoutedUnit += 1;
				const kind = identity.member.lemma.kind;
				const text = key(sentence.segments[index]?.text ?? "");
				const grouped =
					isResolved(unit) && unit.memberSegmentIndices.length > 1;
				const verbal =
					route === "VERB" ||
					route === "Idiom" ||
					route === "Collocation";
				// A non-head member inherits its unit's route: an article in
				// NOUN, an auxiliary, expletive es or required sich in VERB,
				// any closed-class word inside a Phraseme.
				const consistent =
					kind === route ||
					(grouped &&
						((kind === "AUX" && verbal) ||
							(kind === "PRON" &&
								verbal &&
								(text === "es" || text === "sich")) ||
							(kind === "DET" && route === "NOUN") ||
							route === "Idiom" ||
							route === "Collocation" ||
							route === "Proverb" ||
							route === "Aphorism" ||
							route === "DiscourseFormula"));
				if (!consistent) {
					disagree += 1;
					const pair = `${kind}->${route}`;
					disagreement[pair] = (disagreement[pair] ?? 0) + 1;
				}
			}
		}
		if ("identity" in sentence)
			for (const probe of sentence.identity) {
				const identity = identities?.get(probe.index);
				const candidates = candidatesFor(
					sentence.segments[probe.index]?.text ?? "",
				).length;
				const gold = probe.gold;
				const pass =
					gold === "Unresolved"
						? !identity || identity.status !== "Selected"
						: identity?.status === "Selected" &&
							identity.group.some(
								(member) =>
									member.lemma.canonicalForm ===
										gold.canonicalForm &&
									sameValue(
										member.lemma.coreFeatures,
										gold.coreFeatures,
									),
							);
				const headwordPass =
					gold === "Unresolved"
						? pass
						: identity?.status === "Selected" &&
							identity.member.lemma.kind === probe.kind &&
							identity.member.lemma.canonicalForm ===
								gold.canonicalForm;
				if (gold === "Unresolved" && identity?.status === "Selected")
					genitiveHole += 1;
				if (headwordPass && !pass) wrongCellOnly += 1;
				if (
					gold !== "Unresolved" &&
					identity?.status === "Selected" &&
					identity.member.lemma.kind !== probe.kind &&
					((identity.member.lemma.kind === "DET" &&
						probe.kind === "PRON") ||
						(identity.member.lemma.kind === "PRON" &&
							probe.kind === "DET")) &&
					stem(identity.member.lemma.canonicalForm) ===
						stem(gold.canonicalForm)
				)
					detTwin += 1;
				scores.push({
					id: probe.id,
					kind: probe.kind,
					pass,
					headwordPass,
					expected:
						probe.gold === "Unresolved"
							? "Unresolved"
							: `${probe.kind} ${probe.gold.canonicalForm} ${Object.entries(
									probe.gold.coreFeatures,
								)
									.filter(([, value]) => value !== null)
									.map(
										([name, value]) =>
											`${name}=${String(value)}`,
									)
									.join(" ")}`,
					actual: label(identity),
					candidates,
				});
				const bucket = byKind[probe.kind] ?? {
					cases: 0,
					passed: 0,
					headwordPassed: 0,
				};
				byKind[probe.kind] = bucket;
				bucket.cases += 1;
				if (pass) bucket.passed += 1;
				if (headwordPass) bucket.headwordPassed += 1;
			}
		for (const probe of sentence.cases) {
			const identity = identities?.get(probe.clickedSegmentIndex);
			if (identity?.status !== "Selected") continue;
			const gold =
				(probe.idealOutput as { kind?: string }).kind ?? "Unresolved";
			const pair = `${identity.member.lemma.kind}->${gold}`;
			clickKinds[pair] = (clickKinds[pair] ?? 0) + 1;
		}
	}
	return {
		scores,
		summary: {
			identityShape: shape,
			identityCases: scores.length,
			identityPassed: scores.filter((score) => score.pass).length,
			identityHeadwordPassed: scores.filter((score) => score.headwordPass)
				.length,
			identityByKind: byKind,
			wrongCellOnly,
			detTwin,
			genitiveHole,
			optionsPerQuestion: +(optionTotal / (optionQuestions || 1)).toFixed(
				2,
			),
			occurrences,
			occurrencesWithCandidates,
			selected,
			selectedInRoutedUnit,
			kindDisagreesWithRoute: disagree,
			disagreementPairs: disagreement,
			closedRoutedOccurrences: closedRouted,
			closedRoutedWithoutCandidate: misses,
			missRate: +(misses / (closedRouted || 1)).toFixed(3),
			missingSpellings: Object.fromEntries(
				Object.entries(missing).sort((a, b) => b[1] - a[1]),
			),
			/** Selected identity Kind against the gold Kind of the clicked unit. */
			clickIdentityKindVersusGoldKind: clickKinds,
		},
	};
}
