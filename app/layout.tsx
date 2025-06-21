import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme-provider";
import { LanguageProvider } from "@/lib/language-provider";
import { AuthProvider } from "@/lib/auth";
import { CoreProvider } from "@/lib/core";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Insider - Efficient Task Management Solutions",
	description:
		"Efficient task management made simple. Sign in to Insider for seamless tracking and collaboration on your projects.",
	keywords: [
		"task management",
		"insider task manager",
		"project management tool",
		"Insider",
		"project organization",
		"team collaboration",
		"productivity tools",
		"task tracking",
	],
	openGraph: {
		title: "Insider - Efficient Task Management Solutions",
		description:
			"Efficient task management made simple. Sign in to Insider for seamless tracking and collaboration on your projects.",
	},
	twitter: {
		title: "Insider - Efficient Task Management Solutions",
		description:
			"Efficient task management made simple. Sign in to Insider for seamless tracking and collaboration on your projects.",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<AuthProvider>
					<CoreProvider>
						<ThemeProvider>
							<LanguageProvider>{children}</LanguageProvider>
						</ThemeProvider>
					</CoreProvider>
				</AuthProvider>
			</body>
		</html>
	);
}
