import { FlaskConicalIcon, LibraryIcon, SettingsIcon } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

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
import { hrefFor, targetFromLocation } from "@/lib/navigation";
import { CARD_DEMO_BASE_PATH } from "@/playground/card-demo/card-demo-navigation";

export function AppSidebar() {
	const location = useLocation();
	const target = targetFromLocation(location);
	const { setOpenMobile } = useSidebar();
	const isPlayground =
		location.pathname === CARD_DEMO_BASE_PATH ||
		location.pathname.startsWith(`${CARD_DEMO_BASE_PATH}/`);
	const settingsTextId =
		target?.kind === "Text" || target?.kind === "Settings"
			? target.textId
			: undefined;

	return (
		<Sidebar collapsible="icon">
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<nav aria-label="Primary">
							<SidebarMenu>
								<SidebarMenuItem>
									<SidebarMenuButton
										tooltip="Library"
										isActive={target?.kind === "Library"}
										render={
											<Link
												to={hrefFor({
													kind: "Library",
												})}
												onClick={() =>
													setOpenMobile(false)
												}
											/>
										}
									>
										<LibraryIcon />
										<span>Library</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
								<SidebarMenuItem>
									<SidebarMenuButton
										tooltip="Playground"
										isActive={isPlayground}
										render={
											<Link
												to={CARD_DEMO_BASE_PATH}
												onClick={() =>
													setOpenMobile(false)
												}
											/>
										}
									>
										<FlaskConicalIcon />
										<span>Playground</span>
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
								tooltip="Settings"
								isActive={target?.kind === "Settings"}
								render={
									<Link
										to={hrefFor({
											kind: "Settings",
											...(settingsTextId
												? { textId: settingsTextId }
												: {}),
										})}
										onClick={() => setOpenMobile(false)}
									/>
								}
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
