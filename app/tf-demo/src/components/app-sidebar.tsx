import { LibraryIcon, SettingsIcon } from "lucide-react";

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
} from "@/components/ui/sidebar";

export function AppSidebar({
	libraryActive,
	settingsActive,
	onShowLibrary,
	onShowSettings,
}: {
	readonly libraryActive: boolean;
	readonly settingsActive: boolean;
	readonly onShowLibrary: () => void;
	readonly onShowSettings: () => void;
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
