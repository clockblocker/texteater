/** Hebrew-owned labels; forms and uncertainty come only from stored data. */
const FEATURE_WORDS: Readonly<
	Record<string, Readonly<Record<string, string>>>
> = {
	verbForm: { Inf: "infinitive", Part: "participle", Fin: "finite" },
	tense: { Past: "past", Fut: "future", Pres: "present" },
	mood: { Imp: "imperative", Ind: "indicative" },
	person: { "1": "first person", "2": "second person", "3": "third person" },
	gender: { Masc: "masculine", Fem: "feminine" },
	number: { Sing: "singular", Plur: "plural", Dual: "dual" },
	definite: { Cons: "construct", Def: "definite", Ind: "indefinite" },
	voice: { Act: "active", Mid: "middle", Pass: "passive" },
	hebBinyan: {
		PAAL: "Paʿal",
		NIFAL: "Nifʿal",
		PIEL: "Piʿel",
		PUAL: "Puʿal",
		HIFIL: "Hifʿil",
		HUFAL: "Hufʿal",
		HITPAEL: "Hitpaʿel",
	},
};

export function hebrewFeaturePhrases(
	features: Readonly<Record<string, unknown>>,
): string[] {
	return Object.keys(FEATURE_WORDS).flatMap((name) => {
		const value = features[name];
		const values = Array.isArray(value) ? value : [value];
		const words = values.flatMap((item) => {
			if (typeof item !== "string") return [];
			return [FEATURE_WORDS[name]?.[item] ?? item];
		});
		return words.length === 0 ? [] : [words.join(" or ")];
	});
}
