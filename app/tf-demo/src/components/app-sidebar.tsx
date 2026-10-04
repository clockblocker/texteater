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
import { FlaskConicalIcon, type LucideIcon } from "lucide-react";

/** One dev-only Playground entry, shown while the Playground is open. */
export type SidebarPlaygroundPage = {
	readonly key: string;
	readonly title: string;
	readonly icon: LucideIcon;
	readonly active: boolean;
	readonly onShow: () => void;
};

/**
 * The development build's sidebar: the Playground link, and while the
 * Playground is open, its entries. The Library and Settings are Menu Items
 * in the workspace, and a production build has no sidebar (tf-demo ADR 0003).
 */
export function AppSidebar({
	onTogglePlayground,
	playgroundActive,
	playgroundPages,
}: {
	/** Opens the Playground, or leaves it for the workspace while it is open. */
	readonly onTogglePlayground: () => void;
	readonly playgroundActive: boolean;
	/** Non-empty only while the Playground is open. */
	readonly playgroundPages: readonly SidebarPlaygroundPage[];
}) {
	const { setOpenMobile } = useSidebar();
	const runAndClose = (command: () => void) => {
		command();
		setOpenMobile(false);
	};

	return (
		<Sidebar collapsible="icon">
			<SidebarContent>
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
				<nav aria-label="Development">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								isActive={playgroundActive}
								onClick={() => runAndClose(onTogglePlayground)}
								tooltip={
									playgroundActive
										? "Leave the Playground"
										: "Playground"
								}
							>
								<FlaskConicalIcon strokeWidth={1.5} />
								<span>Playground</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</nav>
			</SidebarFooter>
		</Sidebar>
	);
}
