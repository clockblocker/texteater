import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "lego";
import { FlaskConicalIcon, LibraryIcon, SettingsIcon } from "lucide-react";

export function AppSidebar({
	libraryActive,
	settingsActive,
	onShowLibrary,
	onShowSettings,
	onShowPlayground = null,
	playgroundActive = false,
}: {
	readonly libraryActive: boolean;
	readonly settingsActive: boolean;
	readonly onShowLibrary: () => void;
	readonly onShowSettings: () => void;
	/** Present only in development builds. */
	readonly onShowPlayground?: (() => void) | null;
	readonly playgroundActive?: boolean;
}) {
	const { setOpenMobile } = useSidebar();
	const runAndClose = (command: () => void) => {
		command();
		setOpenMobile(false);
	};

	return (
		<Sidebar collapsible="icon">
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<nav aria-label="Primary">
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton
										isActive={libraryActive}
										onClick={() =>
											runAndClose(onShowLibrary)
										}
										tooltip="Library"
									>
										<LibraryIcon />
										<span>Library</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</nav>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<nav aria-label="Preferences">
					<SidebarMenu>
						{onShowPlayground ? (
							<SidebarMenuItem>
								<SidebarMenuButton
									isActive={playgroundActive}
									onClick={() =>
										runAndClose(onShowPlayground)
									}
									tooltip="Playground"
								>
									<FlaskConicalIcon />
									<span>Playground</span>
								</SidebarMenuButton>
							</SidebarMenuItem>
						) : null}
						<SidebarMenuItem>
							<SidebarMenuButton
								isActive={settingsActive}
								onClick={() => runAndClose(onShowSettings)}
								tooltip="Settings"
							>
								<SettingsIcon />
								<span>Settings</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</nav>
			</SidebarFooter>
		</Sidebar>
	);
}
