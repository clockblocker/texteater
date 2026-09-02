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
		formation: [
			[
				"Schema-Probe: ",
				noteToken("doch", "reference", "Partikel"),
				" → unverändert; Partikeln werden nicht flektiert",
			],
		],
		translations: [
			"after all; yes (contradicting a negative)",
			"ведь; же; всё-таки; напротив",
		],
		forms: [
			{
				label: "Form",
				content: [noteToken("doch", "reference", "unveränderlich")],
			},
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
				noteToken(
					"ein",
					"reference",
					"historischer erster Bestandteil",
				),
				" + ",
				noteToken(
					"ander",
					"reference",
					"historischer zweiter Bestandteil",
				),
				" → ",
				noteToken("einander", "reference", "lexikalisierte Gesamtform"),
			],
			[
				"Die Bildung ist heute nicht produktiv; ",
				noteToken("einander", "reference", "Pronomen"),
				" wird als feste Einheit gelernt.",
			],
		],
		translations: ["each other; one another", "друг друга; друг другу"],
		forms: [
			{
				label: "A",
				content: [
					"Sie begrüßen ",
					noteToken("einander", "reference", "Akkusativ"),
					".",
				],
			},
			{
				label: "D",
				content: [
					"Sie helfen ",
					noteToken("einander", "reference", "Dativ"),
					".",
				],
			},
		],
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
		formation: [
			[
				"Schema-Probe: Eigenname → ",
				noteToken("Berlin", "reference", "feste Namensform"),
				"; keine produktive Ableitung",
			],
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
		slug: "Gedankenstrich",
		family: "Lexeme",
		kind: "PUNCT",
		emoji: "➖",
		title: [
			"der ",
			noteToken("Gedankenstrich", "masculine", "maskulines Satzzeichen"),
			", die ",
			noteToken("Gedankenstriche", "plural", "Plural"),
		],
		titleText: "der Gedankenstrich, die Gedankenstriche",
		ipa: "/ɡəˈdaŋkn̩ˌʃtʁɪç/",
		pronunciationHref:
			"https://youglish.com/pronounce/Gedankenstrich/german",
		summary:
			"Markiert einen Einschub oder deutlichen gedanklichen Wechsel.",
		contexts: [
			[
				"Vor dem überraschenden Nachtrag setzte die Lektorin einen ",
				noteToken("Gedankenstrich", "masculine", "Akkusativ Singular"),
				".",
			],
			[
				"In „Ich komme später ",
				noteToken("–", "reference", "Gedankenstrich"),
				" vielleicht erst morgen“ markiert der ",
				noteToken("Gedankenstrich", "masculine", "Nominativ Singular"),
				" eine deutliche Unterbrechung.",
			],
		],
		contextTone: "masculine",
		definition:
			"Satzzeichen (–), das einen Einschub, einen Nachtrag oder einen deutlichen Wechsel im Satz markiert.",
		formation: [
			[
				noteToken("Gedanke", "masculine", "maskulines Nomen"),
				" + ",
				noteToken("-n-", "reference", "Fugenelement"),
				" + ",
				noteToken("Strich", "masculine", "maskulines Nomen"),
				" → ",
				noteToken("Gedankenstrich", "masculine", "Kompositum"),
			],
		],
		translations: ["dash; em dash", "тире"],
		forms: [
			{
				label: "Zeichen",
				content: [noteToken("–", "reference", "Gedankenstrich")],
			},
			{
				label: "Sg.",
				content: [
					"der ",
					noteToken("Gedankenstrich", "masculine", "Singular"),
				],
			},
			{
				label: "Pl.",
				content: [
					"die ",
					noteToken("Gedankenstriche", "plural", "Plural"),
				],
			},
		],
		tags: [
			noteToken("#Interpunktion"),
			noteToken("#Maskulin", "masculine", "grammatisches Genus"),
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
				noteToken("ob", "reference", "historischer Bestandteil"),
				" + ",
				noteToken("wohl", "reference", "historischer Bestandteil"),
				" → ",
				noteToken("obwohl", "reference", "lexikalisierte Subjunktion"),
			],
			[
				"Das Muster ist im heutigen Deutsch nicht produktiv; ",
				noteToken("obwohl", "reference", "Subjunktion"),
				" wird als feste Einheit gebraucht.",
			],
		],
		translations: ["although; even though", "хотя; несмотря на то что"],
		forms: [
			{
				label: "Form",
				content: [noteToken("obwohl", "reference", "unveränderlich")],
			},
		],
		tags: [noteToken("#Subjunktion"), noteToken("#Konzessiv")],
	},
	{
		slug: "Prozentzeichen",
		family: "Lexeme",
		kind: "SYM",
		emoji: "💯",
		title: [
			"das ",
			noteToken("Prozentzeichen", "neuter", "neutrales Symbolwort"),
			", die ",
			noteToken("Prozentzeichen", "plural", "Plural"),
		],
		titleText: "das Prozentzeichen, die Prozentzeichen",
		ipa: "/pʁoˈtsɛntˌtsaɪ̯çn̩/",
		pronunciationHref:
			"https://youglish.com/pronounce/Prozentzeichen/german",
		summary: "Kennzeichnet einen Anteil von hundert.",
		contexts: [
			[
				"Im Bericht steht das ",
				noteToken("Prozentzeichen", "neuter", "Nominativ Singular"),
				" in der Angabe „12 ",
				noteToken("%", "reference", "Prozentzeichen"),
				"“.",
			],
			[
				"Die Software ersetzte das Wort „",
				noteToken("Prozent", "neuter", "neutrales Nomen"),
				"“ automatisch durch das ",
				noteToken("Prozentzeichen", "neuter", "Akkusativ Singular"),
				".",
			],
		],
		contextTone: "neuter",
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
		formation: [
			[
				noteToken("Prozent", "neuter", "neutrales Nomen"),
				" + ",
				noteToken("Zeichen", "neuter", "neutrales Nomen"),
				" → ",
				noteToken("Prozentzeichen", "neuter", "Kompositum"),
			],
		],
		translations: ["percent sign", "знак процента"],
		forms: [
			{
				label: "Zeichen",
				content: [noteToken("%", "reference", "Prozentzeichen")],
			},
			{
				label: "Schreibweise",
				content: ["12", noteToken(" %", "reference", "mit Abstand")],
			},
			{
				label: "Pl.",
				content: [
					"die ",
					noteToken("Prozentzeichen", "plural", "Plural"),
				],
			},
		],
		tags: [
			noteToken("#Symbol"),
			noteToken("#Neutrum", "neuter", "grammatisches Genus"),
		],
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
				relation: "synonym",
				label: "Synonym",
				mark: "=",
				content: [
					noteToken(
						"telefonisch kontaktieren",
						"reference",
						"gleichbedeutende Umschreibung",
					),
				],
			},
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
					", ",
					noteToken(
						"sich melden",
						"reference",
						"perspektivisch verwandt",
					),
				],
			},
			{
				relation: "nearAntonym",
				label: "Nahes Antonym",
				mark: "≉",
				content: [
					noteToken(
						"auflegen",
						"reference",
						"Telefongespräch beenden",
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
				noteToken("an-", "reference", "trennbares Präverb"),
				" + ",
				noteToken("rufen", "reference", "starkes Verb"),
				" → ",
				noteToken("anrufen", "reference", "Präverbfügung"),
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
		formation: [
			[
				"Schema-Probe: ",
				noteToken(
					"Lorem ipsum",
					"reference",
					"lateinischer Platzhaltertext",
				),
				" → ",
				noteToken("Lorem", "reference", "isolierter X-Token"),
				"; keine produktive Wortbildung",
			],
		],
		translations: ["lorem (placeholder word)", "lorem (слово-заполнитель)"],
		forms: [
			{
				label: "Belegform",
				content: [noteToken("Lorem", "reference", "unverändert")],
			},
		],
		tags: [noteToken("#Sonstiges"), noteToken("#Platzhalter")],
	},
] as const satisfies readonly NoteStudyFixture[];
