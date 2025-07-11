import React from "react";
import { useHeaderConfigStore } from "@/store/store-header-config";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UnifiedHeaderProps {
	isVisible?: boolean;
	className?: string;
	style?: React.CSSProperties;
}

export function UnifiedHeader({
	isVisible = true,
	className = "",
	style = {},
}: UnifiedHeaderProps) {
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

	return (
		<div
			className={`bg-gray-900/95 text-white shadow-lg backdrop-blur-sm ${className}`}
			style={{ height: `${headerConfig.height}px`, ...style }}
		>
			<div className="flex h-full items-center px-4 md:px-6">
				<div className="grid w-full grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-2 md:gap-4">
					{/* Nome do Exame */}
					<div className="col-span-2 sm:col-span-3 md:col-span-3">
						<div className="mb-1 text-xs text-gray-400">Exame</div>
						<div className="truncate text-xs sm:text-sm font-medium">
							{headerConfig.examName || "Não informado"}
						</div>
					</div>

					{/* Data do Exame */}
					<div className="col-span-2 sm:col-span-2 md:col-span-2">
						<div className="mb-1 text-xs text-gray-400">Data</div>
						<div className="text-xs sm:text-sm font-medium">
							{formatDate(headerConfig.examDate) || "Não informada"}
						</div>
					</div>

					{/* Nome do Paciente */}
					<div className="col-span-2 sm:col-span-3 md:col-span-3">
						<div className="mb-1 text-xs text-gray-400">Paciente</div>
						<div className="truncate text-xs sm:text-sm font-medium">
							{headerConfig.patientName || "Não informado"}
						</div>
					</div>

					{/* Sexo e Idade - Oculto em telas pequenas */}
					<div className="hidden sm:block col-span-2 md:col-span-2">
						<div className="mb-1 text-xs text-gray-400">Sexo / Idade</div>
						<div className="text-xs sm:text-sm font-medium">{getSexAge()}</div>
					</div>

					{/* ID Externo - Oculto em telas pequenas */}
					<div className="hidden md:block col-span-2">
						<div className="mb-1 text-xs text-gray-400">ID</div>
						<div className="truncate text-xs sm:text-sm font-medium">
							{headerConfig.externalId || "Não informado"}
						</div>
					</div>
				</div>
			</div>

			{/* Segunda linha com informações adicionais se a altura permitir */}
			{headerConfig.height > 60 && (
				<div className="absolute right-0 bottom-0 left-0 px-4 md:px-6 pt-2">
					<div className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-2 md:gap-4 text-xs">
						{/* Instituição */}
						<div className="col-span-1 sm:col-span-1 md:col-span-4">
							<span className="text-gray-400">Instituição: </span>
							<span className="font-medium">
								{headerConfig.institutionName || "Não informada"}
							</span>
						</div>

						{/* Médico Requisitante */}
						<div className="col-span-1 sm:col-span-1 md:col-span-4">
							<span className="text-gray-400">Médico: </span>
							<span className="font-medium">
								{headerConfig.requestingDoctor || "Não informado"}
							</span>
						</div>

						{/* CRM - Oculto em telas pequenas */}
						<div className="hidden md:block col-span-4">
							<span className="text-gray-400">CRM: </span>
							<span className="font-medium">
								{headerConfig.crm || "Não informado"}
							</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
