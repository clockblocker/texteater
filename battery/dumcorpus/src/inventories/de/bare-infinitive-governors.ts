/**
 * The finite forms of the open German verbs that govern a bare infinitive,
 * keyed by infinitive: lassen (Er lässt sie warten), gehen (Sie geht
 * einkaufen), bleiben (Er bleibt sitzen), lernen (Sie lernt schwimmen),
 * sehen and hören (Ich sehe ihn kommen), helfen (Er hilft ihr tragen).
 * Like a modal's finite form (`closedVerbForms`), one of these in a clause
 * leaves the clause's other VERB no finite reading, since a clause has one
 * finite verb; unlike a modal, each also stands alone as a clause's only
 * verb, so the forms say nothing about a verb of another clause.
 *
 * Each list holds the Präsens, Präteritum, Konjunktiv I and II and
 * Imperativ, standard spellings only, as DWDS conjugates them
 * (https://www.dwds.de/wb/lassen, …/gehen, …/bleiben, …/lernen, …/sehen,
 * …/hören, …/helfen). The 1st and 3rd person plural, spelled like the
 * infinitive (wir lassen), are listed too: a reader that must tell a form
 * from the infinitive leaves those out itself. The participles (gelassen)
 * are no finite forms and are left out.
 */
export const germanBareInfinitiveGovernors: Readonly<
	Record<string, readonly string[]>
> = {
	lassen: [
		"lasse",
		"lässt",
		"lassen",
		"lasst",
		"ließ",
		"ließest",
		"ließt",
		"ließen",
		"lassest",
		"lasset",
		"ließe",
		"ließet",
		"lass",
	],
	gehen: [
		"gehe",
		"gehst",
		"geht",
		"gehen",
		"ging",
		"gingst",
		"gingen",
		"gingt",
		"gehest",
		"gehet",
		"ginge",
		"gingest",
		"ginget",
		"geh",
	],
	bleiben: [
		"bleibe",
		"bleibst",
		"bleibt",
		"bleiben",
		"blieb",
		"bliebst",
		"blieben",
		"bliebt",
		"bleibest",
		"bleibet",
		"bliebe",
		"bliebest",
		"bliebet",
		"bleib",
	],
	lernen: [
		"lerne",
		"lernst",
		"lernt",
		"lernen",
		"lernte",
		"lerntest",
		"lernten",
		"lerntet",
		"lernest",
		"lernet",
		"lern",
	],
	sehen: [
		"sehe",
		"siehst",
		"sieht",
		"sehen",
		"seht",
		"sah",
		"sahst",
		"sahen",
		"saht",
		"sehest",
		"sehet",
		"sähe",
		"sähest",
		"sähen",
		"sähet",
		"sieh",
		"siehe",
	],
	hören: [
		"höre",
		"hörst",
		"hört",
		"hören",
		"hörte",
		"hörtest",
		"hörten",
		"hörtet",
		"hörest",
		"höret",
		"hör",
	],
	helfen: [
		"helfe",
		"hilfst",
		"hilft",
		"helfen",
		"helft",
		"half",
		"halfst",
		"halfen",
		"halft",
		"helfest",
		"helfet",
		"hülfe",
		"hälfe",
		"hülfest",
		"hülfen",
		"hälfen",
		"hülfet",
		"hilf",
	],
};
