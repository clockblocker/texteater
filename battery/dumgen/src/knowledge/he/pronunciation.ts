import { normalizeForm } from "dumling";
import type * as Dumling from "dumling/types";

/** Transient Hebrew-private evidence, not independently verified lexical truth. */
export type HebrewCitation = {
	readonly pointedCitation: string;
	readonly citationRole: "ResolvedCanonical";
	readonly citationFeatures: Readonly<Record<string, unknown>>;
	readonly syllableCount: number;
	readonly stressedSyllable: number;
	readonly finalYod: "Mater" | "Consonant" | "Absent" | "Unresolved";
	readonly furtivePatah: boolean;
};
const featureProperties = {
	gender: { enum: ["Masc", "Fem"] },
	number: { enum: ["Sing", "Plur", "Dual"] },
	definite: { enum: ["Ind", null] },
	person: { const: "3" },
	tense: { const: "Past" },
	hebBinyan: {
		enum: ["PAAL", "NIFAL", "PIEL", "PUAL", "HIFIL", "HUFAL", "HITPAEL"],
	},
};
const citationProperties = {
	pointedCitation: { type: "string", minLength: 1 },
	citationRole: { const: "ResolvedCanonical" },
	citationFeatures: {
		type: "object",
		properties: featureProperties,
		additionalProperties: false,
	},
	syllableCount: { type: "integer", minimum: 1 },
	stressedSyllable: { type: "integer", minimum: 1 },
	finalYod: { enum: ["Mater", "Consonant", "Absent", "Unresolved"] },
	furtivePatah: { type: "boolean" },
};
export const hebrewCitationSchema: Record<string, unknown> = {
	anyOf: [
		{
			type: "object",
			properties: citationProperties,
			required: Object.keys(citationProperties),
			additionalProperties: false,
		},
		{ type: "null" },
	],
};
export const hebrewIpaSchema: Record<string, unknown> = {
	anyOf: [
		{
			type: "object",
			properties: {
				syllables: {
					type: "array",
					minItems: 1,
					items: { type: "string", minLength: 1 },
				},
			},
			required: ["syllables"],
			additionalProperties: false,
		},
		{ type: "null" },
	],
};
export const hebrewCitationPrompt = `Recover the dictionary citation of the supplied resolved Reading before IPA. The canonical Lemma remains authoritative; pointed occurrence is sense evidence only, never an inflection to copy. Return the citation DTO or null, no IPA. citationRole is ResolvedCanonical. Use full niqqud and one-based syllableCount/stressedSyllable, recovering lexical stress independently (not a final-stress default). ADJ features: gender Masc, number Sing, definite null (absolute); VERB: gender Masc, number Sing, person 3, tense Past, hebBinyan exactly the resolved core feature. NOUN: lexical gender, citation number Sing and definite Ind; abstain on restricted/uncertain citation number. No invented spelling variants. finalYod is Mater only for supported final hiriq plus unpointed yod, Consonant for final yod with sheva, Absent if no final yod; Unresolved abstains. furtivePatah identifies the final unstressed a before a final guttural. Return null for unsupported multiword, loans, ambiguous sheva, partial pointing or unavailable citation. These drafts are not dictionary-verified.`;
export const hebrewIpaPrompt = `Transcribe ONLY the frozen Hebrew citation DTO, without occurrence evidence. Return {syllables:string[]} or null. Each syllable has exactly one a/e/i/o/u nucleus, no stress, separators, slash or brackets. Use contemporary mainstream Israeli consonants (χ or x for ח, not ħ, and no pharyngeal ʕ). Array length equals syllableCount. The caller inserts stress from stressedSyllable; never override it. A final hiriq+yod Mater has no terminal j; consonantal initial י may be j. Furtive patah is a final unstressed aχ/ax/ah syllable, not χa or a new stressed ending. Abstain on unsupported pronunciation; do not repair the citation.`;

