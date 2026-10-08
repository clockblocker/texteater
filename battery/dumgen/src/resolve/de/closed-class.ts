/**
 * The Lemma of a closed-class one-piece unit, built from the identity
 * intake stored with it (#864) and dumcorpus's Authored Inventory (ADR
 * 0021): no Luna call and no identity question. The authored members of
 * that identity whose spellings match the member leave a set of cells; one
 * cell needs no question, and several get one Choice over the cells. A
 * pronoun form whose cells only its referent tells apart reads the
 * neighbouring Sentences and may attest the form's Syncretism (ADR 0044,
 * ADR 0046): a pillar's Lemma Syncretism (ihm), or a stem's Surface
 * Syncretism (jedem). An identity no authored member realizes is a Catalog
 * Miss.
 */

import {
	type AuthoredMember,
	type AuthoredRealization,
	authoredMembers,
	authoredRealizations,
	referentCanLeaveOpen,
	type StemSyncretism,
	stemSyncretisms,
} from "dumcorpus/inventories";
import {
	foldCase,
	isSyncreticUnit,
	isSyncretism,
	lemmaIdentityKey,
	syncretize,
} from "dumling";
import type * as Dumling from "dumling/types";
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

/** A closed route's Surface, as Dumling's generated types give it. */
type ClosedSurface = Dumling.Surface<
	"de",
	"Lexeme" | "Locution",
	"DET" | "PRON"
>;
/** The Surface features a closed Lexeme route inflects for. */
type Inflection<K extends "DET" | "PRON"> = NonNullable<
	Dumling.Surface<"de", "Lexeme", K>["inflectionalFeatures"]
>;
/** A DET or PRON Lexeme's Core Features; a Locution sets none. */
type Core = Partial<
	Dumling.Lemma<"de", "Lexeme", "DET" | "PRON">["coreFeatures"]
>;
/** The cell a stem's spelling marks: some of its case, number and gender, or a comparative's degree. */
type Cell = Partial<
	Pick<Inflection<"DET">, "case" | "degree" | "gender" | "number">
>;
/** The possessor features a possessive stem's Surface marks (ADR 0044). */
type Possessor = Pick<Inflection<"PRON">, "gender[psor]" | "number[psor]">;

/**
 * An authored realization a member's spelling matched. A near-miss spelling
 * comes back marked Typo (Rule de/member-orthography), which dumcorpus,
 * authoring no typos, never writes.
 */
export type MatchedRealization = Omit<AuthoredRealization, "orthography"> & {
	readonly orthography?: AuthoredRealization["orthography"] | "Typo";
};

/** One answer the cell question can give: an authored member with the spelling it matched. */
export type ClosedOption = {
	readonly member: AuthoredMember;
	readonly realization: MatchedRealization;
	/** The Surface cell a stem's spelling marks; none for a pillar cell. */
	readonly cell: Cell | undefined;
};

