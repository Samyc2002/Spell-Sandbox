import type { Metadata } from "next";
import { Inter, Roboto } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const robotoHeading = Roboto({
	subsets: ["latin"],
	variable: "--font-heading",
});

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
	title: "SpellBox Research Console",
	description:
		"Generate a sample, then inspect the shape of the spell space it reveals.",
	icons: {
		icon: "/logo.svg",
		shortcut: "/logo.svg",
		apple: "/logo.svg",
	},
	openGraph: {
		title: "SpellBox Research Console",
		description:
			"Generate a sample, then inspect the shape of the spell space it reveals.",
		images: [
			{
				url: "/logo.svg",
				width: 512,
				height: 512,
				alt: "SpellBox Research Console logo",
			},
		],
	},
	twitter: {
		card: "summary_large_image",
		title: "SpellBox Research Console",
		description:
			"Generate a sample, then inspect the shape of the spell space it reveals.",
		images: ["/logo.svg"],
	},
};

export default function RootLayout({ children }: LayoutProps<"/">) {
	return (
		<html
			lang="en"
			suppressHydrationWarning
			className={cn("font-sans", inter.variable, robotoHeading.variable)}
		>
			<head />
			<body className="min-h-full flex flex-col">
				<ThemeProvider
					attribute="class"
					defaultTheme="dark"
					enableSystem
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
