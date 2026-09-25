import emojiRegex from "emoji-regex";
import { germanAdpositionAllows } from "../grammar/german-adposition-cases.js";

/** Shared by Zod authoring and compiled validation operations. */
export function hasMarkedFeature(bag: Record<string, unknown>): boolean {
	return Object.values(bag).some((value) => value !== null);
}
export function nonEmptyFeatureBagError(): string {
	return "Feature Bag must contain a marked feature";
}
export function normalizeForm(value: string): string {
	return value.trim().normalize("NFC");
}
const emojiPattern = new RegExp(`^(?:${emojiRegex().source})$`);
const modifierPattern = /^\p{Emoji_Modifier}$/u;
let segmenter: Intl.Segmenter | undefined;
export function isEmojiDescription(value: string): boolean {
	segmenter ??= new Intl.Segmenter(undefined, { granularity: "grapheme" });
	const segments = [...segmenter.segment(value)];
	return (
		segments.length >= 1 &&
		segments.length <= 4 &&
		segments.every(
			({ segment }) =>
				emojiPattern.test(segment) && !modifierPattern.test(segment),
		)
	);
}
export function emojiDescriptionError(): string {
	return "Emoji Description must contain one to four emoji graphemes";
}

/** Null records no marked distinction; it never substitutes for a known gender. */
export function isGermanPronounCore(core: Record<string, unknown>): boolean {
	if ((core.gender ?? null) === null) return true;
	if (core.number === "Plur") return false;
	return (
		core.pronType !== "Prs" ||
		(core.person === "3" && core.number === "Sing")
	);
}
export function germanPronounCoreError(): string {
	return "German pronoun gender must agree with its subtype, person and number";
}

/** Plural agreement has no marked gender; a cell never guesses one. */
export function isGermanDeterminerCore(core: Record<string, unknown>): boolean {
	return core.gender === null || core.number !== "Plur";
}
export function germanDeterminerCoreError(): string {
	return "German determiner plural agreement has no marked gender";
}

const cellCoordinates = ["case", "number", "gender"] as const;
/**
 * A pillar Lemma marks its Paradigm Cell in Core; a stem Lemma marks it on
 * each Surface. A coordinate is never marked in both, and plural agreement
 * marks no gender on either.
 */
export function isGermanClosedClassSurface(input: unknown): boolean {
	const value = input as {
		lemma: { coreFeatures: Record<string, unknown> };
		inflectionalFeatures: Record<string, unknown> | null;
	};
	const core = value.lemma.coreFeatures;
	const bag = value.inflectionalFeatures;
	if (!bag) return true;
	if (
		cellCoordinates.some(
			(coordinate) =>
				(core[coordinate] ?? null) !== null &&
				(bag[coordinate] ?? null) !== null,
		)
	)
		return false;
	if (
		core.poss !== "Yes" &&
		((bag["gender[psor]"] ?? null) !== null ||
			(bag["number[psor]"] ?? null) !== null)
	)
		return false;
	return !(bag.number === "Plur" && (bag.gender ?? null) !== null);
}
export function germanClosedClassSurfaceError(): string {
	return "German PRON and DET mark case, number and gender in Core or on the Surface, never both; plural agreement has no marked gender; only a possessive marks possessor features";
}

/**
 * A German article feature names an article form that agrees with its noun.
 * A proper noun's article is its Core `article` (ADR 0035), and a name
 * without a marked case, such as one in direct address, shows no form.
 */
export function isGermanNounSurface(input: unknown): boolean {
	const value = input as {
		inflectionalFeatures: {
			article?: string;
			case: string | null;
			number: string | null;
		} | null;
		lemma: {
			kind: string;
			coreFeatures: { article?: string | null; gender: string | null };
		};
	};
	const bag = value.inflectionalFeatures;
	const proper = value.lemma.kind === "PROPN";
	const article = proper
		? (value.lemma.coreFeatures.article ?? "None")
		: (bag?.article ?? "None");
	if (!bag || article === "None" || (proper && !bag.case)) return true;
	return (
		germanArticleForm({
			article,
			case: bag.case,
			number: bag.number,
			gender: value.lemma.coreFeatures.gender,
		}) !== null
	);
}
export function germanNounSurfaceError(): string {
	return "Noun article must have a form for its case, number and gender";
}

