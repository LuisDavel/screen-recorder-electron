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
			className={`bg-gray-900/95 text-white shadow-lg backdrop-blur-sm ${className}`}
			style={{ height: `${footerConfig.height}px`, ...style }}
		>
			<div className="flex h-full items-center justify-center px-4 md:px-6">
				{/* Espaço vazio - footer sem informações */}
				<div className="w-full h-full flex items-center justify-center">
					<div className="text-xs text-gray-400 opacity-30">
						{/* Rodapé vazio */}
					</div>
				</div>
			</div>
		</div>
	);
}
