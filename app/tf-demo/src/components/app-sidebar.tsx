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
import { Fragment } from "react";

/** One dev-only Playground entry, shown while the Playground is open. */
export type SidebarPlaygroundPage = {
	readonly key: string;
	readonly title: string;
	readonly icon: LucideIcon;
	readonly active: boolean;
	readonly onShow: () => void;
};

/** One labelled group of Playground entries in the sidebar. */
export type SidebarPlaygroundGroup = {
	readonly key: string;
	readonly label: string;
	readonly pages: readonly SidebarPlaygroundPage[];
};

/**
 * The development build's sidebar: the Playground link, and while the
 * Playground is open, its grouped entries. The Library and Settings are Menu
 * Items in the workspace, and a production build has no sidebar (tf-demo ADR
 * 0003).
 */
export function AppSidebar({
	onTogglePlayground,
	playgroundActive,
	playgroundGroups,
}: {
	/** Opens the Playground, or leaves it for the workspace while it is open. */
	readonly onTogglePlayground: () => void;
	readonly playgroundActive: boolean;
	/** Non-empty only while the Playground is open. */
	readonly playgroundGroups: readonly SidebarPlaygroundGroup[];
}) {
	const { setOpenMobile } = useSidebar();
	const runAndClose = (command: () => void) => {
		command();
		setOpenMobile(false);
	};
	const nonEmptyGroups = playgroundGroups.filter(
		(group) => group.pages.length > 0,
	);

	return (
		<Sidebar collapsible="icon">
			<SidebarContent>
				{nonEmptyGroups.length > 0 ? (
					<nav aria-label="Playground entries">
						{nonEmptyGroups.map((group, index) => {
							const headingId = `playground-group-${group.key}`;
							return (
								<Fragment key={group.key}>
									{index > 0 ? (
										<hr className="mx-2 border-0 border-t border-sidebar-border" />
									) : null}
									<SidebarGroup>
										<h2
											id={headingId}
											className="px-2 pb-1 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase group-data-[collapsible=icon]:sr-only"
										>
											{group.label}
										</h2>
										<SidebarGroupContent>
											<SidebarMenu
												aria-labelledby={headingId}
											>
												{group.pages.map((page) => (
													<SidebarMenuItem
														key={page.key}
													>
														<SidebarMenuButton
															isActive={
																page.active
															}
															onClick={() =>
																runAndClose(
																	page.onShow,
																)
															}
															tooltip={{
																children: (
																	<span className="grid gap-0.5">
																		<span>
																			{
																				page.title
																			}
																		</span>
																		<span className="text-[0.65rem] opacity-70">
																			{
																				group.label
																			}
																		</span>
																	</span>
																),
															}}
														>
															<page.icon
																strokeWidth={
																	1.5
																}
															/>
															<span>
																{page.title}
															</span>
														</SidebarMenuButton>
													</SidebarMenuItem>
												))}
											</SidebarMenu>
										</SidebarGroupContent>
									</SidebarGroup>
								</Fragment>
							);
						})}
					</nav>
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