type Fusion = { spelling: string; components: { span: string }[] };
/** The components' spans spell the fused word, in order. */
export function isFusion(input: unknown): boolean {
	const value = input as Fusion;
	return (
		value.components.map((component) => component.span).join("") ===
		value.spelling
	);
}
export function fusionError(): string {
	return "Fusion component spans must spell the fused word in order";
}
/** A Fused member spells the Fusion component it realizes. */
export function isFusedMember(input: unknown): boolean {
	const value = input as {
		attested: string;
		fusion: Fusion;
		component: number;
	};
	return value.fusion.components[value.component]?.span === value.attested;
}
export function fusedMemberError(): string {
	return "A Fused member must spell the Fusion component it realizes";
}

/**
 * A noun owns its article (ADR 0035). German and English mark it with
 * `article`, Hebrew with `definite: Def`. A noun without an article has no
 * article evidence and Full coverage; an owned article keeps Full coverage;
 * a shared article or a hidden Fusion component leaves the noun Partial.
 * A Hebrew `Def` form may name no evidence. A proper noun canonically cited
 * with its article has Core `article: Definite` and owns it the same way; an
 * occurrence may still show none (unsere Schweiz). A proper noun cited bare
 * has no article evidence: an article it takes in a sentence is its own DET.
 */
export function isNounArticleAttestation(input: unknown): boolean {
	const value = input as {
		surface: {
			language: string;
			inflectionalFeatures: {
				article?: string;
				definite?: string | null;
			} | null;
			lemma: {
				kind: string;
				coreFeatures: { article?: string | null };
			};
		};
		articleEvidence:
			| { kind: "Owned"; member: number }
			| { kind: "Shared" }
			| { kind: "Hidden"; fusion: Fusion; component: number }
			| null;
		realizationCoverage: string;
		members: unknown[];
	};
	const bag = value.surface.inflectionalFeatures;
	const hebrew = value.surface.language === "he";
	const proper = value.surface.lemma.kind === "PROPN";
	const article = proper
		? value.surface.lemma.coreFeatures.article === "Definite"
		: hebrew
			? bag?.definite === "Def"
			: (bag?.article ?? "None") !== "None";
	const evidence = value.articleEvidence;
	if (!evidence)
		return (
			value.realizationCoverage === "Full" &&
			(hebrew || proper || !article)
		);
	if (!article) return false;
	if (evidence.kind === "Owned")
		return (
			value.realizationCoverage === "Full" &&
			evidence.member < value.members.length
		);
	if (evidence.kind === "Hidden")
		return (
			value.realizationCoverage === "Partial" &&
			evidence.fusion.components[evidence.component]?.span === ""
		);
	return value.realizationCoverage === "Partial";
}
export function nounArticleAttestationError(): string {
	return "A noun's article is an owned member with Full coverage, or a shared article or hidden Fusion component with Partial coverage; a noun without an article has no article evidence and Full coverage";
}

const definiteForms: Record<string, Record<string, string>> = {
	Masc: { Nom: "der", Acc: "den", Dat: "dem", Gen: "des" },
	Fem: { Nom: "die", Acc: "die", Dat: "der", Gen: "der" },
	Neut: { Nom: "das", Acc: "das", Dat: "dem", Gen: "des" },
	Plur: { Nom: "die", Acc: "die", Dat: "den", Gen: "der" },
};
const indefiniteForms: Record<string, Record<string, string>> = {
	Masc: { Nom: "ein", Acc: "einen", Dat: "einem", Gen: "eines" },
	Fem: { Nom: "eine", Acc: "eine", Dat: "einer", Gen: "einer" },
	Neut: { Nom: "ein", Acc: "ein", Dat: "einem", Gen: "eines" },
};

/** Normalized German article morphology; null means absent or unsupported coordinates. */
export function germanArticleForm(input: {
	article: string | null;
	case: string | null;
	number: string | null;
	gender: string | null;
}): string | null {
	if (
		!input.case ||
		!input.number ||
		!["Sing", "Plur"].includes(input.number)
	)
		return null;
	const forms =
		input.article === "Definite"
			? definiteForms
			: input.article === "Indefinite"
				? indefiniteForms
				: null;
	return (
		forms?.[input.number === "Plur" ? "Plur" : (input.gender ?? "")]?.[
			input.case
		] ?? null
	);
}

