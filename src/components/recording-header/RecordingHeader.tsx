import React from 'react';
import { useHeaderConfigStore } from '@/store/store-header-config';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecordingHeaderProps {
  isVisible?: boolean;
}

export default function RecordingHeader({ isVisible = true }: RecordingHeaderProps) {
  const { headerConfig } = useHeaderConfigStore();

  if (!headerConfig.isEnabled || !isVisible) {
    return null;
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm text-white shadow-lg"
      style={{ height: `${headerConfig.height}px` }}
    >
      <div className="h-full px-6 flex items-center">
        <div className="grid grid-cols-12 gap-4 w-full">
          {/* Nome do Exame */}
          <div className="col-span-3">
            <div className="text-xs text-gray-400 mb-1">Exame</div>
            <div className="text-sm font-medium truncate">
              {headerConfig.examName || 'Não informado'}
            </div>
          </div>

          {/* Data do Exame */}
          <div className="col-span-2">
            <div className="text-xs text-gray-400 mb-1">Data</div>
            <div className="text-sm font-medium">
              {formatDate(headerConfig.examDate) || 'Não informada'}
            </div>
          </div>

          {/* Nome do Paciente */}
          <div className="col-span-3">
            <div className="text-xs text-gray-400 mb-1">Paciente</div>
            <div className="text-sm font-medium truncate">
              {headerConfig.patientName || 'Não informado'}
            </div>
          </div>

          {/* Sexo e Idade */}
          <div className="col-span-2">
            <div className="text-xs text-gray-400 mb-1">Sexo / Idade</div>
            <div className="text-sm font-medium">
              {headerConfig.patientSex && headerConfig.patientAge
                ? `${headerConfig.patientSex} / ${headerConfig.patientAge}`
                : headerConfig.patientSex || headerConfig.patientAge || 'Não informado'}
            </div>
          </div>

          {/* ID Externo */}
          <div className="col-span-2">
            <div className="text-xs text-gray-400 mb-1">ID</div>
            <div className="text-sm font-medium truncate">
              {headerConfig.externalId || 'Não informado'}
            </div>
          </div>
        </div>
      </div>

      {/* Segunda linha com informações adicionais se a altura permitir */}
      {headerConfig.height > 60 && (
        <div className="px-6 pb-2">
          <div className="grid grid-cols-12 gap-4 w-full text-xs">
            {/* Instituição */}
            <div className="col-span-4">
              <span className="text-gray-400">Instituição: </span>
              <span className="font-medium">
                {headerConfig.institutionName || 'Não informada'}
              </span>
            </div>

            {/* Médico Requisitante */}
            <div className="col-span-4">
              <span className="text-gray-400">Médico: </span>
              <span className="font-medium">
                {headerConfig.requestingDoctor || 'Não informado'}
              </span>
            </div>

            {/* CRM */}
            <div className="col-span-4">
              <span className="text-gray-400">CRM: </span>
              <span className="font-medium">
                {headerConfig.crm || 'Não informado'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
