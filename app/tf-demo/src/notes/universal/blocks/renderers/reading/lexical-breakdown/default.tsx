import { LinkButton, NoteSection } from "lego";
import type { ReadingDefaultRenderer } from "../../../renderer";
import { RouteAside } from "../../common/features";

export const renderReadingLexicalBreakdown = (({
	noteData,
	PresentationCapabilities,
}) => {
	if (!PresentationCapabilities.knowledgeSettings.lexicalBreakdown)
		return null;
	const references = noteData.structuralReferences.filter(
		(reference) => reference.aspect === "lexicalBreakdown",
	);
	if (!references.length) return null;
	return (
		<NoteSection aria-label="Components" label="Components">
			<ul className="grid gap-2">
				{references.map((reference) => (
					<li key={reference.path}>
						<LinkButton
							onClick={() =>
								PresentationCapabilities.follow(
									reference.target,
								)
							}
						>
							{reference.descriptor.canonicalForm}
						</LinkButton>
						<RouteAside>{reference.descriptor.kind}</RouteAside>
					</li>
				))}
			</ul>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;
