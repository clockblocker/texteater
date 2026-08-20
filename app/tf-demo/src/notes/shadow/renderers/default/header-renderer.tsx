import { LockIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ShadowNoteDefaultRenderer } from "../../shadow-note-render-context";

export const renderDefaultShadowNoteHeader = (({ note }) => (
	<section
		className="flex flex-col gap-3"
		aria-labelledby="shadow-note-title"
	>
		<p className="text-sm font-medium text-muted-foreground">Shadow Note</p>
		<h1
			id="shadow-note-title"
			className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl"
		>
			<LockIcon className="size-5" aria-hidden="true" />
			{note.descriptor.canonicalForm}
		</h1>
		<div className="flex flex-wrap gap-2">
			<Badge variant="secondary">{note.descriptor.language}</Badge>
			<Badge variant="outline">{note.descriptor.family}</Badge>
			<Badge variant="outline">{note.descriptor.kind}</Badge>
		</div>
	</section>
)) satisfies ShadowNoteDefaultRenderer;
