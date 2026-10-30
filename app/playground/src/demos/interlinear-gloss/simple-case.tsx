import { textFromParagraphs } from "@/fixtures";
import { De, type GlossCase } from "./model";

/**
 * The Lexeme: `Kindern` on the page and as the Surface, inflected from
 * `das Kind`. Syntax has nothing to move; only `mit` sets its case.
 */
export const simple: GlossCase = {
	id: "simple",
	label: "Kindern",
	hint: "Lexeme: one word, nothing to move, two endings",
	text: textFromParagraphs("kinder", "de", "Im Garten", [
		"Er spielte mit den {Kindern|u}.",
	]),
	sentence: [
		{ id: "er", word: "Er", plain: "he" },
		{ id: "spielte", word: "spielte", plain: "played" },
		{ id: "mit", word: "mit", plain: "with" },
		{ id: "den", word: "den", plain: "the" },
		{
			id: "kindern",
			word: "Kindern",
			plain: "children",
			inUnit: true,
			after: ".",
		},
	],
	sentenceTranslation: "He played with the children.",
	attestation: {
		title: "Kindern",
		syntax: null,
		governor: {
			word: "mit",
			leipzig: "DAT",
			spelled: "dative",
			note: (
				<>
					takes the dative, so <De>Kindern</De> stands in the dative.
					Nothing moves: the Surface is the word as it stands.
				</>
			),
		},
	},
	surface: {
		title: "Kindern",
		inflection: {
			columns: [
				{
					id: "kindern",
					word: "Kindern",
					plain: "children",
					pieces: [
						{
							morph: "Kind",
							leipzig: "child",
							spelled: "child",
							to: ["kind"],
						},
						{ morph: "er", leipzig: "PL", spelled: "plural" },
						{ morph: "n", leipzig: "DAT", spelled: "dative" },
					],
					note: (
						<>
							<De>Kind</De>, ‘child’, with two endings: the plural{" "}
							<De>-er</De>, <De>Kinder</De>, and the dative plural{" "}
							<De>-n</De>. The lemma is the singular, with its
							article: <De>das Kind</De>.
						</>
					),
				},
			],
			targets: [
				{
					id: "das",
					text: "das",
					quiet: true,
					note: (
						<>
							<De>Kind</De> is neuter. The lemma’s article gives
							the gender; it isn’t on the page.
						</>
					),
				},
				{ id: "kind", text: "Kind" },
			],
			first: "kindern",
		},
	},
	lemma: {
		emoji: "🧒",
		title: "das Kind",
		tone: "neuter",
		family: "Lexeme",
		kind: "NOUN",
		tags: ["Lexeme", "NOUN", "neuter"],
		translation: "child",
		definition: "ein Mensch, der noch nicht erwachsen ist",
	},
};
