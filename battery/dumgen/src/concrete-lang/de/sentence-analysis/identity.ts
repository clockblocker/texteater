/**
 * Closed-class identity candidates: every authored DET, PRON or AUX member a
 * spelling can realize, offered as per-cell rubric options whose mass is
 * summed per headword group (Dumgen ADR 0005, issue 509).
 */
import {
	abbreviationEntry,
	cliticEntry,
} from "../../../universal/fusion-table.js";
import type { AuthoredMember } from "../authored-closed-sets/member.js";
import { authoredRealizations } from "../authored-closed-sets/realizations.js";
import { germanFusionTable } from "../fusion-entries.js";
import type { IdentityCandidate } from "./analysis.js";

const key = (text: string) => text.normalize("NFC").toLowerCase();

const bySpelling = new Map<string, AuthoredMember[]>();
for (const realization of authoredRealizations) {
	const spelled = key(realization.spelled);
	const members = bySpelling.get(spelled) ?? [];
	if (!members.includes(realization.member)) members.push(realization.member);
	bySpelling.set(spelled, members);
}

const core = (member: AuthoredMember) =>
	member.lemma.coreFeatures as Record<string, unknown>;

/** The surfaces a spelling stands for: a table clitic's or abbreviation's, else itself. */
function surfacesOf(text: string): readonly string[] {
	const entry =
		abbreviationEntry(germanFusionTable, text) ??
		cliticEntry(germanFusionTable, text);
	if (!entry) return [text];
	return typeof entry.surface === "string" ? [entry.surface] : entry.surface;
}

/** Every authored member this spelling can realize, in a stable order; `'s` realizes es and das. */
export function candidatesFor(text: string): AuthoredMember[] {
	const members = new Set(
		surfacesOf(text).flatMap(
			(surface) => bySpelling.get(key(surface)) ?? [],
		),
	);
	return [...members].sort((a, b) =>
		`${a.lemma.kind} ${a.lemma.canonicalForm} ${JSON.stringify(a.lemma.coreFeatures)} ${a.knowledge.definition}`.localeCompare(
			`${b.lemma.kind} ${b.lemma.canonicalForm} ${JSON.stringify(b.lemma.coreFeatures)} ${b.knowledge.definition}`,
		),
	);
}

/** Members that share Kind, headword and pronType: the cell stays a grammar question. */
export function headwordGroups(
	candidates: readonly AuthoredMember[],
): AuthoredMember[][] {
	const groups = new Map<string, AuthoredMember[]>();
	for (const member of candidates) {
		const groupKey = candidateKey(member);
		const group = groups.get(groupKey) ?? [];
		group.push(member);
		groups.set(groupKey, group);
	}
	return [...groups.values()];
}

export function candidateKey(member: AuthoredMember): string {
	return `${member.lemma.kind}:${member.lemma.canonicalForm}:${String(core(member).pronType ?? "")}`;
}

/** The first candidate surface that realizes an authored member the predicate accepts. */
export function surfaceRealizing(
	surfaces: readonly string[],
	accepts: (member: AuthoredMember) => boolean,
): string | undefined {
	return surfaces.find((surface) =>
		(bySpelling.get(key(surface)) ?? []).some(accepts),
	);
}

export function candidateOf(
	group: readonly AuthoredMember[],
): IdentityCandidate {
	const first = group[0];
	if (!first) throw Error("A headword group has at least one member");
	const pronType = core(first).pronType;
	return {
		key: candidateKey(first),
		kind: first.lemma.kind as IdentityCandidate["kind"],
		headword: first.lemma.canonicalForm,
		pronType: typeof pronType === "string" ? pronType : null,
		cells: group.map((member) =>
			Object.entries(member.lemma.coreFeatures)
				.filter(
					([name, value]) => value !== null && name !== "pronType",
				)
				.map(([name, value]) => `${name}=${String(value)}`)
				.join(" "),
		),
		definition: first.knowledge.definition ?? "",
	};
}

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

/** The cell in the syntactic terms the sentence shows. */
function describeCell(member: AuthoredMember): string {
	const features = core(member);
	const parts: string[] = [];
	if (typeof features.case === "string")
		parts.push(caseUse[features.case] ?? features.case);
	const number =
		features.number === "Sing"
			? "singular"
			: features.number === "Plur"
				? "plural"
				: null;
	const gender =
		typeof features.gender === "string"
			? genderNames[features.gender]
			: null;
	if (number || gender)
		parts.push(
			`agreement ${[number, gender].filter(Boolean).join(" ")}${
				gender ? "" : number === "plural" ? " (any gender)" : ""
			}`,
		);
	if (typeof features.person === "string")
		parts.push(
			`${features.person}${features.person === "1" ? "st" : features.person === "2" ? "nd" : "rd"} person`,
		);
	if (features.polite === "Form")
		parts.push(
			"formal address (Sie), one identity whether one or several people are addressed",
		);
	if (features.polite === "Infm") parts.push("informal address");
	if (features.referenceNumber === "Sing")
		parts.push("refers to one person or thing");
	if (features.referenceNumber === "Plur")
		parts.push("refers to several people or things");
	if (features.poss === "Yes") parts.push("possessive");
	if (features.extPos === "DET")
		parts.push(
			"used attributively before a following noun (dessen Haus), not standing alone",
		);
	if (features.definite === "Def") parts.push("definite article");
	if (features.definite === "Ind") parts.push("indefinite article");
	if (features["gender[psor]"])
		parts.push(
			`possessor is ${genderNames[String(features["gender[psor]"])] ?? features["gender[psor]"]}`,
		);
	return parts.length ? parts.join("; ") : "invariant, no cell to decide";
}

export function rubricOf(member: AuthoredMember) {
	const pronType = core(member).pronType;
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

export const identityInstructions = (index: number, text: string) =>
	`Which reviewed dictionary identity does occurrence <s${index}> "${text}" realize in \`sentence\`? The options are every authored determiner (DET), pronoun (PRON) and grammatical auxiliary (AUX) identity this spelling can realize. Read the whole sentence: the same spelling is an article before a noun, a standalone pronoun, or a relative pronoun after a comma. An AUX identity applies only when the word marks perfect, future or passive for another verb in the sentence; a copula, a possession verb or lexical werden is NoMatch. Choose NoMatch when the word is none of the listed identities here (an open-class word, a foreign word, or a use no option covers). Choose Unresolved only when the sentence cannot decide between two listed identities. Each option names its word class, headword, pronoun type, the grammatical cell it realizes with the syntactic role that cell has in a sentence, and its meaning. Decide the cell from the sentence: find what the word is the subject or object of, which preposition governs it, and which noun it agrees with or refers to. A determiner (DET) option applies only when the word directly modifies a following noun; a pronoun (PRON) option with the same headword applies when the word stands alone. A genitive cell is chosen only when the syntax is genitive.`;
