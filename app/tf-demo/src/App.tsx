import { SidebarInset, SidebarProvider, SidebarTrigger } from "lego";
import { useState } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
	isPlaygroundPath,
	navigate,
	PLAYGROUND_BASE,
	usePathname,
} from "@/playground/playground-router";
import { PlaygroundView } from "@/playground/playground-view";
import { LibraryView } from "@/views/library-view";
import { SettingsView } from "@/views/settings-view";
import {
	renderApplicationSubject,
	renderCardTail,
} from "@/views/subject-presentation";
import {
	ApplicationWorkspace,
	ApplicationWorkspaceProvider,
} from "@/workspace/application-workspace";
import { useWorkspaceController } from "@/workspace/workspace-controller";

export function App() {
	return (
		<ApplicationWorkspaceProvider>
			<ApplicationShell />
		</ApplicationWorkspaceProvider>
	);
}

function ApplicationShell() {
	// Library and Settings are shell state and never change the URL. The
	// dev-only Playground is the opposite: it is open exactly when the URL says
	// so, so Back/Forward and reload behave.
	const [shell, setShell] = useState<"workspace" | "settings">("workspace");
	const playgroundOpen =
		import.meta.env.DEV && isPlaygroundPath(usePathname());
	const settingsOpen = !playgroundOpen && shell === "settings";
	const { activeTextId, isLibraryVisible, revealLibrary } =
		useWorkspaceController();
	const leavePlayground = () => {
		if (playgroundOpen) navigate("/");
	};

	return (
		<SidebarProvider open={false}>
			<AppSidebar
				libraryActive={!settingsOpen && isLibraryVisible}
				onShowLibrary={() => {
					leavePlayground();
					setShell("workspace");
					revealLibrary();
				}}
				onShowSettings={() => {
					leavePlayground();
					setShell("settings");
				}}
				settingsActive={settingsOpen}
				onShowPlayground={
					import.meta.env.DEV ? () => navigate(PLAYGROUND_BASE) : null
				}
				playgroundActive={playgroundOpen}
			/>
			<SidebarInset className="min-h-svh min-w-0 overflow-hidden">
				<header className="flex h-12 shrink-0 items-center border-b px-3 md:hidden">
					<SidebarTrigger />
				</header>
				{playgroundOpen ? (
					<PlaygroundView />
				) : settingsOpen ? (
					<SettingsView
						target={{
							kind: "Settings",
							...(activeTextId ? { textId: activeTextId } : {}),
						}}
					/>
				) : (
					<section
						aria-label="Workspace"
						className="h-svh min-h-0 min-w-0 flex-1 bg-canvas p-3 max-md:h-[calc(100svh-3rem)] max-md:p-0"
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

export default App;
