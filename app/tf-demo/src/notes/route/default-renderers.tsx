import type { NoteBlockKindFor } from "../note-block-kind";
import { renderDefaultRouteNoteHeader } from "./renderers/default/header-renderer";
import { renderDefaultRouteNoteRoutes } from "./renderers/default/routes-renderer";
import type { RouteNoteDefaultRenderer } from "./route-note-render-context";

export const DEFAULT_ROUTE_NOTE_RENDERER_FOR = {
	Header: renderDefaultRouteNoteHeader,
	Routes: renderDefaultRouteNoteRoutes,
} satisfies Record<NoteBlockKindFor<"RouteNote">, RouteNoteDefaultRenderer>;
