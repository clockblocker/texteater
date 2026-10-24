import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import type { Id } from "../../../../convex/_generated/dataModel";
import type { PlaygroundSnapshot } from "../../../../tooling/playground-snapshot";

/** A Note the inspector opens, named as the fixtures name it. */
type Example = {
	readonly label: string;
	readonly hint: string;
	readonly note:
		| {
				readonly kind: "Reading";
				readonly form: string;
				readonly emoji: string;
		  }
		| { readonly kind: "Lemma"; readonly form: string }
		| { readonly kind: "Shadow"; readonly form: string };
};

type ExampleGroup = {
	readonly title: string;
	readonly examples: readonly Example[];
};

const reading = (form: string, emoji: string) =>
	({ kind: "Reading", form, emoji }) as const;

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
				label: "sich wie zu Hause fühlen 🛋️",
				hint: "A Locution as a part (zu Hause), and sich linking to sich fühlen",
				note: reading("sich wie zu Hause fühlen", "🛋️"),
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

/** Stored Emoji Descriptions drop the emoji presentation selector. */
const bare = (emoji: string) => emoji.replaceAll("\uFE0F", "");

/** Where an example points in this snapshot; null when the fixtures lack it. */
export function exampleTarget(
	snapshot: PlaygroundSnapshot,
	{ note }: Example,
): WorkspaceTarget | null {
	const { entries } = snapshot.catalog;
	switch (note.kind) {
		case "Reading": {
			const entry = entries.find(
				({ canonicalForm, emojiDescription }) =>
					canonicalForm === note.form &&
					bare(emojiDescription) === bare(note.emoji),
			);
			return entry
				? { kind: "Reading", readingId: entry.readingId }
				: null;
		}
		case "Lemma": {
			const entry = entries.find(
				({ canonicalForm }) => canonicalForm === note.form,
			);
			return entry ? { kind: "Lemma", lemmaId: entry.lemmaId } : null;
		}
		case "Shadow": {
			const key = Object.keys(snapshot.notes).find((noteKey) => {
				const value = snapshot.notes[noteKey];
				return (
					noteKey.startsWith("Shadow:") &&
					value?.kind === "Shadow" &&
					value.descriptor.canonicalForm === note.form
				);
			});
			return key
				? {
						kind: "Shadow",
						shadowId: key.slice("Shadow:".length) as Id<"shadows">,
					}
				: null;
		}
	}
}
