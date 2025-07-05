import React from "react";
import { useHeaderConfigStore } from "@/store/store-header-config";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecordingHeaderProps {
  isVisible?: boolean;
}

export default function RecordingHeader({
  isVisible = true,
}: RecordingHeaderProps) {
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

  return (
    <div className="h-full w-full bg-gray-900/95 text-white shadow-lg backdrop-blur-sm">
      <div className="flex h-full items-center px-6">
        <div className="grid w-full grid-cols-12 gap-4">
          {/* Nome do Exame */}
          <div className="col-span-3">
            <div className="mb-1 text-xs text-gray-400">Exame</div>
            <div className="truncate text-sm font-medium">
              {headerConfig.examName || "Não informado"}
            </div>
          </div>

          {/* Data do Exame */}
          <div className="col-span-2">
            <div className="mb-1 text-xs text-gray-400">Data</div>
            <div className="text-sm font-medium">
              {formatDate(headerConfig.examDate) || "Não informada"}
            </div>
          </div>

          {/* Nome do Paciente */}
          <div className="col-span-3">
            <div className="mb-1 text-xs text-gray-400">Paciente</div>
            <div className="truncate text-sm font-medium">
              {headerConfig.patientName || "Não informado"}
            </div>
          </div>

          {/* Sexo e Idade */}
          <div className="col-span-2">
            <div className="mb-1 text-xs text-gray-400">Sexo / Idade</div>
            <div className="text-sm font-medium">
              {headerConfig.patientSex && headerConfig.patientAge
                ? `${headerConfig.patientSex} / ${headerConfig.patientAge}`
                : headerConfig.patientSex ||
                  headerConfig.patientAge ||
                  "Não informado"}
            </div>
          </div>

          {/* ID Externo */}
          <div className="col-span-2">
            <div className="mb-1 text-xs text-gray-400">ID</div>
            <div className="truncate text-sm font-medium">
              {headerConfig.externalId || "Não informado"}
            </div>
          </div>
        </div>
      </div>

      {/* Segunda linha com informações adicionais se a altura permitir */}
      {headerConfig.height > 60 && (
        <div className="absolute right-0 bottom-0 left-0 px-6 pt-2">
          <div className="grid w-full grid-cols-12 gap-4 text-xs">
            {/* Instituição */}
            <div className="col-span-4">
              <span className="text-gray-400">Instituição: </span>
              <span className="font-medium">
                {headerConfig.institutionName || "Não informada"}
              </span>
            </div>

            {/* Médico Requisitante */}
            <div className="col-span-4">
              <span className="text-gray-400">Médico: </span>
              <span className="font-medium">
                {headerConfig.requestingDoctor || "Não informado"}
              </span>
            </div>

            {/* CRM */}
            <div className="col-span-4">
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
