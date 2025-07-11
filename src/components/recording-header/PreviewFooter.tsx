import React from "react";
import { useHeaderConfigStore } from "@/store/store-header-config";

interface PreviewFooterProps {
	isVisible?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

export function PreviewFooter({
	isVisible = true,
	className = "",
	style = {},
}: PreviewFooterProps) {
	const { footerConfig } = useHeaderConfigStore();

	if (!footerConfig.isEnabled || !isVisible) {
		return null;
	}

	// Footer compacto para preview - altura configurável
	const previewHeight = Math.min(footerConfig.height, 60);

	return (
		<div
			className={`bg-gray-900/90 backdrop-blur-sm border-t border-gray-700/50 z-0 ${className}`}
			style={{ height: `${previewHeight}px`, ...style }}
		>
			{/* Footer completamente vazio - sem texto ou informações */}
		</div>
	);
}
