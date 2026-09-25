// Generated public DTOs.

import type * as Dumling from "dumling/types";
import type * as Dumrel from "dumrel/types";
export type Segment = {
	kind: "ResolvableText" | "OpaqueText" | "Whitespace" | "Punctuation";
	text: string;
};
export type SegmentedSentence = {
	id: string;
	language: "de" | "en" | "he";
	segments: Array<Segment>;
};
export type SegmentationDecision =
	| {
			decision: "Accepted";
			language: "en";
			sentence: { id: string; language: "en"; segments: Array<Segment> };
	  }
	| {
			decision: "Accepted";
			language: "de";
			sentence: { id: string; language: "de"; segments: Array<Segment> };
	  }
	| {
			decision: "Accepted";
			language: "he";
			sentence: { id: string; language: "he"; segments: Array<Segment> };
	  }
	| { decision: "UnsupportedLanguage" }
	| { decision: "Unintelligible" };
export type Encounter =
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "ADJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "ADP";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "ADV";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "AUX";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "CCONJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "DET";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "INTJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "NOUN";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "NUM";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "X";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PART";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PRON";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PROPN";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PUNCT";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "SCONJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "SYM";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "VERB";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Circumfix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Duplifix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Infix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Interfix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Prefix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Root";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Suffix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Suffixoid";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Transfix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "Aphorism";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "Collocation";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "DiscourseFormula";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "Idiom";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "de"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "Proverb";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "ADJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "ADP";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "ADV";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "AUX";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "CCONJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "DET";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "INTJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "NOUN";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "NUM";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "X";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PART";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PRON";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PROPN";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PUNCT";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "SCONJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "SYM";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "VERB";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Circumfix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Duplifix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Infix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Interfix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Prefix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Root";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Suffix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Suffixoid";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "ToneMarking";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Transfix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "Aphorism";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "DiscourseFormula";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "Idiom";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "en"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "Proverb";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "ADJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "ADP";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "ADV";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "AUX";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "CCONJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "DET";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "INTJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "NOUN";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "NUM";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "X";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PART";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PRON";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PROPN";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "PUNCT";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "SCONJ";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "SYM";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Lexeme";
				kind: "VERB";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Circumfix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Duplifix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Infix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Interfix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Prefix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Root";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Suffix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Suffixoid";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "ToneMarking";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Morpheme";
				kind: "Transfix";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "Aphorism";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "DiscourseFormula";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "Idiom";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  }
	| {
			sentence: { id: string; language: "he"; segments: Array<Segment> };
			target: {
				family: "Phraseme";
				kind: "Proverb";
				memberSegmentIndices: [number, ...Array<number>];
			};
	  };
export type GenerationInput =
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "ADJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADP";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "ADP">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADV";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "ADV">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "AUX";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "AUX">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "CCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "CCONJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "DET";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "DET">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "INTJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "INTJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NOUN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "NOUN">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NUM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "NUM">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "X";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "X">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PART";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "PART">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PRON";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "PRON">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PROPN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "PROPN">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PUNCT";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "PUNCT">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "SCONJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SYM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "SYM">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "VERB";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "VERB">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Circumfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Circumfix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Duplifix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Duplifix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Infix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Infix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Interfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Interfix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Prefix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Prefix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Root";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Root">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Suffix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffixoid";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Suffixoid">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Transfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Transfix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Aphorism";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Phraseme", "Aphorism">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Collocation";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Phraseme", "Collocation">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "DiscourseFormula";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Idiom";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Phraseme", "Idiom">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Proverb";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Phraseme", "Proverb">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "ADJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADP";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "ADP">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADV";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "ADV">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "AUX";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "AUX">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "CCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "CCONJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "DET";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "DET">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "INTJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "INTJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NOUN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "NOUN">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NUM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "NUM">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "X";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "X">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PART";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "PART">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PRON";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "PRON">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PROPN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "PROPN">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PUNCT";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "PUNCT">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "SCONJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SYM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "SYM">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "VERB";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "VERB">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Circumfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Circumfix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Duplifix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Duplifix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Infix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Infix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Interfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Interfix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Prefix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Prefix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Root";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Root">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Suffix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffixoid";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Suffixoid">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "ToneMarking";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "ToneMarking">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Transfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Transfix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Aphorism";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Phraseme", "Aphorism">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "DiscourseFormula";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Idiom";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Phraseme", "Idiom">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Proverb";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Phraseme", "Proverb">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "ADJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADP";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "ADP">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADV";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "ADV">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "AUX";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "AUX">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "CCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "CCONJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "DET";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "DET">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "INTJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "INTJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NOUN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "NOUN">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NUM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "NUM">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "X";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "X">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PART";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "PART">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PRON";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "PRON">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PROPN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "PROPN">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PUNCT";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "PUNCT">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "SCONJ">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SYM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "SYM">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "VERB";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "VERB">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Circumfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Circumfix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Duplifix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Duplifix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Infix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Infix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Interfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Interfix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Prefix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Prefix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Root";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Root">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Suffix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffixoid";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Suffixoid">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "ToneMarking";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "ToneMarking">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Transfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Transfix">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Aphorism";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Phraseme", "Aphorism">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "DiscourseFormula";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Idiom";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Phraseme", "Idiom">;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Proverb";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Phraseme", "Proverb">;
	  };
