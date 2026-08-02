import {
	defineLocalDemonstrations,
	definePromptSource,
} from "../../../../../assembly";
import { inputSchema, outputSchema } from "./schemas";

const body = `Resolve exactly one German grammatical target containing
clickedSegmentIndex.

Default: return the clicked ResolvableText as a one-member Lexeme and classify
its kind from local German morphology and syntax. Return an empty
additionalMemberSegmentIndices array unless the click belongs to a defensible
conventionalized whole: an aphorism, collocation, discourse formula, idiom,
proverb, or every lexical member of a phrasal or separable verb. A collocation
is conventional but non-idiomatic, such as eine Entscheidung treffen. A
multi-member verb remains Lexeme/VERB. Never absorb an ordinary free phrase or
an unrelated nearby word.

Indices are zero-based array positions counting every Segment kind. Return only
the participating ResolvableText indices other than clickedSegmentIndex in
additionalMemberSegmentIndices. The application inserts the clicked index.

A capitalized common-word head after a determiner and optional inflected
adjective is a NOUN; the preceding modifier is ADJ. Do not classify the noun as
ADJ merely because the adjective is nearby.

Use Construction only when the clicked material itself is a Fusion or
PairedFrame, never for an ordinary sentence or clause. Never select a Morpheme
under this policy. Return Unresolved with target null only when the
ResolvableText promise cannot be fulfilled; otherwise return Resolved with one
non-null target.`;

const demonstrations = defineLocalDemonstrations({
	inputSchema,
	outputSchema,
	cases: [
		{
			input: {
				clickedSegmentIndex: 0,
				segments: [
					{ kind: "ResolvableText", text: "Guten" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "Morgen" },
					{ kind: "Punctuation", text: "!" },
				],
			},
			idealOutput: {
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [2],
					family: "Phraseme",
					kind: "DiscourseFormula",
				},
			},
		},
		{
			input: {
				clickedSegmentIndex: 8,
				segments: [
					{ kind: "ResolvableText", text: "Der" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "Ausschuss" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "trifft" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "eine" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "Entscheidung" },
					{ kind: "Punctuation", text: "." },
				],
			},
			idealOutput: {
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [4, 6],
					family: "Phraseme",
					kind: "Collocation",
				},
			},
		},
		{
			input: {
				clickedSegmentIndex: 4,
				segments: [
					{ kind: "ResolvableText", text: "der" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "heiße" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "Kakao" },
				],
			},
			idealOutput: {
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [],
					family: "Lexeme",
					kind: "NOUN",
				},
			},
		},
		{
			input: {
				clickedSegmentIndex: 2,
				segments: [
					{ kind: "ResolvableText", text: "Fritz" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "steht" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "sofort" },
					{ kind: "Whitespace", text: " " },
					{ kind: "ResolvableText", text: "auf" },
					{ kind: "Punctuation", text: "." },
				],
			},
			idealOutput: {
				decision: "Resolved",
				target: {
					additionalMemberSegmentIndices: [6],
					family: "Lexeme",
					kind: "VERB",
				},
			},
		},
	],
});

export const promptSource = definePromptSource({
	route: "target-classification/de/high-level-whole-unit",
	inputSchema,
	outputSchema,
	body,
	demonstrations,
});
