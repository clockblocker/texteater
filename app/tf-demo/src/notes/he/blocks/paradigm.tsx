import { NoteSection } from "lego";
import type { ReadingDefaultRenderer } from "../../universal/blocks/renderer";
import { hebrewFeaturePhrases } from "../features";

/** Show only positively known cells; missing forms are not a defective paradigm. */
export const renderHebrewParadigm = (({ noteData }) => {
	const forms = noteData.knowledge.hebrewParadigm?.forms;
	if (!forms?.length) return null;
	return (
		<NoteSection aria-label="Inflection" label="Inflection">
			<ul className="grid gap-2">
				{forms.map(({ form, features }, index) => (
					<li
						key={`${index}:${form}`}
						className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
					>
						<bdi lang="he" dir="rtl">
							{form}
						</bdi>
						<span className="text-sm text-ink-muted compact:text-xs">
							{hebrewFeaturePhrases(features).join(" · ")}
						</span>
					</li>
				))}
			</ul>
		</NoteSection>
	);
}) satisfies ReadingDefaultRenderer;
