import {
	defineGoldenCaseCollection,
	type GoldenCaseRegistry,
} from "../../../../../../../../assembly";
import type { inputSchema, outputSchema } from "../../schemas";
import { resolvedOther } from "./builders";

const citation = (args: Parameters<typeof resolvedOther>[0]) =>
	resolvedOther(args);

const nominal = (
	args: Omit<Parameters<typeof resolvedOther>[0], "inflectionalFeatures"> & {
		readonly case: "Acc" | "Dat" | "Gen" | "Nom" | null;
		readonly gender: "Fem" | "Masc" | "Neut" | null;
		readonly number: "Plur" | "Sing" | null;
	},
) =>
	resolvedOther({
		...args,
		inflectionalFeatures: {
			case: args.case,
			gender: args.gender,
			mood: null,
			number: args.number,
			verbForm: null,
		},
	});

const verbal = (
	args: Omit<Parameters<typeof resolvedOther>[0], "inflectionalFeatures"> & {
		readonly mood: "Imp" | "Ind" | "Sub" | null;
		readonly number: "Plur" | "Sing" | null;
		readonly verbForm: "Fin" | "Inf" | "Part";
	},
) =>
	resolvedOther({
		...args,
		inflectionalFeatures: {
			case: null,
			gender: null,
			mood: args.mood,
			number: args.number,
			verbForm: args.verbForm,
		},
	});

