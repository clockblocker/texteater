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
import {
	ApplicationWorkspace,
	ApplicationWorkspaceProvider,
} from "@/workspace/application-workspace";
import type {
	WorkspacePresentation,
	WorkspaceSubject,
} from "@/workspace/sheet-workspace";
import { useWorkspaceController } from "@/workspace/workspace-controller";
import "@/workspace/application-workspace.css";

export function App() {
	return (
		<ApplicationWorkspaceProvider>
			<ApplicationShell />
		</ApplicationWorkspaceProvider>
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
						<ApplicationWorkspace
							renderLibrary={() => <LibraryView />}
							labelSubject={renderCardTail}
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
	presentation: WorkspacePresentation,
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
		case "Reading":
			return (
				<UnitReadingNoteView
					key={target.readingId}
					target={target}
					presentation={presentation}
				/>
			);
		case "Lemma":
		case "Surface":
		case "Attestation":
			return (
				<RouteNoteView
					key={noteTargetKey(target)}
					target={target}
					presentation={presentation}
					activeAnalysisKey={
						target.kind === "Surface"
							? "presentationContext" in subject
								? subject.presentationContext?.activeAnalysisKey
								: undefined
							: undefined
					}
				/>
			);
		case "Shadow":
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
		case "Reading":
			return "Reading";
		case "Lemma":
			return "Lemma";
		case "Surface":
			return "Surface";
		case "Attestation":
			return "Attestation";
		case "Shadow":
			return "Shadow";
		case "Resolution":
			return "Resolving";
		case "ResolutionStep":
			return target.stepKind;
	}
}

function noteTargetKey(
	target: Extract<
		WorkspaceSubject["target"],
		{ readonly kind: "Lemma" | "Surface" | "Attestation" }
	>,
): string {
	switch (target.kind) {
		case "Lemma":
			return `Lemma:${target.lemmaId}`;
		case "Surface":
			return `Surface:${target.language}:${target.normalizedSurface}`;
		case "Attestation":
			return `Attestation:${target.attestationId}`;
	}
}

export default App;
