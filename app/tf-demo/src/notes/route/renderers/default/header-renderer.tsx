import type { RouteNoteDefaultRenderer } from "../../route-note-render-context";

export const renderDefaultRouteNoteHeader = (({ note }) => (
	<section className="flex flex-col gap-2" aria-labelledby="route-note-title">
		<p className="text-sm font-medium text-muted-foreground">
			{note.routeKind} Route Note
		</p>
		<h1
			id="route-note-title"
			className="text-2xl font-semibold tracking-tight sm:text-3xl"
		>
			{routeNoteTitle(note)}
		</h1>
	</section>
)) satisfies RouteNoteDefaultRenderer;

function routeNoteTitle(
	note: Parameters<RouteNoteDefaultRenderer>[0]["note"],
): string {
	switch (note.routeKind) {
		case "Attestation":
			return note.presented.members
				.map(({ attested }) => attested)
				.join(" ");
		case "Surface":
			return note.presented.normalizedSurface;
		case "Lemma":
			return note.presented.canonicalForm;
	}
}