export const formCases = defineGoldenCaseCollection(import.meta.url, {
	cases: {
		"grammar-de-x-demo-unknown-citation-zorp": {
			...citation({
				attested: "zorp",
				before: "Im Feld für nicht kategorisierte Wörter stand der Eintrag ",
				after: ".",
			}),
			explanation:
				"The upstream X identity is valid; the isolated form expresses no codec-supported inflection.",
		},
		"grammar-de-x-demo-foreign-whatever": {
			...citation({
				attested: "whatever",
				before: "In der sonst deutschen Unterhaltung antwortete sie nur ",
				after: ".",
				coreFeatures: { foreign: "Yes" },
			}),
		},
		"grammar-de-x-demo-inflection-glorp-dat": {
			...nominal({
				attested: "Glorp",
				before: "Mit dem ",
				after: " konnte niemand etwas anfangen.",
				case: "Dat",
				gender: "Neut",
				number: "Sing",
			}),
			explanation:
				"The unknown identity stays X while the German article licenses conservative case, gender, and number features.",
		},
		"grammar-de-x-demo-typo-watevr": {
			...citation({
				attested: "watevr",
				before: "Im Chat war mit dem fehlerhaft geschriebenen englischen Wort ",
				after: " eine gleichgültige Antwort gemeint.",
				normalized: "whatever",
				canonical: "whatever",
				memberOrthography: "Typo",
				coreFeatures: { foreign: "Yes" },
			}),
		},
		"grammar-de-x-demo-abbr-idk": {
			...citation({
				attested: "idk",
				before: "In ihrer deutschen Nachricht schrieb sie lediglich ",
				after: ".",
				coreFeatures: { abbr: "Yes", foreign: "Yes" },
			}),
		},
		"grammar-de-x-demo-fragment-unver": {
			...citation({
				attested: "unver",
				before: "Die Sprecherin begann mit ",
				after: "… und brach das Wort hörbar ab.",
			}),
			explanation:
				"The classified readable fragment remains ResolvableText/X; the unmarked interruption punctuation is context.",
		},
		"grammar-de-x-demo-inflection-nerpa-acc": {
			...nominal({
				attested: "Nerpa",
				before: "Die Testperson verschob die ",
				after: " ohne ihre Bedeutung zu kennen.",
				case: "Acc",
				gender: "Fem",
				number: "Sing",
			}),
			explanation:
				"The article and syntax license nominal Inflection even though the residual lexical identity remains X.",
		},
		"grammar-de-x-demo-inflection-plerke-sub": {
			...verbal({
				attested: "plerke",
				before: "Die Forscherin sagte, das Gerät ",
				after: " nur bei Vollmond.",
				canonical: "plerken",
				mood: "Sub",
				number: "Sing",
				verbForm: "Fin",
			}),
			explanation:
				"Indirect speech plus the transparent finite nonce form licenses Sub, Sing, and Fin while the Lemma remains the inferred infinitive.",
		},
		"grammar-de-x-dev-unknown-blarg-nom": {
			...nominal({
				attested: "Blarg",
				before: "Der ",
				after: " tauchte ohne Erklärung im Bericht auf.",
				case: "Nom",
				gender: "Masc",
				number: "Sing",
			}),
		},
		"grammar-de-x-dev-unknown-glorps-acc": {
			...nominal({
				attested: "Glorps",
				before: "Die Prüfer markierten die ",
				after: " im letzten Absatz.",
				canonical: "Glorp",
				case: "Acc",
				gender: null,
				number: "Plur",
			}),
		},
		"grammar-de-x-dev-unknown-glorpen-inf": {
			...verbal({
				attested: "glorpen",
				before: "Im Beispiel sollte die Figur morgen ",
				after: ", doch die Bedeutung blieb offen.",
				mood: null,
				number: null,
				verbForm: "Inf",
			}),
		},
		"grammar-de-x-dev-unknown-glorpt-fin": {
			...verbal({
				attested: "glorpt",
				before: "Laut der Versuchsanweisung ",
				after: " er jeden Morgen.",
				canonical: "glorpen",
				mood: "Ind",
				number: "Sing",
				verbForm: "Fin",
			}),
		},
		"grammar-de-x-dev-unknown-geglorpt-part": {
			...verbal({
				attested: "geglorpt",
				before: "Im erfundenen Bericht habe die Maschine bereits ",
				after: ".",
				canonical: "glorpen",
				mood: null,
				number: null,
				verbForm: "Part",
			}),
		},
		"grammar-de-x-dev-unknown-glorp-imp": {
			...verbal({
				attested: "Glorp",
				after: " jetzt, stand als unbekannte Anweisung auf dem Display!",
				normalized: "glorp",
				canonical: "glorpen",
				memberOrthography: "Standard",
				mood: "Imp",
				number: "Sing",
				verbForm: "Fin",
			}),
		},
		"grammar-de-x-dev-foreign-anyway": {
			...citation({
				attested: "anyway",
				before: "Mitten im deutschen Satz fügte er ",
				after: " ein und sprach weiter.",
				coreFeatures: { foreign: "Yes" },
			}),
		},
		"grammar-de-x-dev-foreign-low-key": {
			...citation({
				attested: "low-key",
				before: "Die Studentin nannte das Ergebnis ",
				after: " überraschend.",
				coreFeatures: { foreign: "Yes", hyph: "Yes" },
			}),
		},
		"grammar-de-x-dev-slang-cringe": {
			...citation({
				attested: "cringe",
				before: "In der Jugendgruppe fanden alle die Szene ziemlich ",
				after: ".",
			}),
			explanation:
				"The classified slang form is category-indeterminate here; loan origin alone does not force Foreign.",
		},
		"grammar-de-x-dev-slang-sus": {
			...citation({
				attested: "sus",
				before: "Im deutschsprachigen Spielchat wirkte die Erklärung sehr ",
				after: ".",
			}),
		},
		"grammar-de-x-dev-casing-whatever": {
			...citation({
				attested: "Whatever",
				after: " sagte sie am Anfang ihrer deutschen Antwort.",
				normalized: "whatever",
				memberOrthography: "Standard",
				canonical: "whatever",
				coreFeatures: { foreign: "Yes" },
			}),
		},
		"grammar-de-x-dev-archaic-thou": {
			...citation({
				attested: "thou",
				before: "Im historischen englischen Zitat blieb das Wort ",
				after: " unübersetzt.",
				historical: true,
				coreFeatures: { foreign: "Yes" },
			}),
		},
		"grammar-de-x-dev-variant-colour": {
			...citation({
				attested: "colour",
				before: "Die britische Schreibvariante ",
				after: " stand in der deutschen Notiz.",
				canonical: "color",
				spelling: "Variant",
				coreFeatures: { foreign: "Yes" },
			}),
		},
		"grammar-de-x-dev-mixed-w00t": {
			...citation({
				attested: "w00t",
				before: "Der alte Forenbeitrag endete mit dem Slangausdruck ",
				after: ".",
			}),
			explanation:
				"Mixed letters and digits are part of this licensed slang spelling and are not a Typo repair.",
		},
		"grammar-de-x-dev-repeated-whatever": {
			...citation({
				attested: "whatever",
				before: "Zuerst sagte sie whatever, später schrieb sie ",
				after: " noch einmal in den Chat.",
				coreFeatures: { foreign: "Yes" },
			}),
			explanation:
				"Only the second occurrence is supplied; the earlier identical form remains context.",
		},
		"grammar-de-x-dev-near-opaque-foobar": {
			...citation({
				attested: "foobar",
				before: "Der beschädigte Scan zeigte ????; im lesbaren technischen Kommentar stand ",
				after: ".",
			}),
			explanation:
				"The unmarked unreadable placeholder is OpaqueText; the marked, readable category-indeterminate token is X.",
		},
		"grammar-de-x-dev-near-known-routes-yeet": {
			...citation({
				attested: "yeet",
				before: "Neben dem Namen Paris, der Abkürzung z.B., dem Ausruf ach, dem Zeichen % und dem Verb laufen stand im Chat ",
				after: ".",
			}),
			explanation:
				"Unmarked PROPN, abbreviation, INTJ, SYM, and identifiable German POS controls do not reopen the fixed X route.",
		},
		"grammar-de-x-dev-alphanumeric-3d": {
			...citation({
				attested: "3D",
				before: "Die uneinheitlich annotierte Spalte enthielt den Eintrag ",
				after: " ohne weitere Kategorienangabe.",
				coreFeatures: { abbr: "Yes", numType: "Card" },
			}),
		},
		"grammar-de-x-accept-v2-unknown-quend": {
			...citation({
				attested: "quend",
				before: "Das Glossar führte den nicht weiter bestimmten Eintrag ",
				after: " auf.",
			}),
		},
		"grammar-de-x-accept-v2-unknown-zarg-nom-masc": {
			...nominal({
				attested: "Zarg",
				before: "Dieser ",
				after: " erschien plötzlich im Versuch, doch niemand kannte seine Bedeutung.",
				case: "Nom",
				gender: "Masc",
				number: "Sing",
			}),
		},
		"grammar-de-x-accept-v2-unknown-zorps-gen": {
			...nominal({
				attested: "Zorps",
				before: "Die Wirkung dieses ",
				after: " blieb unklar.",
				canonical: "Zorp",
				case: "Gen",
				gender: null,
				number: "Sing",
			}),
		},
		"grammar-de-x-accept-v2-unknown-nerge-sub": {
			...verbal({
				attested: "nerge",
				before: "Die Zeugin erklärte, der Apparat ",
				after: " während der Nacht.",
				canonical: "nergen",
				mood: "Sub",
				number: "Sing",
				verbForm: "Fin",
			}),
		},
		"grammar-de-x-accept-v2-foreign-random": {
			...citation({
				attested: "random",
				before: "Im ansonsten deutschen Gespräch nannte er die Entscheidung ausdrücklich ",
				after: ", wie im Englischen.",
				coreFeatures: { foreign: "Yes" },
			}),
		},
		"grammar-de-x-accept-v2-abbr-tbh": {
			...citation({
				attested: "tbh",
				before: "Vor ihrer Meinung schrieb sie im deutschen Chat ",
				after: ".",
				coreFeatures: { abbr: "Yes", foreign: "Yes" },
			}),
		},
		"grammar-de-x-accept-v2-fragment-trans": {
			...citation({
				attested: "trans",
				before: "Die Aufnahme brach mitten im begonnenen Wort nach ",
				after: "…",
			}),
		},
		"grammar-de-x-accept-v2-hyphen-off-grid": {
			...citation({
				attested: "off-grid",
				before: "Der englische Ausdruck ",
				after: " blieb im deutschen Gespräch unübersetzt.",
				coreFeatures: { foreign: "Yes", hyph: "Yes" },
			}),
		},
		"grammar-de-x-accept-v2-typo-wierd": {
			...citation({
				attested: "wierd",
				before: "Im deutsch-englischen Chat war mit dem Tippfehler ",
				after: " eindeutig weird gemeint.",
				normalized: "weird",
				canonical: "weird",
				memberOrthography: "Typo",
				coreFeatures: { foreign: "Yes" },
			}),
		},
		"grammar-de-x-accept-v2-archaic-hither": {
			...citation({
				attested: "hither",
				before: "Im ausdrücklich archaischen englischen Dialog stand ",
				after: " für eine Richtungsangabe.",
				historical: true,
				coreFeatures: { foreign: "Yes" },
			}),
		},
	} as const satisfies GoldenCaseRegistry<
		typeof inputSchema,
		typeof outputSchema
	>,
});
