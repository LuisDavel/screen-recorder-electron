import React from "react";
import { useHeaderConfigStore } from "@/store/store-header-config";

interface UnifiedFooterProps {
	isVisible?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

export function UnifiedFooter({
	isVisible = true,
	className = "",
	style = {},
}: UnifiedFooterProps) {
	const { footerConfig } = useHeaderConfigStore();

	if (!footerConfig.isEnabled || !isVisible) {
		return null;
	}

	return (
		<div
			className={`bg-gray-900/95 backdrop-blur-sm ${className}`}
			style={{ height: `${footerConfig.height}px`, ...style }}
		>
			{/* Footer completamente vazio - sem texto ou informações */}
		</div>
	);
}
