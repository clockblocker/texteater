/** Surrounding prose keeps each fixture's exact target spelling intact. */
const contexts: Record<string, readonly [string, string]> = {
	still: ["Im Haus war es ganz ", ", weil alle schon schliefen."],
	gelassen: ["Sie blieb auch unter Zeitdruck ", " und arbeitete weiter."],
	unruhig: ["Vor der Prüfung wurde er ", " und lief auf und ab."],
	hektisch: ["Am Bahnhof ging es ", " zu, weil mehrere Züge ausfielen."],
	ungeachtet: ["Die Wanderer gingen ", " des Regens weiter."],
	unbeschadet: ["Die Regel gilt ", " der bereits bestehenden Ansprüche."],
	trotzdem: ["Es regnete stark; wir gingen ", " spazieren."],
	gleichwohl: ["Der Plan war riskant; sie stimmte ihm ", " zu."],
	doch: ["Der Weg war lang, ", " wir erreichten die Hütte rechtzeitig."],
	der: ["Mir gefällt dieser Mantel besser als ", " dort im Schaufenster."],
	jener: ["Dieser Weg ist kürzer als ", " am Fluss."],
	oh: ["Als sie das Geschenk öffnete, sagte sie: „", ", wie schön!“"],
	oje: ["Beim Blick auf die Rechnung murmelte er: „", ", das wird teuer.“"],
	Abendlicht: ["Im warmen ", " leuchteten die Blätter golden."],
	Tageshelle: ["Bei voller ", " konnten wir den Weg gut erkennen."],
	Dunkelheit: ["Wir kamen erst nach Einbruch der ", " zu Hause an."],
	Abenddämmerung: ["In der ", " gingen die ersten Straßenlaternen an."],
	Morgendämmerung: ["Schon in der ", " brachen die Wanderer auf."],
	"Blaue Stunde": [
		"Die Fotografin sagte: „Die ",
		" ist ideal für diese Aufnahme.“",
	],
	nein: [
		"Auf die Frage nach einem weiteren Kaffee antwortete sie: „",
		", danke.“",
	],
	"sich gegenseitig": ["Die Nachbarn helfen ", " beim Einkaufen."],
	sich: ["Nach dem Spaziergang wusch er ", " die Hände."],
	"sich selbst": ["Nach diesem Erfolg glaubte sie wieder an ", "."],
	Bundeshauptstadt: ["Berlin ist die ", " Deutschlands."],
	Stadt: ["In dieser ", " gibt es ein großes Museum."],
	Deutschland: ["", " liegt in Mitteleuropa und hat neun Nachbarländer."],
	obgleich: ["Sie ging zu Fuß, ", " es stark regnete."],
	obschon: ["Er half uns, ", " er selbst wenig Zeit hatte."],
	wenngleich: ["Die Reise war schön, ", " etwas anstrengend."],
	"auch wenn": ["Wir fahren morgen los, ", " das Wetter schlecht bleibt."],
	Prozentsymbol: ["Das ", " steht direkt hinter der Zahl."],
	Prozentzeichen: ["Auf dem Schild fehlte hinter der 20 das ", "."],
	"v. H.": ["Im alten Vertrag steht ein Zinssatz von fünf ", " pro Jahr."],
	durchklingeln: [
		"Ich werde später kurz bei dir ",
		", um die Uhrzeit abzusprechen.",
	],
	kontaktieren: ["Bei Fragen können Sie unser Büro ", "."],
	"Der Zweck heiligt die Mittel": [
		"Er rechtfertigte seinen Betrug mit dem Satz: „",
		".“",
	],
	"eine Entscheidung fällen": ["Das Gericht muss heute ", "."],
	"sich entscheiden": [
		"Bis Freitag muss sie ",
		", welches Angebot sie annimmt.",
	],
	"eine Entscheidung aufschieben": [
		"Wir können nicht noch einmal ",
		", denn die Frist endet heute.",
	],
	"wie auch immer": [
		"Ob der Zug fährt oder nicht — ",
		", wir finden eine Lösung.",
	],
	jedenfalls: ["Ob alle kommen, weiß ich nicht; ich bin ", " dabei."],
	"den Wald vor lauter Bäumen nicht sehen": [
		"Bei so vielen Einzelheiten kann man leicht ",
		".",
	],
	"etwas glatt übersehen": ["Selbst beim zweiten Lesen kann man ", "."],
	"den Durchblick haben": [
		"Bei diesem komplizierten Plan möchte ich endlich ",
		".",
	],
	"Der frühe Vogel fängt den Wurm": [
		"Wir starteten noch vor Sonnenaufgang; mein Vater sagte: „",
		".“",
	],
	"Gut Ding will Weile haben": [
		"Als ich beim Backen ungeduldig wurde, sagte meine Mutter: „",
		".“",
	],
};

export function exampleContext(canonicalForm: string) {
	const context = contexts[canonicalForm];
	if (!context)
		throw new Error(`Missing example context for ${canonicalForm}.`);
	return { before: context[0], after: context[1] };
}

export const EXAMPLES_TEXT_TITLE = "exmaples to text";
export const EXAMPLES_SUBMISSION_KEY = "notes-study:examples";