/** A closed member's Core Features; a Locution, or a member of another route, sets none. */
function coreOf({ lemma }: AuthoredMember): Core {
	return lemma.family === "Lexeme" &&
		(lemma.kind === "DET" || lemma.kind === "PRON")
		? lemma.coreFeatures
		: {};
}

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
): readonly MatchedRealization[] {
	const ofIdentity = authoredRealizations.filter(
		(realization) =>
			!isSyncreticUnit(realization.member.lemma) &&
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
	// The rows for left's prefixes one and two letters shorter.
	let twoAgo: readonly number[] = [];
	let above: readonly number[] = Array.from(
		{ length: right.length + 1 },
		(_, j) => j,
	);
	for (let i = 1; i <= left.length; i++) {
		const row = [i];
		for (let j = 1; j <= right.length; j++) {
			const cost = left[i - 1] === right[j - 1] ? 0 : 1;
			const edited = Math.min(
				(above[j] ?? 0) + 1,
				(row[j - 1] ?? 0) + 1,
				(above[j - 1] ?? 0) + cost,
			);
			const transposed =
				i > 1 &&
				j > 1 &&
				left[i - 1] === right[j - 2] &&
				left[i - 2] === right[j - 1];
			row.push(
				transposed
					? Math.min(edited, (twoAgo[j - 2] ?? 0) + 1)
					: edited,
			);
		}
		twoAgo = above;
		above = row;
	}
	return above[right.length] ?? 0;
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
): readonly MatchedRealization[] {
	if (text.length < 3) return [];
	const near = ofIdentity.filter(
		({ spelled }) => editDistance(foldCase(spelled, "de"), text) === 1,
	);
	const spellings = new Set(
		near.map(({ spelled }) => foldCase(spelled, "de")),
	);
	if (spellings.size !== 1) return [];
	return near.map(
		(realization): MatchedRealization => ({
			...realization,
			orthography: "Typo",
		}),
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
			!isSyncreticUnit(realization.member.lemma) &&
			realization.member.lemma.family === family &&
			realization.member.lemma.kind === kind &&
			foldCase(realization.spelled, "de") === foldCase(joined, "de"),
	);
}

/** The distinct cells the realizations leave, each with the realization it came from. */
export function closedOptions(
	realizations: readonly MatchedRealization[],
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
		const cell: Cell | undefined = realization.inflection;
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
const referentFeatures: ReadonlySet<string> = new Set([
	"gender",
	"number",
	"polite",
]);

/** The values two options differ in, Core and Surface cell together. */
function differences(left: ClosedOption, right: ClosedOption): Set<string> {
	const differing = new Set<string>();
	const leftValues: Readonly<Record<string, unknown>> = {
		...coreOf(left.member),
		...left.cell,
	};
	const rightValues: Readonly<Record<string, unknown>> = {
		...coreOf(right.member),
		...right.cell,
	};
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
				differing.every((key) => referentFeatures.has(key))
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
	return authoredMembers.filter(
		({ lemma }) =>
			isSyncretism(lemma) &&
			lemma.syncretized.every((unit) =>
				cells.has(lemmaIdentityKey(unit)),
			),
	);
}

/** A stem's generated Surface Syncretism (ADR 0046) and the options that are its units. */
export type StemOpenOption = {
	readonly syncretism: StemSyncretism;
	readonly units: readonly [ClosedOption, ClosedOption, ...ClosedOption[]];
};

/**
 * The generated Surface Syncretisms of a stem (ADR 0046) whose cells are
 * all among the options of its Lemma and spelling: each is an answer that
 * leaves the gender open (jedem, Masc or Neut). Standalone allem gets none:
 * it means "everything", and an open referent never attests alle's singular
 * Syncretisms (Rule de/standalone-alles-means-everything).
 */
export function stemSyncretismOptions(
	options: readonly ClosedOption[],
): readonly StemOpenOption[] {
	const open: StemOpenOption[] = [];
	for (const syncretism of stemSyncretisms.values()) {
		if (!referentCanLeaveOpen(syncretism)) continue;
		const lemma = lemmaIdentityKey(syncretism.member.lemma);
		const units = syncretism.cells.map((cell) =>
			options.find(
				(option) =>
					option.cell !== undefined &&
					lemmaIdentityKey(option.member.lemma) === lemma &&
					foldCase(option.realization.spelled, "de") ===
						syncretism.spelled &&
					JSON.stringify(option.realization.spelling ?? null) ===
						JSON.stringify(syncretism.spelling) &&
					(["case", "number", "gender"] as const).every(
						(key) => (option.cell?.[key] ?? null) === cell[key],
					),
			),
		);
		const [first, second, ...rest] = units;
		if (
			first &&
			second &&
			rest.every((unit): unit is ClosedOption => unit !== undefined)
		)
			open.push({ syncretism, units: [first, second, ...rest] });
	}
	return open;
}

/** An answer that leaves the referent open: a Lemma Syncretism or a stem's Surface one. */
export type OpenAnswer = AuthoredMember | StemOpenOption;

/** The answers that leave the referent open, Lemma Syncretisms first (ADR 0046). */
export function openOptions(
	options: readonly ClosedOption[],
): readonly OpenAnswer[] {
	if (!referentDecides(options)) return [];
	return [...syncretismOptions(options), ...stemSyncretismOptions(options)];
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
	const syncretisms = openOptions(options);
	const criteria: Record<string, string> = {};
	for (const [index, option] of options.entries())
		criteria[`o${index}`] = describe(option.member, option.cell);
	for (const [index, syncretism] of syncretisms.entries()) {
		const cells =
			"syncretism" in syncretism
				? syncretism.units.map((unit) =>
						describe(unit.member, unit.cell),
					)
				: (isSyncretism(syncretism.lemma)
						? syncretism.lemma.syncretized
						: []
					).map((unit) => {
						const authored = authoredMembers.find(
							(candidate) =>
								lemmaIdentityKey(candidate.lemma) ===
								lemmaIdentityKey(unit),
						);
						return authored
							? describe(authored, undefined)
							: unit.canonicalForm;
					});
		criteria[`s${index}`] = fill(question.cellOpen, {
			cells: cells.join(" or "),
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
		answerOf(choice: string): ClosedOption | OpenAnswer | undefined {
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
 * and formal Ihr- show neither. A stem that isn't possessive marks none.
 */
function possessorFeatures(
	lemma: Dumling.Lemma<"de", "Lexeme", "DET" | "PRON">,
): Possessor {
	const stem = lemma.canonicalForm;
	const none = { "gender[psor]": null, "number[psor]": null };
	if (lemma.coreFeatures.poss !== "Yes") return none;
	if (/^sein/u.test(stem))
		return { "gender[psor]": ["Masc", "Neut"], "number[psor]": "Sing" };
	if (/^(?:mein|dein)/u.test(stem))
		return { "gender[psor]": null, "number[psor]": "Sing" };
	if (/^(?:unser|eu(?:e)?r)/u.test(stem))
		return { "gender[psor]": null, "number[psor]": "Plur" };
	return none;
}

/**
 * A closed-class unit's Surface: the authored spelling of its form (the
 * word a fused or shortened spelling stands for) and, for a stem's cell,
 * its Surface features: the cell its spelling marks, nulls for the rest. A
 * Lexeme also marks possessor features and a DET its degree; a Locution
 * marks its cell alone. A pillar cell marks none.
 */
function closedSurface(
	lemma: AuthoredMember["lemma"],
	realization: MatchedRealization,
	cell: Cell | undefined,
): ClosedSurface {
	const spelling: ClosedSurface["spelling"] = realization.spelling ?? {
		kind: "Canonical",
	};
	const parts = {
		normalizedSurface: realization.standsFor ?? realization.spelled,
		spelling,
		surfaceFeatures: realization.historicalStatus
			? { historicalStatus: "Archaic" as const }
			: null,
	};
	if (
		lemma.family === "Locution" &&
		(lemma.kind === "DET" || lemma.kind === "PRON")
	) {
		const inflectionalFeatures = cell
			? { case: null, gender: null, number: null, ...cell }
			: null;
		// One branch per route, so TypeScript ties the Lemma to its Surface.
		return lemma.kind === "DET"
			? {
					unitKind: "Surface",
					language: "de",
					lemma,
					...parts,
					inflectionalFeatures,
				}
			: {
					unitKind: "Surface",
					language: "de",
					lemma,
					...parts,
					inflectionalFeatures,
				};
	}
	if (lemma.family === "Lexeme" && lemma.kind === "DET")
		return {
			unitKind: "Surface",
			language: "de",
			lemma,
			...parts,
			inflectionalFeatures: cell
				? {
						case: null,
						degree: null,
						gender: null,
						number: null,
						...possessorFeatures(lemma),
						...cell,
					}
				: null,
		};
	if (lemma.family === "Lexeme" && lemma.kind === "PRON")
		return {
			unitKind: "Surface",
			language: "de",
			lemma,
			...parts,
			inflectionalFeatures: cell
				? {
						case: null,
						gender: null,
						number: null,
						...possessorFeatures(lemma),
						...cell,
					}
				: null,
		};
	throw Error(`A closed-class unit is a DET or PRON, not a ${lemma.kind}`);
}

/** A closed-class unit's Attestation, its Surface typed on its route. */
type ClosedAttestation = {
	readonly unitKind: "Attestation";
	readonly surface: ClosedSurface;
	readonly members: readonly Dumling.Attestation<"de">["members"][number][];
	readonly realizationCoverage: "Full";
	readonly articleEvidence?: null;
};

/**
 * The Attestation of a closed-class unit from the authored member the
 * click landed on: its Lemma, the authored spelling of its form (the word
 * a fused or shortened spelling stands for), and each member's
 * orthography as the fusion table and the inventory spell it. TypeScript
 * types its Surface on the route; `parseUnit` in grammar.ts still checks
 * the whole against the unit's route, and one Dumling rejects is a Defect.
 */
export function closedAttestation(
	target: Target,
	answer: ClosedOption | OpenAnswer,
	realization: MatchedRealization,
): unknown {
	if ("syncretism" in answer)
		return stemSyncretismAttestation(target, answer);
	return unitAttestation(target, answer, realization);
}

/** The Attestation of one authored cell, a stem's or a pillar's, or of a Lemma Syncretism. */
function unitAttestation(
	target: Target,
	answer: ClosedOption | AuthoredMember,
	realization: MatchedRealization,
): ClosedAttestation {
	const option = "realization" in answer ? answer : undefined;
	const lemma = structuredClone(
		"realization" in answer ? answer.member.lemma : answer.lemma,
	);
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
		surface: closedSurface(lemma, realization, option?.cell),
		members,
		realizationCoverage: "Full",
		...(lemma.family === "Lexeme" && lemma.kind === "PRON"
			? { articleEvidence: null }
			: {}),
	};
}

/**
 * The Attestation of a stem's Surface Syncretism (ADR 0046): each unit's
 * Surface as its cell would be attested, joined by Dumling into one.
 */
function stemSyncretismAttestation(
	target: Target,
	answer: StemOpenOption,
): ClosedAttestation {
	const attestations = answer.units.map((unit) =>
		unitAttestation(target, unit, unit.realization),
	);
	const [first] = attestations;
	if (!first) throw Error("A Surface Syncretism holds two or more units");
	return {
		...first,
		surface: syncretize(attestations.map(({ surface }) => surface)),
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
