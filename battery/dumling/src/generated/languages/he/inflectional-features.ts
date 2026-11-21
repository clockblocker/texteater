// Generated from canonical Zod unit schemas. Run bun run generate.
export const inflectionalFeatures: Readonly<
	Record<string, Readonly<Record<string, readonly string[]>>>
> = {
	"he/Lexeme/ADJ": {
		definite: ["Cons", "Def"],
		gender: ["Fem", "Masc"],
		number: ["Plur", "Sing"],
	},
	"he/Lexeme/AUX": {
		gender: ["Fem", "Masc"],
		number: ["Plur", "Sing"],
		person: ["1", "2", "3"],
		polarity: ["Neg", "Pos"],
		tense: ["Fut", "Past"],
		verbForm: ["Inf", "Part"],
	},
	"he/Lexeme/DET": {
		definite: ["Cons", "Def"],
		gender: ["Fem", "Masc"],
		number: ["Plur", "Sing"],
	},
	"he/Lexeme/NOUN": {
		definite: ["Cons", "Def", "Ind"],
		number: ["Dual", "Plur", "Sing"],
	},
	"he/Lexeme/NUM": {
		definite: ["Cons", "Def"],
		gender: ["Fem", "Masc"],
		number: ["Dual", "Plur"],
	},
	"he/Lexeme/PRON": {
		gender: ["Fem", "Masc"],
		number: ["Plur", "Sing"],
		person: ["1", "2", "3"],
	},
	"he/Lexeme/PROPN": { number: ["Plur", "Sing"] },
	"he/Lexeme/VERB": {
		definite: ["Cons", "Def"],
		gender: ["Fem", "Masc"],
		mood: ["Imp"],
		number: ["Plur", "Sing"],
		person: ["1", "2", "3"],
		polarity: ["Neg", "Pos"],
		tense: ["Fut", "Past"],
		verbForm: ["Inf", "Part"],
		voice: ["Act", "Mid", "Pass"],
	},
};
