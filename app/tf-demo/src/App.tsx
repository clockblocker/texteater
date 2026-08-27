import { useState } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { LibraryView } from "@/views/library-view";
import {
	ResolutionNoteView,
	ResolutionStepNoteView,
} from "@/views/resolution-note-view";
import { RouteNoteView } from "@/views/route-note-view";
import { SettingsView } from "@/views/settings-view";
import { ShadowNoteView } from "@/views/shadow-note-view";
import { TextView } from "@/views/text-view";
import { UnitReadingNoteView } from "@/views/unit-reading-note-view";
import { CardSheetWorkspace } from "@/workspace/card-sheet-workspace";
import type {
	SheetWorkspace,
	WorkspacePresentation,
	WorkspaceSubject,
} from "@/workspace/sheet-workspace";
import {
	useWorkspaceController,
	WorkspaceProvider,
} from "@/workspace/workspace-controller";
import "@/workspace/application-workspace.css";

const INITIAL_WORKSPACE: SheetWorkspace = {
	centralPaneId: "central",
	activePaneId: "central",
	panes: [
		{ id: "west", sheets: [] },
		{ id: "central", sheets: [] },
		{ id: "east", sheets: [] },
	],
};

export function App() {
	return (
		<WorkspaceProvider initialWorkspace={INITIAL_WORKSPACE}>
			<ApplicationShell />
		</WorkspaceProvider>
	);
}

function ApplicationShell() {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const { activeTextId, isLibraryVisible, revealLibrary } =
		useWorkspaceController();

	return (
		<SidebarProvider open={false}>
			<AppSidebar
				libraryActive={!settingsOpen && isLibraryVisible}
				onShowLibrary={() => {
					setSettingsOpen(false);
					revealLibrary();
				}}
				onShowSettings={() => setSettingsOpen(true)}
				settingsActive={settingsOpen}
			/>
			<SidebarInset className="min-h-svh min-w-0 overflow-hidden">
				<header className="flex h-12 shrink-0 items-center border-b px-3 md:hidden">
					<SidebarTrigger />
				</header>
				{settingsOpen ? (
					<SettingsView
						target={{
							kind: "Settings",
							...(activeTextId ? { textId: activeTextId } : {}),
						}}
					/>
				) : (
					<section
						aria-label="Workspace"
						className="application-workspace"
					>
						<CardSheetWorkspace
							navigationAnchor={<LibraryView />}
							renderCardTail={renderCardTail}
							renderSubject={renderApplicationSubject}
						/>
					</section>
				)}
			</SidebarInset>
		</SidebarProvider>
	);
}

function renderApplicationSubject(
	subject: WorkspaceSubject,
	_presentation: WorkspacePresentation,
) {
	const { target } = subject;
	switch (target.kind) {
		case "Text":
			return (
				<TextView
					key={`${target.textId}:${target.focusAttestationId ?? ""}`}
					target={target}
				/>
			);
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
		case "ResolutionStep":
			return (
				<ResolutionStepNoteView
					key={`${target.requestId}:${target.stepKind}`}
					target={target}
				/>
			);
	}
}

function renderCardTail(subject: WorkspaceSubject) {
	const { target } = subject;
	switch (target.kind) {
		case "Text":
			return "Text";
		case "UnitReadingNote":
			return "Reading";
		case "RouteNote":
			return target.routeKind;
		case "ShadowNote":
			return "Shadow";
		case "Resolution":
			return "Resolving";
		case "ResolutionStep":
			return target.stepKind;
	}
}

export default App;
