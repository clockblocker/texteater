import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { AppSidebar } from "@/components/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { hrefFor, targetFromLocation } from "@/lib/navigation";
import { CardDemoRouteShell } from "@/playground/card-demo/card-demo-route-shell";
import { LibraryView } from "@/views/library-view";
import { NotFoundView } from "@/views/not-found-view";
import { ResolutionNoteView } from "@/views/resolution-note-view";
import { RouteNoteView } from "@/views/route-note-view";
import { SettingsView } from "@/views/settings-view";
import { ShadowNoteView } from "@/views/shadow-note-view";
import { TextView } from "@/views/text-view";
import { UnitReadingNoteView } from "@/views/unit-reading-note-view";

export function App() {
	return (
		<SidebarProvider open={false}>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-12 shrink-0 items-center border-b px-3 md:hidden">
					<SidebarTrigger />
				</header>
				<Routes>
					<Route
						path="/"
						element={
							<Navigate
								to={hrefFor({ kind: "Library" })}
								replace
							/>
						}
					/>
					<Route
						path="/playground/card-demo/*"
						element={<CardDemoRouteShell />}
					/>
					<Route path="*" element={<RoutedView />} />
				</Routes>
			</SidebarInset>
		</SidebarProvider>
	);
}

function RoutedView() {
	const location = useLocation();
	const target = targetFromLocation(location);
	if (!target) return <NotFoundView />;

	switch (target.kind) {
		case "Library":
			return <LibraryView />;
		case "Settings":
			return <SettingsView target={target} />;
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
