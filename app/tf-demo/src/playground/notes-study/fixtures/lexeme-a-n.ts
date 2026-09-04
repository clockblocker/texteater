import { type NoteStudyFixture, noteToken } from "../note-study-fixture";

export const lexemeANFixtures = [
	{
		slug: "Ruhig",
		family: "Lexeme",
		kind: "ADJ",
		emoji: "🤫",
		title: [noteToken("ruhig", "reference", "ruhig, adjective")],
		titleText: "ruhig",
		ipa: "/ˈʁuːɪç/",
		pronunciationHref: "https://youglish.com/pronounce/ruhig/german",
		summary: "Ohne Unruhe, Lärm oder Hast.",
		contexts: [
			[
				"Am frühen Morgen war der See vollkommen ",
				noteToken("ruhig", "reference", "ruhig, adjective"),
				".",
			],
			[
				"Bitte bleib ",
				noteToken("ruhig", "reference", "ruhig, adjective"),
				", während ich die Wunde verbinde.",
			],
		],
		definition:
			"Ohne störende Bewegung oder Geräusche; auch: innerlich gelassen und nicht aufgeregt.",
		relations: [
			{
				relation: "synonym",
				mark: "=",
				label: "Synonym",
				content: [noteToken("still", "reference", "still, adjective")],
			},
			{
				relation: "nearSynonym",
				mark: "≈",
				label: "Nahes Synonym",
				content: [
					noteToken("gelassen", "reference", "gelassen, adjective"),
				],
			},
			{
				relation: "antonym",
				mark: "≠",
				label: "Antonym",
				content: [
					noteToken("unruhig", "reference", "unruhig, adjective"),
				],
			},
			{
				relation: "nearAntonym",
				mark: "≉",
				label: "Nahes Antonym",
				content: [
					noteToken("hektisch", "reference", "hektisch, adjective"),
				],
			},
		],
		formation: [
			[
				noteToken("ruh", "reference", "ruh, stem of Ruhe"),
				"|",
				noteToken("ig", "reference", "ig, adjective-forming suffix"),
			],
		],
		translations: ["calm; quiet", "спокойный; тихий"],
		forms: [
			{
				label: "Positiv",
				content: [noteToken("ruhig", "reference", "positive form")],
			},
			{
				label: "Komparativ",
				content: [
					noteToken("ruhiger", "reference", "comparative form"),
				],
			},
			{
				label: "Superlativ",
				content: [
					"am ",
					noteToken("ruhigsten", "reference", "superlative form"),
				],
			},
		],
		tags: [noteToken("#Adjektiv"), noteToken("#Grundwortschatz")],
	},
	{
		slug: "Trotz",
		family: "Lexeme",
		kind: "ADP",
		emoji: "🧱",
		title: [noteToken("trotz", "reference", "trotz, preposition")],
		titleText: "trotz",
		ipa: "/tʁɔt͡s/",
		pronunciationHref: "https://youglish.com/pronounce/trotz/german",
		summary: "Ein Hindernis ändert das Ergebnis nicht.",
		contexts: [
			[
				noteToken("Trotz", "reference", "trotz, preposition"),
				" des starken Regens gingen wir zu Fuß nach Hause.",
			],
			[
				"Sie bestand die Prüfung ",
				noteToken("trotz", "reference", "trotz, preposition"),
				" ihrer großen Nervosität.",
			],
		],
		definition:
			"Bezeichnet einen Umstand, der etwas erwarten ließe, das genannte Ergebnis aber nicht verhindert; meist mit Genitiv. Die Präposition ist lexikalisiert, nicht produktiv gebildet.",
		relations: [
			{
				relation: "synonym",
				mark: "=",
				label: "Synonym",
				content: [
					noteToken(
						"ungeachtet",
						"reference",
						"ungeachtet, preposition",
					),
				],
			},
			{
				relation: "nearSynonym",
				mark: "≈",
				label: "Nahes Synonym",
				content: [
					noteToken(
						"unbeschadet",
						"reference",
						"unbeschadet, preposition",
					),
				],
			},
		],
		translations: ["despite; in spite of", "несмотря на; вопреки"],
		tags: [noteToken("#Präposition"), noteToken("#Genitiv")],
	},
	{
		slug: "Dennoch",
		family: "Lexeme",
		kind: "ADV",
		emoji: "↩️",
		title: [noteToken("dennoch", "reference", "dennoch, adverb")],
		titleText: "dennoch",
		ipa: "/ˈdɛnɔx/",
		pronunciationHref: "https://youglish.com/pronounce/dennoch/german",
		summary: "Etwas gilt entgegen der vorherigen Erwartung.",
		contexts: [
			[
				"Der Weg war lang; ",
				noteToken("dennoch", "reference", "dennoch, adverb"),
				" erreichten wir die Hütte vor Einbruch der Dunkelheit.",
			],
			[
				"Sie hatte kaum geschlafen und arbeitete ",
				noteToken("dennoch", "reference", "dennoch, adverb"),
				" konzentriert weiter.",
			],
		],
		definition:
			"Verknüpft eine Aussage mit einem Gegensatz zur vorherigen Erwartung; die Verbindung aus denn und noch ist heute lexikalisiert, nicht produktiv.",
		relations: [
			{
				relation: "synonym",
				mark: "=",
				label: "Synonym",
				content: [
					noteToken("trotzdem", "reference", "trotzdem, adverb"),
				],
			},
			{
				relation: "nearSynonym",
				mark: "≈",
				label: "Nahes Synonym",
				content: [
					noteToken("gleichwohl", "reference", "gleichwohl, adverb"),
				],
			},
		],
		translations: ["nevertheless; nonetheless", "тем не менее; всё же"],
		tags: [noteToken("#Adverb"), noteToken("#Konnektor")],
	},
	{
		slug: "Sein",
		family: "Lexeme",
		kind: "AUX",
		emoji: "🔗",
		title: [noteToken("sein", "reference", "sein, auxiliary verb")],
		titleText: "sein",
		ipa: "/zaɪ̯n/",
		pronunciationHref: "https://youglish.com/pronounce/sein/german",
		summary: "Ein unregelmäßiges Hilfsverb für zusammengesetzte Zeiten.",
		contexts: [
			[
				"Der letzte Zug ",
				noteToken(
					"ist",
					"reference",
					"ist, form of sein, auxiliary verb",
				),
				" bereits abgefahren.",
			],
			[
				"Wir ",
				noteToken(
					"sind",
					"reference",
					"sind, form of sein, auxiliary verb",
				),
				" gestern erst spät angekommen.",
			],
		],
		definition:
			"Bildet das Perfekt besonders bei Verben der Bewegung und Zustandsänderung; seine Flexion ist suppletiv und folgt keinem produktiven Wortbildungsmuster.",
		translations: ["to be; auxiliary be", "быть; вспомогательный глагол"],
		forms: [
			{
				label: "Präsens",
				content: [
					noteToken(
						"bin",
						"reference",
						"first-person singular present",
					),
					", ",
					noteToken(
						"bist",
						"reference",
						"second-person singular present",
					),
					", ",
					noteToken(
						"ist",
						"reference",
						"third-person singular present",
					),
					", ",
					noteToken(
						"sind",
						"reference",
						"first- and third-person plural present",
					),
					", ",
					noteToken(
						"seid",
						"reference",
						"second-person plural present",
					),
				],
			},
			{
				label: "Präteritum",
				content: [
					noteToken("war", "reference", "singular preterite form"),
					", ",
					noteToken("waren", "reference", "plural preterite form"),
				],
			},
			{
				label: "Partizip II",
				content: [noteToken("gewesen", "reference", "past participle")],
			},
		],
		tags: [noteToken("#Hilfsverb"), noteToken("#Unregelmäßig")],
	},
	{
		slug: "Aber",
		family: "Lexeme",
		kind: "CCONJ",
		emoji: "↔️",
		title: [
			noteToken("aber", "reference", "aber, coordinating conjunction"),
		],
		titleText: "aber",
		ipa: "/ˈaːbɐ/",
		pronunciationHref: "https://youglish.com/pronounce/aber/german",
		summary: "Verbindet zwei Aussagen mit einem Gegensatz.",
		contexts: [
			[
				"Ich würde gern mitkommen, ",
				noteToken(
					"aber",
					"reference",
					"aber, coordinating conjunction",
				),
				" ich muss heute länger arbeiten.",
			],
			[
				"Das Zimmer ist klein, ",
				noteToken(
					"aber",
					"reference",
					"aber, coordinating conjunction",
				),
				" sehr hell.",
			],
		],
		definition:
			"Leitet einen Gegensatz oder eine Einschränkung ein und verbindet gleichrangige Wörter, Wortgruppen oder Sätze; die Konjunktion selbst ist nicht produktiv gebildet.",
		relations: [
			{
				relation: "synonym",
				mark: "=",
				label: "Synonym",
				content: [
					noteToken(
						"doch",
						"reference",
						"doch, coordinating conjunction",
					),
				],
			},
		],
		translations: ["but", "но; однако"],
		tags: [noteToken("#Konjunktion"), noteToken("#Koordinierend")],
	},
	{
		slug: "Dieser",
		family: "Lexeme",
		kind: "DET",
		emoji: "👉",
		title: [
			noteToken(
				"dieser",
				"reference",
				"dieser, demonstrative determiner",
			),
		],
		titleText: "dieser",
		ipa: "/ˈdiːzɐ/",
		pronunciationHref: "https://youglish.com/pronounce/dieser/german",
		summary: "Hebt eine bestimmte Person oder Sache hervor.",
		contexts: [
			[
				noteToken(
					"Dieser",
					"reference",
					"dieser, demonstrative determiner",
				),
				" Schlüssel öffnet die Tür zum Innenhof.",
			],
			[
				"An ",
				noteToken(
					"diesem",
					"reference",
					"diesem, inflected demonstrative determiner",
				),
				" Abend begann es früh zu schneien.",
			],
		],
		definition:
			"Bestimmt ein Nomen demonstrativ und weist auf eine konkrete, im Zusammenhang erkennbare Person oder Sache hin.",
		relations: [
			{
				relation: "nearSynonym",
				mark: "≈",
				label: "Nahes Synonym",
				content: [
					noteToken("der", "reference", "der, definite determiner"),
				],
			},
			{
				relation: "nearAntonym",
				mark: "≉",
				label: "Nahes Antonym",
				content: [
					noteToken(
						"jener",
						"reference",
						"jener, distal demonstrative determiner",
					),
				],
			},
		],
		translations: ["this; this one", "этот"],
		formTable: {
			rowLabel: "Kasus",
			columnLabels: ["Maskulin", "Feminin", "Neuter", "Plural"],
			rows: [
				{
					label: "N",
					cells: [
						[
							noteToken(
								"dieser",
								"masculine",
								"masculine nominative",
							),
						],
						[noteToken("diese", "feminine", "feminine nominative")],
						[noteToken("dieses", "neuter", "neuter nominative")],
						[noteToken("diese", "plural", "plural nominative")],
					],
				},
				{
					label: "A",
					cells: [
						[
							noteToken(
								"diesen",
								"masculine",
								"masculine accusative",
							),
						],
						[noteToken("diese", "feminine", "feminine accusative")],
						[noteToken("dieses", "neuter", "neuter accusative")],
						[noteToken("diese", "plural", "plural accusative")],
					],
				},
				{
					label: "G",
					cells: [
						[
							noteToken(
								"dieses",
								"masculine",
								"masculine genitive",
							),
						],
						[noteToken("dieser", "feminine", "feminine genitive")],
						[noteToken("dieses", "neuter", "neuter genitive")],
						[noteToken("dieser", "plural", "plural genitive")],
					],
				},
				{
					label: "D",
					cells: [
						[noteToken("diesem", "masculine", "masculine dative")],
						[noteToken("dieser", "feminine", "feminine dative")],
						[noteToken("diesem", "neuter", "neuter dative")],
						[noteToken("diesen", "plural", "plural dative")],
					],
				},
			],
		},
		tags: [noteToken("#Determinierer"), noteToken("#Demonstrativ")],
	},
	{
		slug: "Ach",
		family: "Lexeme",
		kind: "INTJ",
		emoji: "😮",
		title: [noteToken("ach", "reference", "ach, interjection")],
		titleText: "ach",
		ipa: "/ax/",
		pronunciationHref: "https://youglish.com/pronounce/ach/german",
		summary: "Ein spontaner Ausruf mit vielen möglichen Gefühlen.",
		contexts: [
			[
				noteToken("Ach", "reference", "ach, interjection"),
				", das hatte ich völlig vergessen!",
			],
			[
				"„",
				noteToken("Ach", "reference", "ach, interjection"),
				", wie schön es hier ist“, sagte sie leise.",
			],
		],
		definition:
			"Drückt spontan etwa Bedauern, Überraschung, Erleichterung oder Bewunderung aus; die einfache Form ist nicht produktiv gebildet.",
		relations: [
			{
				relation: "nearSynonym",
				mark: "≈",
				label: "Nahes Synonym",
				content: [
					noteToken("oh", "reference", "oh, interjection"),
					", ",
					noteToken("oje", "reference", "oje, interjection"),
				],
			},
		],
		translations: ["oh; ah; alas", "ах; ох"],
		tags: [noteToken("#Interjektion"), noteToken("#Ausruf")],
	},
	{
		slug: "Daemmerung",
		family: "Lexeme",
		kind: "NOUN",
		emoji: "🌒",
		title: [
			"die ",
			noteToken("Dämmerung", "feminine", "Dämmerung, feminine noun"),
		],
		titleText: "Dämmerung",
		ipa: "/ˈdɛmərʊŋ/",
		pronunciationHref:
			"https://youglish.com/pronounce/D%C3%A4mmerung/german",
		summary: "Das Licht zwischen Tag und Nacht.",
		contexts: [
			[
				"Die ",
				noteToken("Dämmerung", "feminine", "Dämmerung, feminine noun"),
				" legte sich langsam über den See, und am gegenüberliegenden Ufer gingen die ersten Lichter an.",
			],
			[
				"Wir machten uns noch vor der ",
				noteToken("Dämmerung", "feminine", "Dämmerung, feminine noun"),
				" auf den Rückweg, damit wir den schmalen Pfad erkennen konnten.",
			],
		],
		contextTone: "feminine",
		definition:
			"Zeit des schwachen, wechselnden Lichts vor Sonnenaufgang oder nach Sonnenuntergang.",
		relations: [
			{
				relation: "synonym",
				mark: "=",
				label: "Synonym",
				content: [
					noteToken(
						"Zwielicht",
						"shadow",
						"Zwielicht, Unit Shadow, neuter noun",
					),
				],
			},
			{
				relation: "nearSynonym",
				mark: "≈",
				label: "Nahes Synonym",
				content: [
					noteToken(
						"Abendlicht",
						"neuter",
						"Abendlicht, neuter noun",
					),
					", ",
					noteToken(
						"Sonnenuntergang",
						"shadow",
						"Sonnenuntergang, Unit Shadow, masculine noun",
					),
				],
			},
			{
				relation: "antonym",
				mark: "≠",
				label: "Antonym",
				content: [
					noteToken(
						"Tageshelle",
						"feminine",
						"Tageshelle, feminine noun",
					),
				],
			},
			{
				relation: "nearAntonym",
				mark: "≉",
				label: "Nahes Antonym",
				content: [
					noteToken(
						"Tageslicht",
						"shadow",
						"Tageslicht, Unit Shadow, neuter noun",
					),
					", ",
					noteToken(
						"Dunkelheit",
						"feminine",
						"Dunkelheit, feminine noun",
					),
				],
			},
			{
				relation: "hypernym",
				mark: "↑",
				label: "Oberbegriff",
				content: [
					noteToken(
						"Lichtzustand",
						"shadow",
						"Lichtzustand, Unit Shadow, masculine noun",
					),
				],
			},
			{
				relation: "hyponym",
				mark: "↓",
				label: "Unterbegriff",
				content: [
					noteToken(
						"Abenddämmerung",
						"feminine",
						"Abenddämmerung, feminine noun",
					),
					", ",
					noteToken(
						"Morgendämmerung",
						"feminine",
						"Morgendämmerung, feminine noun",
					),
				],
			},
			{
				relation: "holonym",
				mark: "⊂",
				label: "Teil von",
				content: [
					noteToken(
						"Tageslauf",
						"shadow",
						"Tageslauf, Unit Shadow, masculine noun",
					),
				],
			},
			{
				relation: "meronym",
				mark: "⊃",
				label: "Enthält",
				content: [
					noteToken(
						"Blaue Stunde",
						"feminine",
						"Blaue Stunde, feminine noun",
					),
				],
			},
		],
		formation: [
			[
				noteToken(
					"dämmer",
					"reference",
					"dämmer, root morpheme",
					"/playground/notes-study/Fahr",
				),
				"|",
				noteToken(
					"ung",
					"feminine",
					"ung, feminine noun-forming suffix",
				),
			],
		],
		translations: ["twilight; dusk", "закат;"],
		forms: [
			{
				label: "N",
				content: [
					"die ",
					noteToken(
						"Dämmerung",
						"feminine",
						"Dämmerung, feminine noun",
					),
					", die ",
					noteToken(
						"Dämmerungen",
						"plural",
						"Dämmerungen, feminine noun, plural",
					),
				],
			},
			{
				label: "A",
				content: [
					"die ",
					noteToken(
						"Dämmerung",
						"feminine",
						"Dämmerung, feminine noun",
					),
					", die ",
					noteToken(
						"Dämmerungen",
						"plural",
						"Dämmerungen, feminine noun, plural",
					),
				],
			},
			{
				label: "G",
				content: [
					"der ",
					noteToken(
						"Dämmerung",
						"feminine",
						"Dämmerung, feminine noun",
					),
					", der ",
					noteToken(
						"Dämmerungen",
						"plural",
						"Dämmerungen, feminine noun, plural",
					),
				],
			},
			{
				label: "D",
				content: [
					"der ",
					noteToken(
						"Dämmerung",
						"feminine",
						"Dämmerung, feminine noun",
					),
					", den ",
					noteToken(
						"Dämmerungen",
						"plural",
						"Dämmerungen, feminine noun, plural",
					),
				],
			},
		],
		tags: [
			noteToken("#Nomen", "reference", "Nomen"),
			noteToken("#Feminin", "feminine", "Feminin"),
		],
	},
	{
		slug: "Drei",
		family: "Lexeme",
		kind: "NUM",
		emoji: "3️⃣",
		title: [noteToken("drei", "reference", "drei, cardinal numeral")],
		titleText: "drei",
		ipa: "/dʁaɪ̯/",
		pronunciationHref: "https://youglish.com/pronounce/drei/german",
		summary: "Die Kardinalzahl zwischen zwei und vier.",
		contexts: [
			[
				"Für den Teig brauchen wir ",
				noteToken("drei", "reference", "drei, cardinal numeral"),
				" Eier.",
			],
			[
				"Der Zug fährt in ",
				noteToken("drei", "reference", "drei, cardinal numeral"),
				" Minuten ab.",
			],
		],
		definition:
			"Bezeichnet die Anzahl 3, also eine Einheit mehr als zwei und eine weniger als vier.",
		relations: [
			{
				relation: "synonym",
				mark: "=",
				label: "Synonym",
				content: [
					noteToken(
						"3",
						"shadow",
						"3, Unit Shadow, numeral notation",
					),
				],
			},
		],
		translations: ["three", "три"],
		tags: [noteToken("#Numerale"), noteToken("#Kardinalzahl")],
	},
] as const satisfies readonly NoteStudyFixture[];
