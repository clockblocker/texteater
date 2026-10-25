import { type ExampleGroup, reading } from "../note-examples";

/** The Notes worth judging, in the order the inspector lists them. */
export const BREAKDOWN_EXAMPLES: readonly ExampleGroup[] = [
	{
		title: "Words",
		examples: [
			{
				label: "Einkauf 🧺",
				hint: "The sketch: ein · kauf · ∅ through its Source; the zero ending's target sits after the f",
				note: reading("Einkauf", "🧺"),
			},
			{
				label: "Kohlekraftwerk 🏭",
				hint: "Both parts pending: two Shadow links, two unsplit chunks",
				note: reading("Kohlekraftwerk", "🏭"),
			},
			{
				label: "verarzten 🩹",
				hint: "The citation ending is unlinked filler",
				note: reading("verarzten", "🩹"),
			},
			{
				label: "Gästehaus 🏨",
				hint: "An Interfix: its ring, and Gast + -e- + Haus",
				note: reading("Gästehaus", "🏨"),
			},
			{
				label: "Entspannung 😌",
				hint: "Partial walk: entspannen is pending, so entspann stays one chunk",
				note: reading("Entspannung", "😌"),
			},
			{
				label: "einkaufen 🛍️",
				hint: "Full walk through kaufen: ein · kauf · en",
				note: reading("einkaufen", "🛍️"),
			},
			{
				label: "Wachstube 💂",
				hint: "wachen + Stube (DWDS): Wach links to the verb; Stube is stored, wachen pending",
				note: reading("Wachstube", "💂"),
			},
			{
				label: "Wachstube 🕯️",
				hint: "The other Reading splits as Wachs + Tube",
				note: reading("Wachstube", "🕯️"),
			},
			{
				label: "Lauf 👟",
				hint: "A conversion: a Source instead of Constituents; laufen lists it as Base of",
				note: reading("Lauf", "👟"),
			},
		],
	},
	{
		title: "Phrasemes",
		examples: [
			{
				label: "sich wie zu Hause fühlen 🪞🏠😌",
				hint: "A Locution as a part (zu Hause); sich is the Reading's Reflexive Slot, so it is no piece",
				note: reading("wie zu Hause fühlen", "🪞🏠😌"),
			},
			{
				label: "da liegt der Hase im Pfeffer 🐇",
				hint: "A fused word: i → in, m Pfeffer → Pfeffer",
				note: reading("da liegt der Hase im Pfeffer", "🐇"),
			},
			{
				label: "den Faden verlieren 🧵",
				hint: "The article grouped with its noun",
				note: reading("den Faden verlieren", "🧵"),
			},
		],
	},
	{
		title: "Formations",
		examples: [
			{
				label: "kaufen 🛒 (Reading)",
				hint: "Its Reading Note; set Formations to “+ each Reading Note”",
				note: reading("kaufen", "🛒"),
			},
			{
				label: "kaufen",
				hint: "Prefixed verbs, a compound, a derivation, and Base of: Kauf",
				note: { kind: "Lemma", form: "kaufen" },
			},
			{
				label: "Haus",
				hint: "Compounds and a phrase",
				note: { kind: "Lemma", form: "Haus" },
			},
			{
				label: "Kraftwerk (pending)",
				hint: "A pending base: its Shadow Note carries the Formations",
				note: { kind: "Shadow", form: "Kraftwerk" },
			},
		],
	},
];
