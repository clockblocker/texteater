import type { WorkspaceTarget } from "@/workspace/workspace-subject";
import type { Id } from "../../../convex/_generated/dataModel";
import type { PlaygroundSnapshot } from "../../../tooling/playground-snapshot";
/** A Note the inspector opens, named as the fixtures name it. */
export type Example = {
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

export type ExampleGroup = {
	readonly title: string;
	readonly examples: readonly Example[];
};

export const reading = (form: string, emoji: string) =>
	({ kind: "Reading", form, emoji }) as const;

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
