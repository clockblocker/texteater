import { Badge } from "@/components/ui/badge";
import type { ReadingNoteDefaultRenderer } from "../../reading-note-render-context";

export const renderDefaultReadingHeader = (({ note, capabilities }) => (
	<section
		aria-labelledby="reading-note-title"
		className="flex flex-col gap-3"
	>
		<div className="flex flex-wrap items-baseline gap-2">
			<h1
				id="reading-note-title"
				className="text-2xl font-semibold tracking-tight sm:text-3xl"
			>
				{note.reading.emojiDescription}{" "}
				{note.reading.lemma.canonicalForm}
			</h1>
			{capabilities.knowledgeSettings.transcription &&
			note.knowledge.transcription ? (
				<span className="text-lg text-muted-foreground">
					/{note.knowledge.transcription}/
				</span>
			) : null}
			<Badge variant="secondary">{note.reading.lemma.language}</Badge>
			<Badge variant="outline">{note.reading.lemma.family}</Badge>
			<Badge variant="outline">{note.reading.lemma.kind}</Badge>
		</div>
		{Object.keys(note.reading.lemma.coreFeatures).length > 0 ? (
			<div className="flex flex-wrap gap-2">
				{Object.entries(note.reading.lemma.coreFeatures).flatMap(
					([name, value]) =>
						value === null
							? []
							: [
									<Badge key={name} variant="outline">
										{name}: {String(value)}
									</Badge>,
								],
				)}
			</div>
		) : null}
	</section>
)) satisfies ReadingNoteDefaultRenderer;
