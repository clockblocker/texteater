// Generated from canonical Zod unit schemas. Run bun run generate.
export const inflectionalFeatures: Readonly<
	Record<string, Readonly<Record<string, readonly string[]>>>
> = {
	"en/Lexeme/ADJ": { degree: ["Cmp", "Pos", "Sup"] },
	"en/Lexeme/ADV": { degree: ["Cmp", "Pos", "Sup"] },
	"en/Lexeme/AUX": {
		mood: ["Imp", "Ind", "Sub"],
		number: ["Plur", "Sing"],
		person: ["1", "2", "3"],
		tense: ["Past", "Pres"],
		verbForm: ["Fin", "Inf", "Part"],
	},
	"en/Lexeme/DET": { number: ["Plur", "Sing"] },
	"en/Lexeme/NOUN": { number: ["Plur", "Ptan", "Sing"] },
	"en/Lexeme/PROPN": { number: ["Plur", "Ptan", "Sing"] },
	"en/Lexeme/SYM": { number: ["Plur", "Sing"] },
	"en/Lexeme/VERB": {
		mood: ["Imp", "Ind", "Sub"],
		number: ["Plur", "Sing"],
		person: ["1", "2", "3"],
		tense: ["Past", "Pres"],
		verbForm: ["Fin", "Ger", "Inf", "Part"],
		voice: ["Pass"],
	},
	"en/Locution/ADV": { degree: ["Cmp", "Pos", "Sup"] },
	"en/Locution/NOUN": { number: ["Plur", "Ptan", "Sing"] },
	"en/Locution/VERB": {
		mood: ["Imp", "Ind", "Sub"],
		number: ["Plur", "Sing"],
		person: ["1", "2", "3"],
		tense: ["Past", "Pres"],
		verbForm: ["Fin", "Ger", "Inf", "Part"],
		voice: ["Pass"],
	},
};
