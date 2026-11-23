import { NoteSection } from "lego";
import type { ReadingDefaultRenderer } from "../../universal/blocks/renderer";

/** Hebrew concrete occurrence patterns: function labels, never German case slots. */
export const renderHebrewValency = (({ noteData }) => {
	const patterns = noteData.knowledge.valency ?? [];
	const lines = patterns.flatMap((pattern) => {
		const parts: string[] = [];
		for (const complement of pattern) {
			if (complement.kind === "Subject") parts.push("subject");
			else if (complement.kind === "DirectObject")
				parts.push("direct object");
			else if (
				complement.kind === "Preposition" &&
				complement.preposition.language === "he"
			)
				parts.push(`${complement.preposition.canonicalForm} …`);
			else return [];
		}
		return parts.length ? [parts.join(" · ")] : [];
	});
	if (!lines.length) return null;
	return (
		<NoteSection label="Valency">
			<ul className="list-disc space-y-1 ps-5">
				{[...new Set(lines)].map((line) => (
					<li key={line} dir="auto">
						{line}
					</li>
				))}
			</ul>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;
