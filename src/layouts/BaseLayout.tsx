import React from "react";

interface BaseLayoutProps {
	children: React.ReactNode;
}

export default function BaseLayout({ children }: BaseLayoutProps) {
	return (
		<>
			{/* Conteúdo principal */}
			<>{children}</>
		</>
	);
}
