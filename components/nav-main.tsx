"use client";

import { type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";

import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
} from "@/components/ui/sidebar";

interface NavItem {
	title: string;
	url: string;
	icon: LucideIcon;
	isActive?: boolean;
	subItems?: {
		title: string;
		url: string;
		icon: LucideIcon;
	}[];
}

export function NavMain({ items }: { items: NavItem[] }) {
	const pathname = usePathname();
	return (
		<SidebarMenu>
			{items.map((item) => {
				const isActive =
					item.isActive ||
					pathname === item.url ||
					pathname.startsWith(`${item.url}/`);

				return (
					<SidebarMenuItem key={item.title}>
						<SidebarMenuButton asChild isActive={isActive}>
							<a href={item.url}>
								<item.icon />
								<span>{item.title}</span>
							</a>
						</SidebarMenuButton>

						{/* Render submenu items if they exist */}
						{item.subItems && isActive && (
							<SidebarMenuSub>
								{item.subItems.map((subItem) => {
									const isSubItemActive = pathname === subItem.url;

									return (
										<SidebarMenuButton
											key={subItem.title}
											asChild
											isActive={isSubItemActive}
											className="pl-8 text-sm"
										>
											<a href={subItem.url}>
												<subItem.icon className="h-4 w-4" />
												<span>{subItem.title}</span>
											</a>
										</SidebarMenuButton>
									);
								})}
							</SidebarMenuSub>
						)}
					</SidebarMenuItem>
				);
			})}
		</SidebarMenu>
	);
}
