"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme-provider";
import { useLanguage } from "@/lib/language-provider";
import { useState, useEffect } from "react";

import NotificationsDrawer from "./NotificationsDrawer";

// Import shadcn components
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Header() {
	const { user, logout, isAuthenticated } = useAuth();
	const { theme, setTheme } = useTheme();
	const { language, setLanguage, t } = useLanguage();
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [scrolled, setScrolled] = useState(false);

	// Add scroll event listener to detect when to add blur effect
	useEffect(() => {
		const handleScroll = () => {
			const isScrolled = window.scrollY > 10;
			if (isScrolled !== scrolled) {
				setScrolled(isScrolled);
			}
		};

		window.addEventListener("scroll", handleScroll);
		return () => window.removeEventListener("scroll", handleScroll);
	}, [scrolled]);

	const toggleMenu = () => {
		setIsMenuOpen(!isMenuOpen);
	};

	return (
		<header
			className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
				scrolled
					? "bg-background/60 backdrop-blur-xl shadow-sm"
					: "bg-background/80 backdrop-blur-sm"
			} border-b border-border/50 py-2 md:py-2 md:ml-64`}
		>
			<div className="container max-w-7xl mx-auto px-4 flex justify-between md:justify-end items-center">
				{/* Title only shown on mobile */}
				<div className="md:hidden">
					<h1 className="text-lg font-bold">Insider</h1>
				</div>

				<div className="flex items-center space-x-3 md:space-x-4">
					{/* Notifications (only show if authenticated) */}
					{isAuthenticated && <NotificationsDrawer />}

					{/* User Menu (only show if authenticated) */}
					{isAuthenticated && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button
									variant="ghost"
									size="icon"
									className="rounded-full hover:bg-background/80"
								>
									<Avatar>
										<AvatarFallback>
											{user?.username?.charAt(0).toUpperCase()}
										</AvatarFallback>
									</Avatar>
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end" className="w-56">
								<DropdownMenuLabel>
									<div className="flex flex-col space-y-1">
										<p className="text-sm font-semibold">@{user?.username}</p>
									</div>
								</DropdownMenuLabel>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link href="/profile">{t("nav.profile")}</Link>
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem onClick={logout}>
									{t("logout")}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					)}

					{/* We don't need the mobile menu button anymore since it's in the Navigation component */}
				</div>
			</div>

			{/* No mobile menu needed as we have bottom navigation */}
		</header>
	);
}