export type ComparisonInput =
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "ADJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADP";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "ADP">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADV";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "ADV">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "AUX";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "AUX">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "CCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "CCONJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "DET";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "DET">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "INTJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "INTJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NOUN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "NOUN">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NUM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "NUM">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "X";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "X">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PART";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "PART">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PRON";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "PRON">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PROPN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "PROPN">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PUNCT";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "PUNCT">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "SCONJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SYM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "SYM">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "VERB";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Lexeme", "VERB">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Circumfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Circumfix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Duplifix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Duplifix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Infix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Infix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Interfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Interfix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Prefix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Prefix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Root";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Root">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Suffix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffixoid";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Suffixoid">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Transfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Morpheme", "Transfix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Aphorism";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Phraseme", "Aphorism">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Collocation";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Phraseme", "Collocation">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "DiscourseFormula";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Phraseme", "DiscourseFormula">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Idiom";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Phraseme", "Idiom">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Proverb";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"de", "Phraseme", "Proverb">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "ADJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADP";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "ADP">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADV";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "ADV">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "AUX";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "AUX">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "CCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "CCONJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "DET";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "DET">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "INTJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "INTJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NOUN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "NOUN">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NUM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "NUM">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "X";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "X">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PART";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "PART">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PRON";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "PRON">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PROPN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "PROPN">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PUNCT";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "PUNCT">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "SCONJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SYM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "SYM">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "VERB";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Lexeme", "VERB">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Circumfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Circumfix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Duplifix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Duplifix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Infix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Infix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Interfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Interfix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Prefix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Prefix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Root";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Root">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Suffix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffixoid";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Suffixoid">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "ToneMarking";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "ToneMarking">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Transfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Morpheme", "Transfix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Aphorism";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Phraseme", "Aphorism">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "DiscourseFormula";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Phraseme", "DiscourseFormula">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Idiom";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Phraseme", "Idiom">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Proverb";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"en", "Phraseme", "Proverb">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "ADJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADP";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "ADP">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADV";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "ADV">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "AUX";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "AUX">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "CCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "CCONJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "DET";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "DET">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "INTJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "INTJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NOUN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "NOUN">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NUM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "NUM">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "X";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "X">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PART";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "PART">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PRON";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "PRON">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PROPN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "PROPN">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PUNCT";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "PUNCT">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "SCONJ">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SYM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "SYM">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "VERB";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Lexeme", "VERB">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Circumfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Circumfix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Duplifix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Duplifix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Infix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Infix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Interfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Interfix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Prefix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Prefix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Root";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Root">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Suffix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffixoid";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Suffixoid">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "ToneMarking";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "ToneMarking">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Transfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Morpheme", "Transfix">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Aphorism";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Phraseme", "Aphorism">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "DiscourseFormula";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Phraseme", "DiscourseFormula">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Idiom";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Phraseme", "Idiom">;
			candidates: Array<string>;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Proverb";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			lemma: Dumling.Lemma<"he", "Phraseme", "Proverb">;
			candidates: Array<string>;
	  };
