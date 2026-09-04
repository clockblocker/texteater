import { type NoteStudyFixture, noteToken } from "../note-study-fixture";

export const lexemePZFixtures = [
	{
		slug: "Doch",
		family: "Lexeme",
		kind: "PART",
		emoji: "💬",
		title: [noteToken("doch", "reference", "unveränderliche Partikel")],
		titleText: "doch",
		ipa: "/dɔx/",
		pronunciationHref: "https://youglish.com/pronounce/doch/german",
		summary: "Widerspricht oder erinnert an eine gemeinsame Erwartung.",
		contexts: [
			[
				"„Kommst du nicht mit?“ — „",
				noteToken("Doch", "reference", "Antwortpartikel"),
				", ich bin gleich fertig.“",
			],
			[
				"Du weißt ",
				noteToken("doch", "reference", "Abtönungspartikel"),
				", dass die Bibliothek montags geschlossen ist.",
			],
		],
		definition:
			"Unveränderliche Partikel, die einer Verneinung widerspricht oder an eine gemeinsame Erwartung erinnert.",
		relations: [
			{
				relation: "nearSynonym",
				label: "Nahes Synonym",
				mark: "≈",
				content: [
					noteToken("ja", "reference", "Abtönungspartikel"),
					", ",
					noteToken("eben", "reference", "Abtönungspartikel"),
				],
			},
			{
				relation: "antonym",
				label: "Antonym",
				mark: "≠",
				content: [noteToken("nein", "reference", "Antwortpartikel")],
			},
		],
		translations: [
			"after all; yes (contradicting a negative)",
			"ведь; же; всё-таки; напротив",
		],
		tags: [noteToken("#Partikel"), noteToken("#Unveränderlich")],
	},
	{
		slug: "Einander",
		family: "Lexeme",
		kind: "PRON",
		emoji: "🤝",
		title: [noteToken("einander", "reference", "reziprokes Pronomen")],
		titleText: "einander",
		ipa: "/aɪ̯ˈnandɐ/",
		pronunciationHref: "https://youglish.com/pronounce/einander/german",
		summary: "Bezeichnet eine wechselseitige Beziehung.",
		contexts: [
			[
				"Nach dem Streit hörten sie ",
				noteToken("einander", "reference", "Dativ"),
				" endlich wieder zu.",
			],
			[
				"Die beiden Teams begrüßten ",
				noteToken("einander", "reference", "Akkusativ"),
				" vor dem Spiel.",
			],
		],
		definition:
			"Unveränderliches Pronomen für eine wechselseitige Beziehung zwischen mehreren Beteiligten; Dativ und Akkusativ sehen gleich aus.",
		relations: [
			{
				relation: "synonym",
				label: "Synonym",
				mark: "=",
				content: [
					noteToken(
						"sich gegenseitig",
						"reference",
						"reziproke Umschreibung",
					),
				],
			},
			{
				relation: "nearSynonym",
				label: "Nahes Synonym",
				mark: "≈",
				content: [
					noteToken(
						"sich",
						"reference",
						"im Kontext auch reziprok lesbar",
					),
				],
			},
			{
				relation: "antonym",
				label: "Antonym",
				mark: "≠",
				content: [
					noteToken("sich selbst", "reference", "reflexive Lesart"),
				],
			},
		],
		formation: [
			[
				noteToken("ein", "reference", "erster Bestandteil"),
				"|",
				noteToken("ander", "reference", "zweiter Bestandteil"),
			],
		],
		translations: ["each other; one another", "друг друга; друг другу"],
		tags: [noteToken("#Pronomen"), noteToken("#Reziprok")],
	},
	{
		slug: "Berlin",
		family: "Lexeme",
		kind: "PROPN",
		emoji: "🐻",
		title: [noteToken("Berlin", "neuter", "neutrales Städtenomen")],
		titleText: "Berlin",
		ipa: "/bɛʁˈliːn/",
		pronunciationHref: "https://youglish.com/pronounce/Berlin/german",
		summary: "Name der deutschen Hauptstadt.",
		contexts: [
			[
				"Nach dem Studium zog Mira nach ",
				noteToken("Berlin", "reference", "Stadtname"),
				" und fand dort eine Stelle in einem Verlag.",
			],
			[
				"Im Winter wird es in ",
				noteToken("Berlin", "reference", "Stadtname"),
				" früh dunkel, doch viele Museen bleiben lange geöffnet.",
			],
		],
		definition:
			"Eigenname der deutschen Hauptstadt; der Stadtname steht meist ohne Artikel und bildet kein produktives Wortbildungsmuster.",
		relations: [
			{
				relation: "synonym",
				label: "Synonym",
				mark: "=",
				content: [
					noteToken(
						"Bundeshauptstadt",
						"reference",
						"eindeutige Umschreibung im deutschen Kontext",
					),
				],
			},
			{
				relation: "hypernym",
				label: "Oberbegriff",
				mark: "↑",
				content: [noteToken("Stadt", "reference", "Oberbegriff")],
			},
			{
				relation: "holonym",
				label: "Teil von",
				mark: "⊂",
				content: [noteToken("Deutschland", "reference", "Ganzes")],
			},
		],
		translations: ["Berlin", "Берлин"],
		forms: [
			{
				label: "N/A/D",
				content: [noteToken("Berlin", "reference", "artikellos")],
			},
			{
				label: "G",
				content: [noteToken("Berlins", "reference", "Genitiv")],
			},
			{
				label: "mit Attribut",
				content: [
					"das heutige ",
					noteToken("Berlin", "neuter", "Neutrum mit Artikel"),
				],
			},
		],
		tags: [
			noteToken("#Eigenname"),
			noteToken("#Neutrum", "neuter", "grammatisches Genus"),
		],
	},
	{
		slug: "Obwohl",
		family: "Lexeme",
		kind: "SCONJ",
		emoji: "↔️",
		title: [noteToken("obwohl", "reference", "konzessive Subjunktion")],
		titleText: "obwohl",
		ipa: "/ɔpˈvoːl/",
		pronunciationHref: "https://youglish.com/pronounce/obwohl/german",
		summary: "Leitet einen unerwarteten Gegensatz ein.",
		contexts: [
			[
				noteToken("Obwohl", "reference", "Subjunktion"),
				" der Zug Verspätung hatte, kamen wir noch rechtzeitig an.",
			],
			[
				"Sie ging spazieren, ",
				noteToken("obwohl", "reference", "Subjunktion"),
				" es bereits dunkel wurde.",
			],
		],
		definition:
			"Unveränderliche Subjunktion, die einen unerwarteten Gegensatz ausdrückt und gewöhnlich einen Nebensatz mit Verbendstellung einleitet.",
		relations: [
			{
				relation: "synonym",
				label: "Synonym",
				mark: "=",
				content: [
					noteToken("obgleich", "reference", "gehobene Subjunktion"),
					", ",
					noteToken("obschon", "reference", "seltene Subjunktion"),
				],
			},
			{
				relation: "nearSynonym",
				label: "Nahes Synonym",
				mark: "≈",
				content: [
					noteToken(
						"wenngleich",
						"reference",
						"gehobene Subjunktion",
					),
					", ",
					noteToken(
						"auch wenn",
						"reference",
						"konzessive Verbindung",
					),
				],
			},
		],
		formation: [
			[
				noteToken("ob", "reference", "erster Bestandteil"),
				"|",
				noteToken("wohl", "reference", "zweiter Bestandteil"),
			],
		],
		translations: ["although; even though", "хотя; несмотря на то что"],
		tags: [noteToken("#Subjunktion"), noteToken("#Konzessiv")],
	},
	{
		slug: "%",
		family: "Lexeme",
		kind: "SYM",
		emoji: "💯",
		title: [noteToken("%", "reference", "Prozentzeichen")],
		titleText: "%",
		ipa: "/pʁoˈtsɛnt/",
		pronunciationHref: "https://youglish.com/pronounce/Prozent/german",
		summary: "Kennzeichnet einen Anteil von hundert.",
		contexts: [
			[
				"Die Mehrwertsteuer beträgt 19 ",
				noteToken("%", "reference", "Prozentzeichen"),
				".",
			],
			[
				"Auf alle Artikel gibt es heute 20 ",
				noteToken("%", "reference", "Prozentzeichen"),
				" Rabatt.",
			],
		],
		definition:
			"Symbol %, das einen Anteil von hundert bezeichnet; im deutschen Schriftsatz steht es bei Zahlen gewöhnlich mit Abstand.",
		relations: [
			{
				relation: "synonym",
				label: "Synonym",
				mark: "=",
				content: [
					noteToken(
						"Prozentsymbol",
						"reference",
						"gleichbedeutendes Symbolwort",
					),
					", ",
					noteToken(
						"Prozentzeichen",
						"reference",
						"gleichbedeutendes Symbolwort",
					),
				],
			},
			{
				relation: "nearSynonym",
				label: "Nahes Synonym",
				mark: "≈",
				content: [
					noteToken(
						"v. H.",
						"reference",
						"Abkürzung für von Hundert",
					),
				],
			},
		],
		translations: ["percent sign", "знак процента"],
		tags: [noteToken("#Symbol")],
	},
	{
		slug: "Anrufen",
		family: "Lexeme",
		kind: "VERB",
		emoji: "📞",
		title: [noteToken("anrufen", "reference", "trennbares starkes Verb")],
		titleText: "anrufen",
		ipa: "/ˈanˌʁuːfn̩/",
		pronunciationHref: "https://youglish.com/pronounce/anrufen/german",
		summary: "Telefonisch Kontakt mit jemandem aufnehmen.",
		contexts: [
			[
				"Ich ",
				noteToken("rufe", "reference", "finites Verb"),
				" dich heute Abend ",
				noteToken("an", "reference", "abgetrenntes Präverb"),
				", sobald ich zu Hause bin.",
			],
			[
				"Bitte ",
				noteToken("rufen", "reference", "Höflichkeitsimperativ"),
				" Sie die Praxis ",
				noteToken("an", "reference", "abgetrenntes Präverb"),
				", wenn die Schmerzen stärker werden.",
			],
		],
		definition:
			"Mit jemandem telefonisch Kontakt aufnehmen; das starke Verb ist trennbar und verlangt häufig ein Akkusativobjekt.",
		relations: [
			{
				relation: "nearSynonym",
				label: "Nahes Synonym",
				mark: "≈",
				content: [
					noteToken(
						"durchklingeln",
						"reference",
						"umgangssprachliches Verb",
					),
				],
			},
			{
				relation: "hypernym",
				label: "Oberbegriff",
				mark: "↑",
				content: [
					noteToken("kontaktieren", "reference", "Oberbegriff"),
				],
			},
		],
		formation: [
			[
				noteToken("an", "reference", "trennbares Präverb"),
				"|",
				noteToken("rufen", "reference", "starkes Verb"),
			],
		],
		translations: ["to call; to phone", "звонить; позвонить"],
		forms: [
			{
				label: "Inf.",
				content: [noteToken("anrufen", "reference", "Infinitiv")],
			},
			{
				label: "Präs.",
				content: [
					"ich ",
					noteToken("rufe", "reference", "Präsens"),
					" … ",
					noteToken("an", "reference", "abgetrenntes Präverb"),
				],
			},
			{
				label: "Prät.",
				content: [
					"ich ",
					noteToken("rief", "reference", "Präteritum"),
					" … ",
					noteToken("an", "reference", "abgetrenntes Präverb"),
				],
			},
			{
				label: "Perf.",
				content: [
					"hat ",
					noteToken("angerufen", "reference", "Partizip II"),
				],
			},
			{
				label: "Imp.",
				content: [
					noteToken("ruf", "reference", "Imperativ Singular"),
					" … ",
					noteToken("an", "reference", "abgetrenntes Präverb"),
					"!",
				],
			},
		],
		tags: [noteToken("#Verb"), noteToken("#Trennbar"), noteToken("#Stark")],
	},
	{
		slug: "Lorem",
		family: "Lexeme",
		kind: "X",
		emoji: "🧩",
		title: [
			noteToken("Lorem", "reference", "fremdsprachiger Platzhaltertoken"),
		],
		titleText: "Lorem",
		summary: "Platzhaltertoken ohne eigene deutsche Wortbedeutung.",
		contexts: [
			[
				"Im Layoutentwurf stand noch „",
				noteToken("Lorem", "reference", "Platzhaltertoken"),
				" ",
				noteToken("ipsum", "reference", "Teil des Platzhaltertexts"),
				"“, weil der endgültige Text fehlte.",
			],
			[
				"Als der Export plötzlich mit „",
				noteToken("Lorem", "reference", "Platzhaltertoken"),
				"“ begann, war klar, dass Beispieltext übrig geblieben war.",
			],
		],
		definition:
			"Fremdsprachiger Platzhaltertoken aus „Lorem ipsum“ ohne eigenständige deutsche Wortbedeutung; die X-Route hat kein produktives Formenschema.",
		translations: ["lorem (placeholder word)", "lorem (слово-заполнитель)"],
		tags: [noteToken("#Sonstiges"), noteToken("#Platzhalter")],
	},
] as const satisfies readonly NoteStudyFixture[];
