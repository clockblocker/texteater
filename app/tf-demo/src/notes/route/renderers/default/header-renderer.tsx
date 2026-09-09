import type { RouteNoteDefaultRenderer } from "../../route-note-render-context";

export const renderDefaultRouteNoteHeader = (({ note }) => (
	<section className="flex flex-col gap-2" aria-labelledby="route-note-title">
		<p className="text-sm font-medium text-muted-foreground">
			{note.kind} Note
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
	switch (note.kind) {
		case "Attestation":
			return note.presented.members
				.map(({ attested }) => attested)
				.join(" ");
		case "Lemma":
			return note.presented.canonicalForm;
		case "Surface":
			return note.target.normalizedSurface;
	}
}
