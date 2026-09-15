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
import {
	FlaskConicalIcon,
	LibraryIcon,
	type LucideIcon,
	SettingsIcon,
} from "lucide-react";

/** One dev-only Playground entry, shown while the Playground is open. */
export type SidebarPlaygroundPage = {
	readonly key: string;
	readonly title: string;
	readonly icon: LucideIcon;
	readonly active: boolean;
	readonly onShow: () => void;
};

export function AppSidebar({
	libraryActive,
	settingsActive,
	onShowLibrary,
	onShowSettings,
	onShowPlayground = null,
	playgroundActive = false,
	playgroundPages = [],
}: {
	readonly libraryActive: boolean;
	readonly settingsActive: boolean;
	readonly onShowLibrary: () => void;
	readonly onShowSettings: () => void;
	/** Present only in development builds. */
	readonly onShowPlayground?: (() => void) | null;
	readonly playgroundActive?: boolean;
	/** Non-empty only while the Playground is open. */
	readonly playgroundPages?: readonly SidebarPlaygroundPage[];
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
										<LibraryIcon strokeWidth={1.5} />
										<span>Library</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							</SidebarMenu>
						</nav>
					</SidebarGroupContent>
				</SidebarGroup>
				{playgroundPages.length > 0 ? (
					<SidebarGroup>
						<SidebarGroupContent>
							<nav aria-label="Playground entries">
								<SidebarMenu>
									{playgroundPages.map((page) => (
										<SidebarMenuItem key={page.key}>
											<SidebarMenuButton
												isActive={page.active}
												onClick={() =>
													runAndClose(page.onShow)
												}
												tooltip={page.title}
											>
												<page.icon strokeWidth={1.5} />
												<span>{page.title}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</nav>
						</SidebarGroupContent>
					</SidebarGroup>
				) : null}
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
									<FlaskConicalIcon strokeWidth={1.5} />
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
								<SettingsIcon strokeWidth={1.5} />
								<span>Settings</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</nav>
			</SidebarFooter>
		</Sidebar>
	);
}
