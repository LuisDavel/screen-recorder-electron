import React from "react";
import { DragWindowRegion } from "@/components/DragWindowRegion";

export default function BaseLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<DragWindowRegion />
			<main className="h-screen p-6 pb-20">{children}</main>
		</>
	);
}
