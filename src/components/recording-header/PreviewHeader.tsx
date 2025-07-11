import React from "react";
import { useHeaderConfigStore } from "@/store/store-header-config";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PreviewHeaderProps {
	isVisible?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

export function PreviewHeader({
	isVisible = true,
	className = "",
	style = {},
}: PreviewHeaderProps) {
	const { headerConfig } = useHeaderConfigStore();

	if (!headerConfig.isEnabled || !isVisible) {
		return null;
	}

	const formatDate = (dateString: string) => {
		if (!dateString) return "";
		try {
			const date = new Date(dateString);
			return format(date, "dd/MM/yyyy", { locale: ptBR });
		} catch {
			return dateString;
		}
	};

	const getSexAge = () => {
		if (headerConfig.patientSex && headerConfig.patientAge) {
			return `${headerConfig.patientSex} / ${headerConfig.patientAge}`;
		}
		return (
			headerConfig.patientSex || headerConfig.patientAge || "Não informado"
		);
	};

	// Header compacto para preview - altura fixa menor
	const previewHeight = Math.min(headerConfig.height, 60);

	return (
		<div
			className={`bg-gray-900/90 text-white shadow-lg backdrop-blur-sm border-b border-gray-700/50 ${className}`}
			style={{ height: `${previewHeight}px`, ...style }}
		>
			<div className="flex h-full items-center px-3 md:px-4">
				<div className="grid w-full grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 md:gap-3">
					{/* Nome do Exame - Prioridade alta */}
					<div className="col-span-2 sm:col-span-2 md:col-span-2">
						<div className="mb-0.5 text-xs text-gray-300">Exame</div>
						<div className="truncate text-xs font-medium">
							{headerConfig.examName || "Não informado"}
						</div>
					</div>

					{/* Data do Exame - Prioridade alta */}
					<div className="col-span-1 sm:col-span-1 md:col-span-1">
						<div className="mb-0.5 text-xs text-gray-300">Data</div>
						<div className="text-xs font-medium">
							{formatDate(headerConfig.examDate) || "N/A"}
						</div>
					</div>

					{/* Nome do Paciente - Prioridade alta */}
					<div className="col-span-1 sm:col-span-2 md:col-span-2">
						<div className="mb-0.5 text-xs text-gray-300">Paciente</div>
						<div className="truncate text-xs font-medium">
							{headerConfig.patientName || "Não informado"}
						</div>
					</div>

					{/* Sexo/Idade - Oculto em mobile */}
					<div className="hidden sm:block col-span-1 md:col-span-1">
						<div className="mb-0.5 text-xs text-gray-300">Sexo/Idade</div>
						<div className="text-xs font-medium truncate">{getSexAge()}</div>
					</div>

					{/* ID - Oculto em mobile e tablet */}
					<div className="hidden md:block col-span-1">
						<div className="mb-0.5 text-xs text-gray-300">ID</div>
						<div className="truncate text-xs font-medium">
							{headerConfig.externalId || "N/A"}
						</div>
					</div>

					{/* Instituição - Oculto em mobile e tablet */}
					<div className="hidden md:block col-span-1">
						<div className="mb-0.5 text-xs text-gray-300">Instituição</div>
						<div className="truncate text-xs font-medium">
							{headerConfig.institutionName || "N/A"}
						</div>
					</div>
				</div>
			</div>

			{/* Indicador de Preview */}
			<div className="absolute top-1 right-2">
				<div className="bg-blue-600/80 text-white px-2 py-0.5 rounded text-xs font-medium">
					Preview
				</div>
			</div>
		</div>
	);
}
