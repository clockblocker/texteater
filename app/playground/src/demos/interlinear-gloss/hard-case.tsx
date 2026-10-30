import { textFromParagraphs } from "@/fixtures";
import {
	type Column,
	De,
	type GlossCase,
	lineOf,
	type SentenceWord,
	whole,
} from "./model";

/**
 * The Locution: `hatte es damit zu tun` on the page, stored as the
 * Surface `jD mit jM zu tun hatte`, inflected from `mit jM zu tun haben`.
 */

const dassClause = [
	"dass",
	"er",
	"in",
	"einem",
	"dunklen",
	"schrank",
	"lebte",
] as const;

/** The Surface line, column by column, glossed for its inflection. */
const surfaceColumns: readonly Column[] = [
	{
		id: "jd",
		word: "jD",
		style: "slot",
		plain: "someone",
		pieces: [whole("jD", "sb.NOM", undefined, "someone.nominative")],
		drops: true,
		note: (
			<>
				Short for <De>jemand</De>: the subject slot, which <De>es</De>{" "}
				fills on the page. A lemma names no subject, so <De>jD</De>{" "}
				drops out.
			</>
		),
	},
	{
		id: "mit",
		word: "mit",
		style: "prep",
		plain: "with",
		pieces: [whole("mit", "with", "mit")],
		note: (
			<>
				The line's fixed preposition, ‘with’. It goes into the lemma
				unchanged.
			</>
		),
	},
	{
		id: "jm",
		word: "jM",
		style: "slot",
		plain: "something",
		pieces: [whole("jM", "sb.DAT", "jm", "someone.dative")],
		note: (
			<>
				Short for <De>jemandem</De>: the dative slot after <De>mit</De>,
				for whoever or whatever it has to do with. On the page{" "}
				<De>da-</De> fills it. The lemma keeps the slot.
			</>
		),
	},
	{
		id: "zu",
		word: "zu",
		plain: "to",
		pieces: [whole("zu", "to", "zu")],
		note: (
			<>
				With <De>tun</De>, the zu-infinitive <De>zu tun</De>, ‘to do’.
				It goes into the lemma unchanged.
			</>
		),
	},
	{
		id: "tun",
		word: "tun",
		plain: "do",
		pieces: [whole("tun", "do.INF", "tun", "do.infinitive")],
		note: (
			<>
				Already the infinitive, ‘do’, after <De>zu</De>. It goes into
				the lemma unchanged.
			</>
		),
	},
	{
		id: "hatte",
		word: "hatte",
		plain: "had",
		pieces: [
			{ morph: "hab", leipzig: "have", spelled: "have", to: ["haben"] },
			{
				morph: "te",
				leipzig: "PST.IND.3SG",
				spelled: "past.indicative.he/she/it",
			},
		],
		note: (
			<>
				The past (Präteritum) of <De>haben</De>, third person singular,
				indicative: <De>hab-</De> + <De>-te</De>. The lemma names the
				verb by its infinitive, <De>haben</De>.
			</>
		),
	},
];

/** The words on the page, glossed only for where they go in the line. */
const attestedColumns: readonly Column[] = [
	{
		id: "hatte",
		word: "hatte",
		plain: "had",
		pieces: [whole("hatte", "had", "hatte")],
		note: (
			<>
				The finite verb. A main clause puts it second, here after{" "}
				<De>Vielleicht</De>; the Surface line puts it last, in verb-last
				order. It keeps its ending: the Surface is still <De>hatte</De>.
			</>
		),
	},
	{
		id: "es",
		word: "es",
		plain: "it",
		pieces: [whole("es", "it.SBJ", "jd", "it.subject")],
		refersTo: dassClause,
		note: (
			<>
				The subject, ‘it’, and referential here: the situation the{" "}
				<De>dass</De>-clause spells out. It fills the subject slot{" "}
				<De>jD</De>.
			</>
		),
	},
	{
		id: "damit",
		word: "damit",
		plain: "with that",
		pieces: [whole("da", "that", "jm"), whole("mit", "with", "mit")],
		refersTo: dassClause,
		note: (
			<>
				A pronominal adverb, <De>da(r)-</De> + <De>mit</De>.{" "}
				<De>mit</De> is the line's fixed word; <De>da-</De> stands in
				for its object, the <De>dass</De>-clause, and fills the{" "}
				<De>jM</De> slot.
			</>
		),
	},
	{
		id: "zu",
		word: "zu",
		plain: "to",
		pieces: [whole("zu", "to", "zu")],
		note: (
			<>
				Fixed: it keeps its place before <De>tun</De>.
			</>
		),
	},
	{
		id: "tun",
		word: "tun",
		plain: "do",
		pieces: [whole("tun", "do", "tun")],
		note: (
			<>
				Fixed: the infinitive already stands last but for the finite
				verb, which moves in after it.
			</>
		),
	},
];

const sentence: readonly SentenceWord[] = [
	{ id: "vielleicht", word: "Vielleicht", plain: "perhaps" },
	{ id: "hatte", word: "hatte", plain: "had", inUnit: true },
	{ id: "es", word: "es", plain: "it", inUnit: true },
	{ id: "damit", word: "damit", plain: "with that", inUnit: true },
	{ id: "zu", word: "zu", plain: "to", inUnit: true },
	{ id: "tun", word: "tun", plain: "do", inUnit: true, after: "," },
	{ id: "dass", word: "dass", plain: "that" },
	{ id: "er", word: "er", plain: "he" },
	{ id: "in", word: "in", plain: "in" },
	{ id: "einem", word: "einem", plain: "a" },
	{ id: "dunklen", word: "dunklen", plain: "dark" },
	{ id: "schrank", word: "Schrank", plain: "cupboard" },
	{ id: "lebte", word: "lebte", plain: "lived", after: ", …" },
];

export const hard: GlossCase = {
	id: "hard",
	label: "hatte es damit zu tun",
	hint: "Locution: five words in another order, two of them filling slots",
	text: textFromParagraphs("harry", "de", "Harry", [
		"Vielleicht {hatte|u} {es|u} {damit|u} {zu|u} {tun|u}, dass er in einem dunklen Schrank lebte, jedenfalls war Harry für sein Alter immer recht klein und dürr gewesen.",
	]),
	sentence,
	sentenceTranslation:
		"Perhaps it had to do with (the fact) that he lived in a dark cupboard, …",
	attestation: {
		title: "hatte es damit zu tun",
		syntax: {
			columns: attestedColumns,
			targets: lineOf(surfaceColumns),
			first: "damit",
		},
	},
	surface: {
		title: "jD mit jM zu tun hatte",
		inflection: {
			columns: surfaceColumns,
			targets: [
				{ id: "mit", text: "mit", style: "prep" },
				{ id: "jm", text: "jM", style: "slot" },
				{ id: "zu", text: "zu" },
				{ id: "tun", text: "tun" },
				{ id: "haben", text: "haben" },
			],
			first: "hatte",
		},
	},
	lemma: {
		emoji: "🔗",
		title: "mit jM zu tun haben",
		family: "Locution",
		kind: "VERB",
		tags: ["Locution", "VERB"],
		translation: "to have to do with",
		definition: "mit etwas zusammenhängen",
	},
};