function record(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function exact(
	value: Record<string, unknown>,
	expected: Record<string, unknown>,
): boolean {
	return (
		Object.keys(value).length === Object.keys(expected).length &&
		Object.entries(expected).every(([key, item]) => value[key] === item)
	);
}
// Same NFD/mark-removal spelling comparison as Hebrew occurrence validation.
const spelling = (value: string) =>
	normalizeForm(value).normalize("NFD").replace(/\p{M}/gu, "");
function expectedFeatures(
	reading: Dumling.Reading,
): Record<string, unknown> | null {
	const lemma = reading.lemma;
	if (lemma.language !== "he" || lemma.family !== "Lexeme") return null;
	const core = lemma.coreFeatures as Record<string, unknown>;
	if (core.abbr != null) return null;
	switch (lemma.kind) {
		case "ADJ":
			return { gender: "Masc", number: "Sing", definite: null };
		case "NOUN":
			return core.gender === "Masc" || core.gender === "Fem"
				? { gender: core.gender, number: "Sing", definite: "Ind" }
				: null;
		case "VERB":
			return typeof core.hebBinyan === "string" &&
				core.hebExistential == null
				? {
						gender: "Masc",
						number: "Sing",
						person: "3",
						tense: "Past",
						hebBinyan: core.hebBinyan,
					}
				: null;
		default:
			return null;
	}
}
type Pointing = {
	nuclei: number;
	finalYod: HebrewCitation["finalYod"];
	furtivePatah: boolean;
};
function validMarks(letter: string, marks: string): boolean {
	if (
		new Set(marks).size !== marks.length ||
		/[\u05B1-\u05B3\u05BA]/u.test(marks)
	)
		return false;
	if (letter === "ש")
		return Number(marks.includes("ׁ")) + Number(marks.includes("ׂ")) === 1;
	return !/[ׁׂ]/u.test(marks);
}
function isFinalBareConsonant(
	letter: string,
	marks: string,
	final: boolean,
): boolean {
	return final && marks === "" && !/[אהוי]/u.test(letter);
}
function isMater(
	letter: string,
	marks: string,
	previous: string,
	final: boolean,
): boolean {
	if (marks !== "") return false;
	if (letter === "י" && previous.includes("ִ")) return true;
	return (
		final && /[אה]/u.test(letter) && /[\u05B4-\u05B9\u05BB]/u.test(previous)
	);
}
function yodRole(last: string, previous: string): HebrewCitation["finalYod"] {
	if (last[0] !== "י") return "Absent";
	if (last === "י" && previous.includes("ִ")) return "Mater";
	return last === "יְ" ? "Consonant" : "Unresolved";
}
/** Deliberately small decidable subset, not general Hebrew grapheme-to-phone conversion. */
function pointing(text: string): Pointing | null {
	if (!/^(?:[א-ת][\u05B0-\u05BC\u05C1\u05C2]*)+$/u.test(text)) return null;
	const groups = text.match(/[א-ת][\u05B0-\u05BC\u05C1\u05C2]*/gu) ?? [];
	let nuclei = 0;
	for (let index = 0; index < groups.length; index++) {
		const group = groups[index] ?? "";
		const letter = group[0] ?? "";
		const marks = group.slice(1);
		if (!validMarks(letter, marks)) return null;
		const vowels = marks.match(/[\u05B4-\u05B9\u05BB]/gu) ?? [];
		if (vowels.length > 1 || (vowels.length && marks.includes("ְ")))
			return null;
		const previous = groups[index - 1] ?? "";
		const mater = isMater(
			letter,
			marks,
			previous,
			index === groups.length - 1,
		);
		const shuruk = letter === "ו" && marks === "ּ";
		// A word-final consonant normally has no written sheva. This is a
		// supported orthographic absence, not permission for partial inner pointing.
		const finalConsonant = isFinalBareConsonant(
			letter,
			marks,
			index === groups.length - 1,
		);
		if (
			!vowels.length &&
			!marks.includes("ְ") &&
			!mater &&
			!shuruk &&
			!finalConsonant
		)
			return null;
		// Only unambiguously silent noninitial sheva is supported here.
		if (marks.includes("ְ") && !/[\u05B4-\u05B9\u05BB]/u.test(previous))
			return null;
		nuclei += vowels.length + Number(shuruk);
	}
	const last = groups.at(-1) ?? "";
	const previous = groups.at(-2) ?? "";
	const finalYod = yodRole(last, previous);
	const furtivePatah = /^[חע]ַ$/u.test(last) || /^ה[ַּ]{2}$/u.test(last);
	// ע realization and mappiq ה are outside this narrow alignment subset.
	if (furtivePatah && last[0] !== "ח") return null;
	return { nuclei, finalYod, furtivePatah };
}
export function prepareHebrewCitation(
	reading: Dumling.Reading,
	input: unknown,
): HebrewCitation | null {
	if (
		!record(input) ||
		!exact(
			Object.fromEntries(Object.keys(input).map((key) => [key, true])),
			Object.fromEntries(
				Object.keys(citationProperties).map((key) => [key, true]),
			),
		)
	)
		return null;
	const {
		pointedCitation,
		citationFeatures,
		syllableCount,
		stressedSyllable,
	} = input;
	const features = expectedFeatures(reading);
	if (
		typeof pointedCitation !== "string" ||
		input.citationRole !== "ResolvedCanonical" ||
		!record(citationFeatures) ||
		!features ||
		!exact(citationFeatures, features)
	)
		return null;
	if (spelling(pointedCitation) !== spelling(reading.lemma.canonicalForm))
		return null;
	if (
		typeof syllableCount !== "number" ||
		!Number.isInteger(syllableCount) ||
		syllableCount < 1 ||
		typeof stressedSyllable !== "number" ||
		!Number.isInteger(stressedSyllable) ||
		stressedSyllable < 1 ||
		stressedSyllable > syllableCount
	)
		return null;
	const supported = pointing(pointedCitation);
	if (
		!supported ||
		supported.nuclei !== syllableCount ||
		supported.finalYod === "Unresolved" ||
		input.finalYod !== supported.finalYod ||
		input.furtivePatah !== supported.furtivePatah ||
		(supported.furtivePatah && stressedSyllable === syllableCount)
	)
		return null;
	return Object.freeze({
		pointedCitation,
		citationRole: "ResolvedCanonical",
		citationFeatures: Object.freeze({ ...features }),
		syllableCount,
		stressedSyllable,
		finalYod: supported.finalYod,
		furtivePatah: supported.furtivePatah,
	});
}
export function renderHebrewPronunciation(
	citation: HebrewCitation,
	input: unknown,
): string | null {
	if (
		!record(input) ||
		Object.keys(input).length !== 1 ||
		!Array.isArray(input.syllables) ||
		input.syllables.length !== citation.syllableCount
	)
		return null;
	const supported = pointing(citation.pointedCitation);
	if (
		!supported ||
		supported.nuclei !== citation.syllableCount ||
		supported.finalYod !== citation.finalYod ||
		supported.furtivePatah !== citation.furtivePatah ||
		!Number.isInteger(citation.stressedSyllable) ||
		citation.stressedSyllable < 1 ||
		citation.stressedSyllable > citation.syllableCount
	)
		return null;
	const syllables: unknown[] = input.syllables;
	if (
		!syllables.every(
			(part): part is string =>
				typeof part === "string" &&
				/^[abdefɡghijklmnopʁrstuvxzʃʒχʔ]+$/u.test(part) &&
				(part.match(/[aeiou]/gu) ?? []).length === 1,
		)
	)
		return null;
	const last = syllables.at(-1) as string;
	if (citation.finalYod === "Mater" && !/i$/u.test(last)) return null;
	if (citation.finalYod === "Consonant" && !/j$/u.test(last)) return null;
	if (
		citation.furtivePatah &&
		(citation.stressedSyllable === citation.syllableCount ||
			!/^a[χx]$/u.test(last))
	)
		return null;
	return syllables
		.map(
			(part, index) =>
				(index + 1 === citation.stressedSyllable ? "ˈ" : "") + part,
		)
		.join("");
}
