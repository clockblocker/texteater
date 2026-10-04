import { SidebarInset, SidebarProvider, SidebarTrigger } from "lego";
import { lazy, type ReactNode, Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import {
	isPlaygroundPath,
	navigate,
	navigatePlayground,
	PLAYGROUND_BASE,
	playgroundSegments,
	usePathname,
} from "@/playground/playground-router";
import {
	PLAYGROUND_ENTRIES,
	PlaygroundView,
} from "@/playground/playground-view";
import { ApplicationWorkspace } from "@/workspace/application-workspace";

const ResolutionInspector = import.meta.env.DEV
	? lazy(() =>
			import("@/devtools/resolution-inspector").then((module) => ({
				default: module.ResolutionInspector,
			})),
		)
	: null;

/**
 * One URL, one workspace (tf-demo ADR 0003): the Library and Settings are
 * Menu Items on a Pane's Ground line, not shell destinations. A production
 * build has no sidebar; a development build keeps one for the Playground,
 * which is open exactly when the URL says so, so Back, Forward and reload
 * behave.
 */
function App() {
	const workspace = (
		<section
			aria-label="Workspace"
			className="h-svh min-h-0 min-w-0 flex-1 bg-canvas p-3 max-md:h-[calc(100svh-3rem)] max-md:p-0"
		>
			<ApplicationWorkspace />
		</section>
	);
	if (!import.meta.env.DEV) return workspace;
	return <DevelopmentShell workspace={workspace} />;
}

function DevelopmentShell({ workspace }: { workspace: ReactNode }) {
	const pathname = usePathname();
	const playgroundOpen = isPlaygroundPath(pathname);
	const [playgroundEntryKey] = playgroundSegments(pathname);
	return (
		<SidebarProvider open={false}>
			<AppSidebar
				playgroundActive={playgroundOpen}
				onTogglePlayground={() =>
					navigate(playgroundOpen ? "/" : PLAYGROUND_BASE)
				}
				playgroundPages={
					playgroundOpen
						? PLAYGROUND_ENTRIES.map((entry) => ({
								key: entry.key,
								title: entry.title,
								icon: entry.icon,
								active: entry.key === playgroundEntryKey,
								onShow: () => navigatePlayground([entry.key]),
							}))
						: []
				}
			/>
			<SidebarInset className="min-h-svh min-w-0 overflow-hidden">
				<header className="flex h-12 shrink-0 items-center border-b px-3 md:hidden">
					<SidebarTrigger />
				</header>
				{playgroundOpen ? <PlaygroundView /> : workspace}
			</SidebarInset>
			{ResolutionInspector && (
				<Suspense fallback={null}>
					<ResolutionInspector />
				</Suspense>
			)}
		</SidebarProvider>
	);
}

export default App;
