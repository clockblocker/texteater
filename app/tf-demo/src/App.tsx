import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { hrefFor, targetFromLocation } from "@/lib/navigation";
import { LibraryView } from "@/views/library-view";
import { NotFoundView } from "@/views/not-found-view";
import { ResolutionNoteView } from "@/views/resolution-note-view";
import { RouteNoteView } from "@/views/route-note-view";
import { ShadowNoteView } from "@/views/shadow-note-view";
import { TextView } from "@/views/text-view";
import { UnitReadingNoteView } from "@/views/unit-reading-note-view";

export function App() {
	return (
		<Routes>
			<Route
				path="/"
				element={<Navigate to={hrefFor({ kind: "Library" })} replace />}
			/>
			<Route path="*" element={<RoutedView />} />
		</Routes>
	);
}

function RoutedView() {
	const location = useLocation();
	const target = targetFromLocation(location);
	if (!target) return <NotFoundView />;

	switch (target.kind) {
		case "Library":
			return <LibraryView />;
		case "Text":
			return <TextView key={target.textId} target={target} />;
		case "UnitReadingNote":
			return (
				<UnitReadingNoteView key={target.readingId} target={target} />
			);
		case "RouteNote":
			return (
				<RouteNoteView
					key={`${target.routeKind}:${target.id}`}
					target={target}
				/>
			);
		case "ShadowNote":
			return <ShadowNoteView key={target.shadowId} target={target} />;
		case "Resolution":
			return (
				<ResolutionNoteView key={target.requestId} target={target} />
			);
	}
}

export default App;
