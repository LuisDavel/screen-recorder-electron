#!/bin/bash

# 🍎 Script de Teste Rápido - Permissões do macOS
# Este script verifica rapidamente o status das permissões do aplicativo no macOS

echo "🔍 Verificando permissões do macOS..."
echo "======================================="

# Configuração
APP_BUNDLE_ID="com.videorecorder.app"
APP_NAME="VideoRecorder"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📱 Aplicativo: ${APP_NAME}${NC}"
echo -e "${BLUE}📦 Bundle ID: ${APP_BUNDLE_ID}${NC}"
echo ""

# Verificar se o tccutil está disponível
if ! command -v tccutil &> /dev/null; then
    echo -e "${RED}❌ tccutil não encontrado${NC}"
    echo "Este script requer macOS 10.14 ou superior"
    exit 1
fi

# Verificar versão do macOS
echo -e "${BLUE}🍎 Versão do macOS:${NC}"
sw_vers -productName && sw_vers -productVersion
echo ""

# Verificar permissões atuais
echo -e "${BLUE}🔐 Status das Permissões:${NC}"
echo "========================="

# Função para verificar permissão específica
check_permission() {
    local service=$1
    local name=$2
    
    # Verificar se o app está na lista de permissões
    if tccutil list | grep -q "${APP_BUNDLE_ID}.*${service}"; then
        echo -e "${GREEN}✅ ${name}: Listado nas permissões${NC}"
    else
        echo -e "${RED}❌ ${name}: Não encontrado nas permissões${NC}"
    fi
}

# Verificar cada permissão
check_permission "kTCCServiceCamera" "Câmera"
check_permission "kTCCServiceMicrophone" "Microfone"
check_permission "kTCCServiceScreenCapture" "Captura de Tela"

echo ""

# Verificar se o aplicativo está instalado
echo -e "${BLUE}📦 Verificando Instalação:${NC}"
if [ -d "/Applications/${APP_NAME}.app" ]; then
    echo -e "${GREEN}✅ Aplicativo encontrado em /Applications/${NC}"
    
    # Verificar Info.plist
    INFO_PLIST="/Applications/${APP_NAME}.app/Contents/Info.plist"
    if [ -f "$INFO_PLIST" ]; then
        echo -e "${GREEN}✅ Info.plist encontrado${NC}"
        
        # Verificar se as chaves de permissão estão presentes
        if plutil -p "$INFO_PLIST" | grep -q "NSCameraUsageDescription"; then
            echo -e "${GREEN}✅ NSCameraUsageDescription presente${NC}"
        else
            echo -e "${RED}❌ NSCameraUsageDescription ausente${NC}"
        fi
        
        if plutil -p "$INFO_PLIST" | grep -q "NSMicrophoneUsageDescription"; then
            echo -e "${GREEN}✅ NSMicrophoneUsageDescription presente${NC}"
        else
            echo -e "${RED}❌ NSMicrophoneUsageDescription ausente${NC}"
        fi
        
        if plutil -p "$INFO_PLIST" | grep -q "NSScreenCaptureDescription"; then
            echo -e "${GREEN}✅ NSScreenCaptureDescription presente${NC}"
        else
            echo -e "${RED}❌ NSScreenCaptureDescription ausente${NC}"
        fi
    else
        echo -e "${RED}❌ Info.plist não encontrado${NC}"
    fi
    
    # Verificar assinatura de código
    echo ""
    echo -e "${BLUE}🔏 Verificando Assinatura:${NC}"
    if codesign -dv "/Applications/${APP_NAME}.app" 2>&1 | grep -q "not signed"; then
        echo -e "${YELLOW}⚠️  Aplicativo não assinado${NC}"
    else
        echo -e "${GREEN}✅ Aplicativo assinado${NC}"
    fi
else
    echo -e "${RED}❌ Aplicativo não encontrado em /Applications/${NC}"
fi

echo ""

# Verificar logs de produção
echo -e "${BLUE}📋 Verificando Logs:${NC}"
LOG_DIR="$HOME/Library/Application Support/${APP_NAME}/logs"
if [ -d "$LOG_DIR" ]; then
    echo -e "${GREEN}✅ Diretório de logs encontrado${NC}"
    
    # Mostrar logs mais recentes
    LATEST_LOG=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | head -1)
    if [ -n "$LATEST_LOG" ]; then
        echo -e "${GREEN}✅ Log mais recente: $(basename "$LATEST_LOG")${NC}"
        echo -e "${BLUE}📄 Últimas 5 linhas do log:${NC}"
        tail -5 "$LATEST_LOG" | while read line; do
            echo "   $line"
        done
    else
        echo -e "${YELLOW}⚠️  Nenhum arquivo de log encontrado${NC}"
    fi
else
    echo -e "${RED}❌ Diretório de logs não encontrado${NC}"
fi

echo ""

# Sugestões de ação
echo -e "${BLUE}🔧 Sugestões de Ação:${NC}"
echo "====================="

# Se há problemas, sugerir soluções
if tccutil list | grep -q "${APP_BUNDLE_ID}"; then
    echo -e "${GREEN}✅ Aplicativo está nas permissões do sistema${NC}"
    echo "   • Execute o aplicativo para verificar funcionalidade"
    echo "   • Use o diagnóstico integrado no aplicativo"
else
    echo -e "${YELLOW}⚠️  Aplicativo não está nas permissões do sistema${NC}"
    echo "   • Execute o aplicativo para solicitar permissões"
    echo "   • Verifique se os diálogos de permissão aparecem"
    echo "   • Use o reset de permissões se necessário"
fi

echo ""

# Comandos úteis
echo -e "${BLUE}🛠️  Comandos Úteis:${NC}"
echo "=================="
echo "• Reset de permissões:"
echo "  tccutil reset Camera ${APP_BUNDLE_ID}"
echo "  tccutil reset Microphone ${APP_BUNDLE_ID}"
echo "  tccutil reset ScreenCapture ${APP_BUNDLE_ID}"
echo ""
echo "• Abrir Preferências do Sistema:"
echo "  open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Camera'"
echo "  open 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'"
echo "  open 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'"
echo ""
echo "• Verificar Info.plist:"
echo "  plutil -p '/Applications/${APP_NAME}.app/Contents/Info.plist' | grep -E '(NSCamera|NSMicrophone|NSScreen)'"
echo ""
echo "• Verificar assinatura:"
echo "  codesign -dv '/Applications/${APP_NAME}.app'"

echo ""
echo -e "${GREEN}✅ Verificação concluída!${NC}"
echo "Use o diagnóstico integrado no aplicativo para análise mais detalhada." 