export function isGermanVerbalAttestation(input: unknown): boolean {
	const value = input as {
		surface: {
			normalizedSurface: string;
			inflectionalFeatures: {
				expletive: string | null;
				verbForm: string;
				person: string | null;
				number: string | null;
			} | null;
		};
		expletiveEvidence: { attested: string; orthography: string } | null;
		valencyEvidence: ValencyEvidence[];
		members: { attested: string; orthography: string }[];
		realizationCoverage: string;
	};
	if (!isOwnedValencyEvidence(value.valencyEvidence, value.members))
		return false;
	const bag = value.surface.inflectionalFeatures;
	if (!bag?.expletive) return value.expletiveEvidence === null;
	const evidence = value.expletiveEvidence;
	if (!evidence || value.realizationCoverage !== "Full") return false;
	if (bag.verbForm === "Fin" && (bag.person !== "3" || bag.number !== "Sing"))
		return false;
	return (
		value.surface.normalizedSurface.split(" ").includes("es") &&
		(evidence.orthography === "Typo" ||
			evidence.attested.toLocaleLowerCase("de") === "es") &&
		value.members.some(
			(member) =>
				member.attested === evidence.attested &&
				member.orthography === evidence.orthography,
		)
	);
}
export function germanVerbalAttestationError(): string {
	return "Subject expletive requires third-person singular agreement and owned es evidence in the complete verbal realization; valency evidence must name distinct owned members spelling its preposition, in a case the preposition allows";
}

/**
 * A German adjective or noun Attestation names the owned members realizing
 * the valency slots it attests, as a verbal one does (ADR 0034).
 */
export function isGermanValencyAttestation(input: unknown): boolean {
	const value = input as {
		valencyEvidence: ValencyEvidence[];
		members: { attested: string; orthography: string }[];
	};
	return isOwnedValencyEvidence(value.valencyEvidence, value.members);
}
export function germanValencyAttestationError(): string {
	return "Valency evidence must name distinct owned members spelling its preposition, in a case the preposition allows";
}

type ValencyEvidence = {
	member: number | null;
	complement:
		| { kind: "Case"; case: string }
		| {
				kind: "Preposition";
				preposition: {
					canonicalForm: string;
					coreFeatures: { adpType: string | null };
				};
				case: string;
		  };
	realizedCase: string;
};

/**
 * Each slot names a distinct owned member, or none. A preposition slot's
 * member spells its preposition unless it is a Typo, takes a case the ADP
 * Case Table allows the preposition, and keeps that case in the occurrence. A bare-case slot has
 * no marker member.
 */
function isOwnedValencyEvidence(
	evidence: readonly ValencyEvidence[],
	members: readonly { attested: string; orthography: string }[],
): boolean {
	const named = evidence.flatMap((slot) =>
		slot.member === null ? [] : [slot.member],
	);
	if (new Set(named).size !== named.length) return false;
	return evidence.every(({ member: index, complement, realizedCase }) => {
		if (complement.kind === "Case") return index === null;
		const { canonicalForm } = complement.preposition;
		if (
			realizedCase !== complement.case ||
			!germanAdpositionAllows(complement.preposition, complement.case)
		)
			return false;
		if (index === null) return true;
		const member = members[index];
		return (
			member !== undefined &&
			(member.orthography === "Typo" ||
				member.attested.toLocaleLowerCase("de") === canonicalForm)
		);
	});
}

/**
 * A German ADP Attestation records at most one slot: the bare case its
 * complement took (`auf dem Tisch` Dat), marked by no member, in a case the
 * ADP Case Table allows. An ADP with no case-marked complement records none.
 */
export function isGermanAdpositionAttestation(input: unknown): boolean {
	const value = input as {
		surface: {
			lemma: {
				canonicalForm: string;
				coreFeatures: { adpType: string | null };
			};
		};
		valencyEvidence: ValencyEvidence[];
	};
	const [slot, ...rest] = value.valencyEvidence;
	if (!slot) return true;
	return (
		rest.length === 0 &&
		slot.member === null &&
		slot.complement.kind === "Case" &&
		slot.complement.case === slot.realizedCase &&
		germanAdpositionAllows(value.surface.lemma, slot.realizedCase)
	);
}
export function germanAdpositionAttestationError(): string {
	return "ADP valency evidence is at most one bare-case slot with no member, realized in a case the ADP Case Table allows";
}

export function isGermanVerbalSurface(input: unknown): boolean {
	const value = input as {
		normalizedSurface: string;
		inflectionalFeatures: {
			expletive: string | null;
			verbForm: string;
			person: string | null;
			number: string | null;
			mood: string | null;
		} | null;
	};
	const bag = value.inflectionalFeatures;
	if (!bag?.expletive) return true;
	return (
		value.normalizedSurface.split(" ").includes("es") &&
		(bag.verbForm !== "Fin" ||
			(bag.person === "3" && bag.number === "Sing" && bag.mood !== "Imp"))
	);
}
export function germanVerbalSurfaceError(): string {
	return "Subject-expletive Surface requires normalized es and compatible verbal agreement";
}
