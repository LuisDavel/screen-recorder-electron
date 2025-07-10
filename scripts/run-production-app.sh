#!/bin/bash

# Script para executar a aplicação de produção sem problemas de Gatekeeper
# Resolve os problemas de quarentena e assinatura no macOS

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Video Recorder - Executar Aplicação de Produção${NC}"
echo ""

# Verificar se existe uma build
if [ ! -d "out/make" ]; then
    echo -e "${RED}❌ Não foi encontrada uma build. Execute 'npm run make' primeiro.${NC}"
    exit 1
fi

# Encontrar o DMG mais recente
DMG_PATH=$(find out/make -name "*.dmg" -type f | head -1)
if [ -z "$DMG_PATH" ]; then
    echo -e "${RED}❌ Não foi encontrado arquivo DMG.${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Arquivo DMG encontrado: $DMG_PATH${NC}"

# Montar o DMG
echo -e "${YELLOW}🔧 Montando DMG...${NC}"
MOUNT_POINT=$(hdiutil attach "$DMG_PATH" | grep "Video Recorder" | awk '{for(i=3;i<=NF;i++) printf "%s ", $i; print ""}' | sed 's/ $//')
if [ -z "$MOUNT_POINT" ]; then
    echo -e "${RED}❌ Falha ao montar o DMG.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ DMG montado em: $MOUNT_POINT${NC}"

# Copiar aplicação para Desktop
APP_NAME="Video Recorder.app"
DESKTOP_APP_PATH="$HOME/Desktop/$APP_NAME"

echo -e "${YELLOW}🔧 Copiando aplicação para Desktop...${NC}"
if [ -d "$DESKTOP_APP_PATH" ]; then
    rm -rf "$DESKTOP_APP_PATH"
fi

cp -R "$MOUNT_POINT/$APP_NAME" "$DESKTOP_APP_PATH"

# Remover quarentena
echo -e "${YELLOW}🔧 Removendo quarentena...${NC}"
xattr -rd com.apple.quarantine "$DESKTOP_APP_PATH" 2>/dev/null || true

# Desmontar DMG
echo -e "${YELLOW}🔧 Desmontando DMG...${NC}"
hdiutil detach "$MOUNT_POINT" -quiet

# Executar aplicação
echo -e "${GREEN}🎉 Executando aplicação...${NC}"
open -a "$DESKTOP_APP_PATH"

echo ""
echo -e "${GREEN}✅ Aplicação executada com sucesso!${NC}"
echo -e "${BLUE}📍 Localização: $DESKTOP_APP_PATH${NC}"
echo ""
echo -e "${YELLOW}💡 Dicas:${NC}"
echo -e "   • A aplicação foi copiada para o Desktop"
echo -e "   • Você pode executá-la diretamente a partir do Desktop"
echo -e "   • Para builds futuras, execute este script novamente"
echo ""

# Verificar se a aplicação está rodando
sleep 2
if pgrep -f "VideoRecorder" > /dev/null; then
    echo -e "${GREEN}✅ Aplicação está rodando!${NC}"
else
    echo -e "${YELLOW}⚠️  Aplicação pode não ter iniciado corretamente.${NC}"
    echo -e "${YELLOW}   Verifique as permissões do sistema se necessário.${NC}"
fi 