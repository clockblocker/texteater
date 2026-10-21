/**
 * One preposition that forms pronominal adverbs. `vowel` inserts the linking r
 * after da and wo (daran, worauf); hier never takes it (hieran). Its `emoji`
 * labels both its pronominal adverbs and its own generic ADP Reading
 * (`adpositions.ts`), so the two never drift apart.
 */
export type Preposition = {
	readonly text: string;
	readonly ipa: string;
	readonly vowel: boolean;
	readonly emoji: string;
	/** English for the demonstrative reading (`it` slot) and the wo forms (`what`/`which` slot). */
	readonly en: { readonly it: readonly string[]; readonly what: string };
	readonly ru: {
		readonly it: readonly string[];
		readonly what: readonly string[];
	};
	/** The Knowledge of its generic ADP Reading, the one its `emoji` labels. */
	readonly adposition: {
		readonly definition: string;
		readonly en: readonly string[];
		readonly ru: readonly string[];
	};
};

// Duden and IDS list the prepositions that fuse with da(r), hier and wo(r).
// wider and ob fuse only in fixed or archaic forms and are left out.
export const prepositions: readonly Preposition[] = [
	{
		text: "an",
		ipa: "ʁan",
		vowel: true,
		emoji: "📌",
		en: { it: ["on it", "about it"], what: "on {}" },
		ru: { it: ["на это", "об этом"], what: ["на что", "о чём"] },
		adposition: {
			definition:
				"Bezeichnet eine Stelle in unmittelbarer Nähe oder Berührung von etwas (wo?, mit Dativ) oder die Richtung dorthin (wohin?, mit Akkusativ): Das Bild hängt an der Wand. Wir sitzen am Fenster. Er setzt sich an den Tisch.",
			en: ["at", "on"],
			ru: ["у", "на"],
		},
	},
	{
		text: "auf",
		ipa: "ʁaʊ̯f",
		vowel: true,
		emoji: "🔝",
		en: { it: ["on it", "for it"], what: "for {}" },
		ru: { it: ["на это", "на этом"], what: ["на что"] },
		adposition: {
			definition:
				"Bezeichnet eine Stelle oben auf der Fläche von etwas (wo?, mit Dativ) oder die Richtung dorthin (wohin?, mit Akkusativ): Das Buch liegt auf dem Tisch. Sie legt das Handy auf den Tisch.",
			en: ["on", "onto"],
			ru: ["на"],
		},
	},
	{
		text: "aus",
		ipa: "ʁaʊ̯s",
		vowel: true,
		emoji: "📤",
		en: { it: ["out of it", "from it"], what: "out of {}" },
		ru: { it: ["из этого"], what: ["из чего"] },
		adposition: {
			definition:
				"Bezeichnet die Bewegung von innen nach außen, die Herkunft oder den Stoff, aus dem etwas ist: Er kommt aus dem Haus. Der Wein ist aus Italien. Der Tisch ist aus Holz.",
			en: ["out of", "from"],
			ru: ["из"],
		},
	},
	{
		text: "bei",
		ipa: "baɪ̯",
		vowel: false,
		emoji: "🤝",
		en: { it: ["at it", "in doing so"], what: "at {}" },
		ru: { it: ["при этом"], what: ["при чём"] },
		adposition: {
			definition:
				"Bezeichnet die Nähe zu einem Ort, den Ort, an dem jemand wohnt oder arbeitet, oder die Umstände, unter denen etwas geschieht: Potsdam liegt bei Berlin. Er wohnt bei seinen Eltern. Beim Essen sprechen wir nicht.",
			en: ["near", "at", "with"],
			ru: ["у", "при"],
		},
	},
	{
		text: "durch",
		ipa: "dʊʁç",
		vowel: false,
		emoji: "🚪",
		en: { it: ["through it", "thereby"], what: "through {}" },
		ru: {
			it: ["через это", "благодаря этому"],
			what: ["через что", "благодаря чему"],
		},
		adposition: {
			definition:
				"Bezeichnet eine Bewegung, die auf der einen Seite in etwas hinein- und auf der anderen wieder hinausführt, auch das Mittel oder die Ursache: Sie geht durch die Tür. Wir fahren durch die Stadt. Durch den Regen wurde es kalt.",
			en: ["through"],
			ru: ["через", "сквозь"],
		},
	},
	{
		text: "für",
		ipa: "fyːɐ̯",
		vowel: false,
		emoji: "🎁",
		en: { it: ["for it"], what: "for {}" },
		ru: { it: ["за это", "для этого"], what: ["за что", "для чего"] },
		adposition: {
			definition:
				"Bezeichnet, wem etwas gilt oder nützt, wozu es bestimmt ist oder was man im Tausch gibt: Das Geschenk ist für dich. Sie arbeitet für eine Bank. Er kauft das Rad für 50 Euro.",
			en: ["for"],
			ru: ["для", "за"],
		},
	},
	{
		text: "gegen",
		ipa: "ɡeːɡn̩",
		vowel: false,
		emoji: "🚧",
		en: { it: ["against it"], what: "against {}" },
		ru: { it: ["против этого"], what: ["против чего"] },
		adposition: {
			definition:
				"Bezeichnet einen Gegner, einen Widerstand oder etwas, worauf eine Bewegung trifft: Wir spielen gegen die Gäste. Er ist gegen den Plan. Der Ball prallt gegen die Wand.",
			en: ["against"],
			ru: ["против"],
		},
	},
	{
		text: "hinter",
		ipa: "hɪntɐ",
		vowel: false,
		emoji: "🔙",
		en: { it: ["behind it"], what: "behind {}" },
		ru: { it: ["за этим"], what: ["за чем"] },
		adposition: {
			definition:
				"Bezeichnet eine Stelle auf der Rückseite von etwas (wo?, mit Dativ) oder die Richtung dorthin (wohin?, mit Akkusativ): Der Garten liegt hinter dem Haus. Er stellt das Rad hinter die Garage.",
			en: ["behind"],
			ru: ["за", "позади"],
		},
	},
	{
		text: "in",
		ipa: "ʁɪn",
		vowel: true,
		emoji: "📥",
		en: { it: ["in it"], what: "in {}" },
		ru: { it: ["в этом", "в это"], what: ["в чём"] },
		adposition: {
			definition:
				"Bezeichnet eine Stelle innerhalb von etwas (wo?, mit Dativ) oder die Richtung dorthin (wohin?, mit Akkusativ), auch einen Zeitraum: Sie wohnt in Berlin. Er geht in die Küche. Im Winter schneit es.",
			en: ["in", "into"],
			ru: ["в"],
		},
	},
	{
		text: "mit",
		ipa: "mɪt",
		vowel: false,
		emoji: "🔗",
		en: { it: ["with it"], what: "with {}" },
		ru: { it: ["с этим", "этим"], what: ["с чем", "чем"] },
		adposition: {
			definition:
				"Bezeichnet, dass jemand oder etwas dabei ist oder dazugehört, auch das Mittel, das man benutzt: Er kommt mit seiner Schwester. Ich trinke Kaffee mit Milch. Sie fährt mit dem Bus.",
			en: ["with"],
			ru: ["с"],
		},
	},
	{
		text: "nach",
		ipa: "naːx",
		vowel: false,
		emoji: "🔜",
		en: { it: ["after that", "about it"], what: "after {}" },
		ru: { it: ["после этого", "об этом"], what: ["после чего", "о чём"] },
		adposition: {
			definition:
				"Bezeichnet, dass etwas zeitlich oder in einer Reihenfolge später kommt, auch die Richtung oder das Ziel, besonders bei Orten ohne Artikel: Nach dem Essen gehen wir spazieren. Du bist nach mir dran. Wir fahren nach Berlin. Er geht nach Hause.",
			en: ["after", "to"],
			ru: ["после", "в"],
		},
	},
	{
		text: "neben",
		ipa: "neːbn̩",
		vowel: false,
		emoji: "🧱",
		en: { it: ["next to it"], what: "next to {}" },
		ru: { it: ["рядом с этим"], what: ["рядом с чем"] },
		adposition: {
			definition:
				"Bezeichnet eine Stelle an der Seite von etwas (wo?, mit Dativ) oder die Richtung dorthin (wohin?, mit Akkusativ): Sie sitzt neben ihrem Bruder. Er stellt den Stuhl neben das Fenster.",
			en: ["next to", "beside"],
			ru: ["рядом с"],
		},
	},
	{
		text: "über",
		ipa: "ʁyːbɐ",
		vowel: true,
		emoji: "🌂",
		en: { it: ["about it", "over it"], what: "about {}" },
		ru: { it: ["об этом", "над этим"], what: ["о чём", "над чем"] },
		adposition: {
			definition:
				"Bezeichnet eine Stelle oberhalb von etwas oder eine Bewegung oben von einer Seite auf die andere, auch das Thema, um das es geht: Die Lampe hängt über dem Tisch. Wir gehen über die Brücke. Wir sehen einen Film über den Krieg.",
			en: ["over", "above", "about"],
			ru: ["над", "через", "о"],
		},
	},
	{
		text: "um",
		ipa: "ʁʊm",
		vowel: true,
		emoji: "🔄",
		en: { it: ["about it", "around it"], what: "about {}" },
		ru: { it: ["об этом", "вокруг этого"], what: ["о чём"] },
		adposition: {
			definition:
				"Bezeichnet eine Bewegung oder Lage im Kreis, in dessen Mitte etwas ist, auch eine genaue Uhrzeit: Wir sitzen um den Tisch. Er geht um das Haus. Der Zug fährt um acht Uhr.",
			en: ["around", "at"],
			ru: ["вокруг", "в"],
		},
	},
	{
		text: "unter",
		ipa: "ʁʊntɐ",
		vowel: true,
		emoji: "🕳",
		en: { it: ["under it", "by it"], what: "under {}" },
		ru: { it: ["под этим"], what: ["под чем"] },
		adposition: {
			definition:
				"Bezeichnet eine Stelle unterhalb von etwas (wo?, mit Dativ) oder die Richtung dorthin (wohin?, mit Akkusativ), auch eine Zugehörigkeit zu einer Menge: Die Katze liegt unter dem Tisch. Er legt den Brief unter das Buch. Unter den Gästen war ein Arzt.",
			en: ["under", "among"],
			ru: ["под", "среди"],
		},
	},
	{
		text: "von",
		ipa: "fɔn",
		vowel: false,
		emoji: "📨",
		en: { it: ["of it", "from it"], what: "of {}" },
		ru: { it: ["об этом", "от этого"], what: ["о чём", "от чего"] },
		adposition: {
			definition:
				"Bezeichnet den Ausgangspunkt, die Herkunft oder den Urheber einer Sache, auch einen Teil oder eine Zugehörigkeit: Er kommt von der Arbeit. Ein Brief von meiner Mutter. Einer von uns.",
			en: ["from", "of", "by"],
			ru: ["от", "с", "из"],
		},
	},
	{
		text: "vor",
		ipa: "foːɐ̯",
		vowel: false,
		emoji: "⏳",
		en: { it: ["in front of it", "of it"], what: "in front of {}" },
		ru: { it: ["перед этим", "этого"], what: ["перед чем", "чего"] },
		adposition: {
			definition:
				"Bezeichnet eine Stelle auf der Vorderseite von etwas (wo?, mit Dativ) oder die Richtung dorthin (wohin?, mit Akkusativ), auch eine frühere Zeit: Das Auto steht vor dem Haus. Er stellt sich vor die Tür. Vor einer Woche war ich krank.",
			en: ["in front of", "before", "ago"],
			ru: ["перед", "до", "назад"],
		},
	},
	{
		text: "zu",
		ipa: "tsuː",
		vowel: false,
		emoji: "🎯",
		en: { it: ["to it", "for it"], what: "to {}" },
		ru: { it: ["к этому", "для этого"], what: ["к чему", "для чего"] },
		adposition: {
			definition:
				"Bezeichnet das Ziel einer Bewegung, besonders eine Person oder einen Ort, auch den Zweck oder Anlass: Sie geht zu ihrer Ärztin. Wir gehen zur Schule. Zum Geburtstag bekam er ein Buch.",
			en: ["to", "for"],
			ru: ["к", "в", "на"],
		},
	},
	{
		text: "zwischen",
		ipa: "tsvɪʃn̩",
		vowel: false,
		emoji: "🌉",
		en: { it: ["between them"], what: "between {}" },
		ru: { it: ["между ними"], what: ["между чем"] },
		adposition: {
			definition:
				"Bezeichnet eine Stelle in der Mitte von zwei oder mehr Dingen oder Personen (wo?, mit Dativ) oder die Richtung dorthin (wohin?, mit Akkusativ), auch eine Zeit in der Mitte von zwei Zeitpunkten: Das Haus steht zwischen zwei Bäumen. Komm zwischen zwei und drei Uhr vorbei.",
			en: ["between"],
			ru: ["между"],
		},
	},
];
