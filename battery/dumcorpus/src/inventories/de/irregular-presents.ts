/**
 * The finite forms and participles of the open German verbs whose Präsens
 * no vowel rule undoes, keyed by infinitive: `weiß` is wissen, `tut` is tun
 * and `nimmt` is nehmen, while `gibt`, `hält` and `liest` give back geben,
 * halten and lesen by undoing their vowel change. wissen is the one
 * Präteritopräsens beside the modals, whose forms `closedVerbForms` holds
 * with those of sein, haben and werden; tun is the one infinitive without
 * -en or -n; nehmen alone changes a consonant (nimm-). Dumgen offers the
 * infinitive as a part's headword when the part shows one of these forms
 * (#1241). Forms as DWDS conjugates them (https://www.dwds.de/wb/wissen,
 * …/tun, …/nehmen), standard spellings only.
 */
export const germanIrregularPresents: Readonly<
	Record<string, readonly string[]>
> = {
	wissen: [
		"weiß",
		"weißt",
		"wisst",
		"wusste",
		"wusstest",
		"wussten",
		"wusstet",
		"wüsste",
		"wüsstest",
		"wüssten",
		"wüsstet",
		"gewusst",
	],
	tun: [
		"tue",
		"tu",
		"tust",
		"tut",
		"tat",
		"tatest",
		"taten",
		"tatet",
		"täte",
		"tätest",
		"täten",
		"tätet",
		"getan",
	],
	nehmen: [
		"nimm",
		"nimmst",
		"nimmt",
		"nahm",
		"nahmst",
		"nahmen",
		"nahmt",
		"nähme",
		"nähmest",
		"nähmen",
		"nähmet",
		"genommen",
	],
};
