import { Fragment, type ReactElement } from "react";

import { PageNavigation } from "@/components/page-navigation";
import { renderErrorNote } from "../error-note";
import type { NoteBlockKindFor } from "../note-block-kind";
import { orderNoteBlockKinds } from "../note-block-order";
import { DEFAULT_ROUTE_NOTE_RENDERER_FOR } from "./default-renderers";
import {
	createDefaultRouteNoteCapabilities,
	type RouteNoteData,
	type RouteNotePresentationCapabilities,
} from "./route-note-render-context";

export type {
	RouteNoteData,
	RouteNoteDefaultRenderer,
	RouteNotePresentationCapabilities,
	RouteNoteRenderContext,
} from "./route-note-render-context";

const ROUTE_NOTE_BLOCKS = new Set<NoteBlockKindFor<"RouteNote">>([
	"Header",
	"Routes",
]);

export function renderRouteNote(
	note: RouteNoteData,
	capabilities: RouteNotePresentationCapabilities = createDefaultRouteNoteCapabilities(),
): ReactElement {
	try {
		return (
			<main className="min-h-svh bg-background px-4 py-8 sm:px-6 sm:py-12">
				<div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
					<header className="flex justify-end">
						<PageNavigation />
					</header>
					{(
						orderNoteBlockKinds(
							ROUTE_NOTE_BLOCKS,
						) as readonly NoteBlockKindFor<"RouteNote">[]
					).map((blockKind) => {
						const renderer =
							DEFAULT_ROUTE_NOTE_RENDERER_FOR[blockKind];
						return (
							<Fragment
								key={`${note.routeKind}:${note.target.id}:${blockKind}`}
							>
								{renderer({ note, capabilities })}
							</Fragment>
						);
					})}
				</div>
			</main>
		);
	} catch (cause) {
		return renderErrorNote(cause, "Route Note unavailable");
	}
}