export type KnowledgeInput =
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "ADJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADP";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "ADP">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADV";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "ADV">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "AUX";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "AUX">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "CCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "CCONJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "DET";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "DET">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "INTJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "INTJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NOUN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "NOUN">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NUM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "NUM">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "X";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "X">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PART";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "PART">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PRON";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "PRON">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PROPN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "PROPN">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PUNCT";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "PUNCT">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "SCONJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SYM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "SYM">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "VERB";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Lexeme", "VERB">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Circumfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Morpheme", "Circumfix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Duplifix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Morpheme", "Duplifix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Infix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Morpheme", "Infix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Interfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Morpheme", "Interfix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Prefix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Morpheme", "Prefix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Root";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Morpheme", "Root">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Morpheme", "Suffix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffixoid";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Morpheme", "Suffixoid">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Transfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Morpheme", "Transfix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Aphorism";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Phraseme", "Aphorism">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Collocation";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Phraseme", "Collocation">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "DiscourseFormula";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Phraseme", "DiscourseFormula">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Idiom";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Phraseme", "Idiom">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "de";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Proverb";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"de", "Phraseme", "Proverb">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "ADJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADP";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "ADP">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADV";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "ADV">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "AUX";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "AUX">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "CCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "CCONJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "DET";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "DET">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "INTJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "INTJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NOUN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "NOUN">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NUM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "NUM">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "X";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "X">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PART";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "PART">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PRON";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "PRON">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PROPN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "PROPN">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PUNCT";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "PUNCT">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "SCONJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SYM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "SYM">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "VERB";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Lexeme", "VERB">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Circumfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Morpheme", "Circumfix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Duplifix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Morpheme", "Duplifix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Infix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Morpheme", "Infix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Interfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Morpheme", "Interfix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Prefix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Morpheme", "Prefix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Root";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Morpheme", "Root">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Morpheme", "Suffix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffixoid";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Morpheme", "Suffixoid">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "ToneMarking";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Morpheme", "ToneMarking">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Transfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Morpheme", "Transfix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Aphorism";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Phraseme", "Aphorism">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "DiscourseFormula";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Phraseme", "DiscourseFormula">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Idiom";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Phraseme", "Idiom">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "en";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Proverb";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"en", "Phraseme", "Proverb">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "ADJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADP";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "ADP">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "ADV";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "ADV">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "AUX";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "AUX">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "CCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "CCONJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "DET";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "DET">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "INTJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "INTJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NOUN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "NOUN">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "NUM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "NUM">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "X";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "X">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PART";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "PART">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PRON";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "PRON">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PROPN";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "PROPN">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "PUNCT";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "PUNCT">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SCONJ";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "SCONJ">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "SYM";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "SYM">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Lexeme";
					kind: "VERB";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Lexeme", "VERB">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Circumfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Morpheme", "Circumfix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Duplifix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Morpheme", "Duplifix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Infix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Morpheme", "Infix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Interfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Morpheme", "Interfix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Prefix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Morpheme", "Prefix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Root";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Morpheme", "Root">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Morpheme", "Suffix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Suffixoid";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Morpheme", "Suffixoid">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "ToneMarking";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Morpheme", "ToneMarking">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Morpheme";
					kind: "Transfix";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Morpheme", "Transfix">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Aphorism";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Phraseme", "Aphorism">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "DiscourseFormula";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Phraseme", "DiscourseFormula">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Idiom";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Phraseme", "Idiom">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  }
	| {
			encounter: {
				sentence: {
					id: string;
					language: "he";
					segments: Array<Segment>;
				};
				target: {
					family: "Phraseme";
					kind: "Proverb";
					memberSegmentIndices: [number, ...Array<number>];
				};
			};
			reading: Dumling.Reading<"he", "Phraseme", "Proverb">;
			request: Dumrel.KnowledgeRequestMask;
			attestedGovernment?:
				| Array<{ preposition: string; case: Dumrel.GovernedCase }>
				| undefined;
	  };
export type SegmentInput = { sourceSentences: [string, ...Array<string>] };
export type KnowledgeFailure = {
	aspect:
		| "transcription"
		| "definition"
		| "translations"
		| "semanticRelations"
		| "valency"
		| "participleSource"
		| "morphologicalTree"
		| "lexicalBreakdown";
	leaf?: string | undefined;
	candidate?: string | undefined;
	code:
		| "InvalidInput"
		| "ProviderFailure"
		| "InvalidModelOutput"
		| "Unresolved"
		| "NotImplemented"
		| "CatalogMiss";
	message: string;
};
export type KnowledgeProduction = {
	changes: Array<Dumrel.KnowledgeChange>;
	pendingRelations: Array<Dumrel.PendingSemanticRelation>;
	failures: Array<KnowledgeFailure>;
};
