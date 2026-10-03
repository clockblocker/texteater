/**
 * The Lemma of a closed-class one-piece unit, built from the identity
 * intake stored with it (#864) and dumspec's Authored Inventory (ADR
 * 0021): no Luna call and no identity question. The authored members of
 * that identity whose spellings match the member leave a set of cells; one
 * cell needs no question, and several get one Choice over the cells. A
 * pronoun form whose cells only its referent tells apart reads the
 * neighbouring Sentences and may attest the form's Syncretism (ADR 0044,
 * ADR 0046). An identity no authored member realizes is a Catalog Miss.
 */
import { foldCase, lemmaIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import {
	type AuthoredMember,
	type AuthoredRealization,
	authoredMembers,
	authoredRealizations,
} from "dumspec/inventories";
import type { ClosedClassIdentity } from "../../segment/segmented-sentence.js";
import type { NeighbourSentences } from "../types.js";
import { attestedMember } from "./member-spelling.js";
import { fill, question } from "./prompts.js";
import { Questionnaire } from "./questions.js";
import {
	fixedSpelling,
	joinMembers,
	type Member,
	type Target,
} from "./target.js";

type Core = Readonly<Record<string, unknown>>;
type Cell = Readonly<Record<string, string | null>>;

/** One answer the cell question can give: an authored member with the spelling it matched. */
export type ClosedOption = {
	readonly member: AuthoredMember;
	readonly realization: AuthoredRealization;
	/** The Surface cell a stem's spelling marks; none for a pillar cell. */
	readonly cell: Cell | undefined;
};

const coreOf = (member: AuthoredMember): Core => member.lemma.coreFeatures;
const isSyncretism = (member: AuthoredMember) =>
	(member.lemma as { syncretic?: unknown }).syncretic !== undefined;

/** Whether an authored member has the stored identity, its Canonical Form compared without case. */
function hasIdentity(member: AuthoredMember, identity: ClosedClassIdentity) {
	const core = coreOf(member);
	return (
		member.lemma.family === "Lexeme" &&
		member.lemma.kind === identity.kind &&
		foldCase(member.lemma.canonicalForm, "de") ===
			foldCase(identity.canonicalForm, "de") &&
		(core.pronType ?? null) === identity.pronType &&
		(core.poss === "Yes") === (identity.poss === "Yes")
	);
}

/**
 * The authored realizations of the identity whose spelling is the
 * member's. An exact spelling decides, since a capital inside the Sentence
 * says something (formal Sie); at the Sentence's start, or when nothing
 * matches exactly, spellings are compared without case.
 */
export function matchingRealizations(
	identity: ClosedClassIdentity,
	member: Member,
	opensSentence: boolean,
): readonly AuthoredRealization[] {
	const ofIdentity = authoredRealizations.filter(
		(realization) =>
			!isSyncretism(realization.member) &&
			hasIdentity(realization.member, identity),
	);
	// A clitic's apostrophe is no part of its authored spelling: 's is s.
	const texts = new Set([member.text, member.text.replace(/^['’]/u, "")]);
	const foldedTexts = new Set([...texts].map((text) => foldCase(text, "de")));
	const exact = ofIdentity.filter(({ spelled }) => texts.has(spelled));
	const folded = ofIdentity.filter(({ spelled }) =>
		foldedTexts.has(foldCase(spelled, "de")),
	);
	if (exact.length === 0 && folded.length === 0)
		return typoRealizations(ofIdentity, foldCase(member.text, "de"));
	if (exact.length === 0) return folded;
	return opensSentence ? folded : exact;
}

/** Edit distance with adjacent transpositions (ihc is one edit from ich). */
function editDistance(left: string, right: string): number {
	const rows = Array.from({ length: left.length + 1 }, (_, i) =>
		Array.from({ length: right.length + 1 }, (_, j) =>
			i === 0 ? j : j === 0 ? i : 0,
		),
	);
	for (let i = 1; i <= left.length; i++)
		for (let j = 1; j <= right.length; j++) {
			const row = rows[i] as number[];
			const above = rows[i - 1] as number[];
			const cost = left[i - 1] === right[j - 1] ? 0 : 1;
			row[j] = Math.min(
				(above[j] ?? 0) + 1,
				(row[j - 1] ?? 0) + 1,
				(above[j - 1] ?? 0) + cost,
			);
			if (
				i > 1 &&
				j > 1 &&
				left[i - 1] === right[j - 2] &&
				left[i - 2] === right[j - 1]
			)
				row[j] = Math.min(
					row[j] ?? 0,
					((rows[i - 2] as number[])[j - 2] ?? 0) + 1,
				);
		}
	return (rows[left.length] as number[])[right.length] ?? 0;
}

/**
 * A member no spelling of its stored identity matches, one edit from
 * exactly one of them (disem for diesem, ihc for ich), is a Typo of that
 * spelling (Rule de/member-orthography); its realizations come back marked
 * so the member is attested as Typo.
 */
function typoRealizations(
	ofIdentity: readonly AuthoredRealization[],
	text: string,
): readonly AuthoredRealization[] {
	if (text.length < 3) return [];
	const near = ofIdentity.filter(
		({ spelled }) => editDistance(foldCase(spelled, "de"), text) === 1,
	);
	const spellings = new Set(
		near.map(({ spelled }) => foldCase(spelled, "de")),
	);
	if (spellings.size !== 1) return [];
	return near.map(
		(realization) =>
			({
				...realization,
				orthography: "Typo",
			}) as unknown as AuthoredRealization,
	);
}

/**
 * The authored realizations of a multi-piece DET or PRON unit's route
 * whose spelling is its members' words joined (ein wenig, was für ein):
 * such a unit carries no identity, and its joined spelling names it.
 */
export function joinedRealizations(
	target: Target,
	joined: string,
): readonly AuthoredRealization[] {
	const { family, kind } = target.route;
	return authoredRealizations.filter(
		(realization) =>
			!isSyncretism(realization.member) &&
			realization.member.lemma.family === family &&
			realization.member.lemma.kind === kind &&
			foldCase(realization.spelled, "de") === foldCase(joined, "de"),
	);
}

/** The distinct cells the realizations leave, each with the realization it came from. */
export function closedOptions(
	realizations: readonly AuthoredRealization[],
	text: string,
): readonly ClosedOption[] {
	const options = new Map<string, ClosedOption>();
	// An exact spelling and a Canonical one come first, so they stand for their cell.
	const ordered = [...realizations].sort(
		(left, right) =>
			Number(right.spelled === text) - Number(left.spelled === text) ||
			Number((right.spelling?.kind ?? "Canonical") === "Canonical") -
				Number((left.spelling?.kind ?? "Canonical") === "Canonical"),
	);
	for (const realization of ordered) {
		const cell = realization.inflection as Cell | undefined;
		const key = JSON.stringify([
			lemmaIdentityKey(realization.member.lemma),
			cell ?? null,
		]);
		if (!options.has(key))
			options.set(key, { member: realization.member, realization, cell });
	}
	return [...options.values()];
}

/** The features only a referent tells apart (ADR 0044). */
const referentFeatures = ["gender", "number", "polite"] as const;

/** The values two options differ in, Core and Surface cell together. */
function differences(left: ClosedOption, right: ClosedOption): Set<string> {
	const differing = new Set<string>();
	const leftValues = { ...coreOf(left.member), ...left.cell };
	const rightValues = { ...coreOf(right.member), ...right.cell };
	for (const key of new Set([
		...Object.keys(leftValues),
		...Object.keys(rightValues),
	]))
		if (
			JSON.stringify(leftValues[key] ?? null) !==
			JSON.stringify(rightValues[key] ?? null)
		)
			differing.add(key);
	return differing;
}

/**
 * Whether some two pronoun options differ only in what a referent decides
 * (ADR 0044). A determiner's cell is its noun's, which grammar settles.
 */
export function referentDecides(options: readonly ClosedOption[]): boolean {
	if (options.some(({ member }) => member.lemma.kind !== "PRON"))
		return false;
	return options.some((left, index) =>
		options.slice(index + 1).some((right) => {
			const differing = [...differences(left, right)];
			return (
				differing.length > 0 &&
				differing.every((key) =>
					(referentFeatures as readonly string[]).includes(key),
				)
			);
		}),
	);
}

/**
 * The generated Syncretisms (ADR 0046) whose units are all among the
 * options' pillar cells: each is an answer that leaves the referent open.
 */
export function syncretismOptions(
	options: readonly ClosedOption[],
): readonly AuthoredMember[] {
	const cells = new Set(
		options
			.filter(({ cell }) => cell === undefined)
			.map(({ member }) => lemmaIdentityKey(member.lemma)),
	);
	return authoredMembers.filter((member) => {
		const units = (member.lemma as { syncretized?: Dumling.Lemma[] })
			.syncretized;
		return (
			isSyncretism(member) &&
			units !== undefined &&
			units.every((unit) => cells.has(lemmaIdentityKey(unit)))
		);
	});
}

const caseNames: Readonly<Record<string, string>> = {
	Nom: "nominative",
	Acc: "accusative",
	Dat: "dative",
	Gen: "genitive",
};
const genderNames: Readonly<Record<string, string>> = {
	Masc: "masculine",
	Fem: "feminine",
	Neut: "neuter",
};

/** How an option reads to the judge: its form, its coordinates and its English glosses. */
function describe(member: AuthoredMember, cell: Cell | undefined): string {
	const values = { ...coreOf(member), ...cell };
	const coordinates = [
		values.case ? caseNames[String(values.case)] : undefined,
		values.number === "Sing"
			? "singular"
			: values.number === "Plur"
				? "plural"
				: undefined,
		values.gender ? genderNames[String(values.gender)] : undefined,
		values.person ? `person ${String(values.person)}` : undefined,
		values.polite === "Form" ? "formal address" : undefined,
	].filter(Boolean);
	const glosses = member.knowledge.translations?.en ?? [];
	return `${member.lemma.canonicalForm}${coordinates.length ? `: ${coordinates.join(", ")}` : ""}${glosses.length ? ` (${glosses.join(", ")})` : ""}`;
}

/** The cell question: its options keyed `o0`, …, `s0`, …, and the answers they stand for. */
export function cellQuestion(
	lemma: string,
	reference: string,
	options: readonly ClosedOption[],
	neighbours: NeighbourSentences,
) {
	const questionnaire = new Questionnaire();
	const referent = referentDecides(options);
	const syncretisms = referent ? syncretismOptions(options) : [];
	const criteria: Record<string, string> = {};
	for (const [index, option] of options.entries())
		criteria[`o${index}`] = describe(option.member, option.cell);
	for (const [index, syncretism] of syncretisms.entries()) {
		const units =
			(syncretism.lemma as { syncretized?: AuthoredMember["lemma"][] })
				.syncretized ?? [];
		criteria[`s${index}`] = fill(question.cellOpen, {
			cells: units
				.map((unit) => {
					const authored = authoredMembers.find(
						(candidate) =>
							lemmaIdentityKey(candidate.lemma) ===
							lemmaIdentityKey(unit),
					);
					return authored
						? describe(authored, undefined)
						: unit.canonicalForm;
				})
				.join(" or "),
		});
	}
	questionnaire.choice(
		"cell",
		fill(question.cell, { lemma, m: reference }),
		criteria,
		referent ? ["referent"] : ["identity"],
	);
	return {
		questionnaire,
		/** Neighbours go only to a question the referent decides (ADR 0044). */
		neighbours:
			referent && (neighbours.before || neighbours.after)
				? {
						...(neighbours.before
							? { before: neighbours.before }
							: {}),
						...(neighbours.after
							? { after: neighbours.after }
							: {}),
					}
				: undefined,
		answerOf(choice: string): ClosedOption | AuthoredMember | undefined {
			if (choice.startsWith("o")) return options[Number(choice.slice(1))];
			if (choice.startsWith("s"))
				return syncretisms[Number(choice.slice(1))];
			return undefined;
		},
	};
}

/**
 * The possessor features a possessive stem's Surface marks, from its stem
 * alone (ADR 0044): sein- serves a masculine or neuter singular possessor,
 * mein- and dein- a singular one, unser- and euer- a plural one, and ihr-
 * and formal Ihr- show neither.
 */
function possessorFeatures(lemma: Dumling.Lemma): Cell {
	const stem = lemma.canonicalForm;
	const none = { "gender[psor]": null, "number[psor]": null };
	if (/^sein/u.test(stem))
		return {
			"gender[psor]": ["Masc", "Neut"] as unknown as string,
			"number[psor]": "Sing",
		};
	if (/^(?:mein|dein)/u.test(stem))
		return { "gender[psor]": null, "number[psor]": "Sing" };
	if (/^(?:unser|eu(?:e)?r)/u.test(stem))
		return { "gender[psor]": null, "number[psor]": "Plur" };
	return none;
}

/**
 * A stem's Surface features: the cell its spelling marks, nulls for the
 * rest. A Lexeme also marks possessor features and a DET its degree; a
 * Locution marks its cell alone.
 */
function stemInflection(option: ClosedOption): Cell {
	const { lemma } = option.member;
	if (lemma.family === "Locution")
		return { case: null, gender: null, number: null, ...option.cell };
	const possessive = coreOf(option.member).poss === "Yes";
	return {
		case: null,
		...(lemma.kind === "DET" ? { degree: null } : {}),
		gender: null,
		number: null,
		...(possessive
			? possessorFeatures(lemma)
			: { "gender[psor]": null, "number[psor]": null }),
		...option.cell,
	};
}

/**
 * The Attestation of a closed-class unit from the authored member the
 * click landed on: its Lemma, the authored spelling of its form (the word
 * a fused or shortened spelling stands for), and each member's
 * orthography as the fusion table and the inventory spell it.
 */
export function closedAttestation(
	target: Target,
	answer: ClosedOption | AuthoredMember,
	realization: AuthoredRealization,
): unknown {
	const option = "realization" in answer ? answer : undefined;
	const lemma = structuredClone(
		option ? option.member.lemma : (answer as AuthoredMember).lemma,
	);
	const pillar = option === undefined || option.cell === undefined;
	const one = target.members.length === 1;
	const members = target.members.map((member) => {
		// The fusion table knows the Segment; the inventory knows the spelling.
		const orthography =
			member.spelling?.orthography ??
			(one ? realization.orthography : undefined) ??
			"Standard";
		const readings = new Map<number, string>([
			[member.segment, realization.standsFor ?? lemma.canonicalForm],
		]);
		return attestedMember(
			target.segments,
			member.segment,
			orthography,
			readings,
		);
	});
	return {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			lemma,
			normalizedSurface: realization.standsFor ?? realization.spelled,
			spelling: realization.spelling ?? { kind: "Canonical" },
			surfaceFeatures: realization.historicalStatus
				? { historicalStatus: "Archaic" }
				: null,
			inflectionalFeatures:
				pillar || !option ? null : stemInflection(option),
		},
		members,
		realizationCoverage: "Full",
		...(lemma.family === "Lexeme" && lemma.kind === "PRON"
			? { articleEvidence: null }
			: {}),
	};
}

/**
 * The authored cells a DET or PRON unit's spelling realizes: a one-piece
 * unit's through the identity intake stored (#864), a multi-piece unit's
 * through its members' joined words, which name it alone (ein wenig).
 */
export function authoredOptions(
	target: Target,
	identity: ClosedClassIdentity | undefined,
): { readonly options: readonly ClosedOption[]; readonly lemma: string } {
	const [member, ...more] = target.members;
	if (!member) return { options: [], lemma: "" };
	if (more.length === 0) {
		if (!identity) return { options: [], lemma: "" };
		return {
			options: closedOptions(
				matchingRealizations(identity, member, target.opensSentence),
				member.text,
			),
			lemma: identity.canonicalForm,
		};
	}
	const joined = joinMembers(
		target.members.map((entry) => fixedSpelling(entry) ?? entry.text),
		target.glued,
	);
	return {
		options: closedOptions(joinedRealizations(target, joined), joined),
		lemma: joined,
	};
}
