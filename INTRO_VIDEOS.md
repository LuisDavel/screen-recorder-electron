# Sistema de Vídeos de Introdução

Este sistema permite adicionar automaticamente vídeos de introdução aos vídeos gravados, baseado na instituição selecionada.

## Como Funciona

1. **Seleção da Instituição**: No HeaderConfig, selecione uma das instituições disponíveis
2. **Verificação Automática**: O sistema verifica se existe um vídeo de introdução para a instituição
3. **Ativação**: Se disponível, você pode ativar o vídeo de introdução com o switch
4. **Concatenação**: Durante o salvamento, o vídeo de introdução é automaticamente concatenado com a gravação

## Mapeamento de Vídeos

Os vídeos de introdução estão localizados na pasta `assets/` e mapeados da seguinte forma:

- **Hospital São Jose** → `hsj.mp4`
- **Samuel Cesconetto** → `me.mp4`
- **Unimed** → `unimed.mp4`
- **Hospital São João Batista** → `hsj.mp4` (mesmo vídeo do São Jose)
- **Hospital São Donato** → `hsd.mp4`

## Requisitos

### FFmpeg
O sistema requer FFmpeg para concatenar os vídeos. O aplicativo verifica automaticamente se o FFmpeg está disponível.

**Instalação no macOS:**
```bash
brew install ffmpeg
```

**Instalação no Windows:**
1. Baixe FFmpeg de https://ffmpeg.org/download.html
2. Extraia e adicione ao PATH do sistema
3. Reinicie o aplicativo

**Instalação no Linux:**
```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# CentOS/RHEL
sudo yum install ffmpeg

# Arch
sudo pacman -S ffmpeg
```

## Estrutura de Arquivos

```
assets/
├── hsj.mp4      # Hospital São Jose
├── me.mp4       # Samuel Cesconetto
├── unimed.mp4   # Unimed
└── hsd.mp4      # Hospital São Donato
```

## Como Adicionar Novos Vídeos

1. **Adicione o arquivo de vídeo** na pasta `assets/`
2. **Atualize o mapeamento** em `src/helpers/video-intro-manager.ts`:
   ```typescript
   export const HOSPITAL_INTRO_MAPPING = {
     "Nova Instituição": "novo_video.mp4",
     // ... outros mapeamentos
   } as const;
   ```
3. **Adicione a opção no select** em `src/components/recording-header/HeaderConfig.tsx`

## Processo de Concatenação

1. **Salvamento Temporário**: O vídeo gravado é salvo temporariamente
2. **Verificação**: Sistema verifica se a instituição tem vídeo de introdução
3. **Concatenação**: FFmpeg concatena intro + gravação usando o comando:
   ```bash
   ffmpeg -f concat -safe 0 -i lista_videos.txt -c copy video_final.mp4
   ```
4. **Arquivo Final**: O vídeo final é salvo com nomenclatura: `[CODIGO]-intro-recording-[TIMESTAMP].mp4`

## Códigos das Instituições

- **HSJ** - Hospital São Jose
- **SC** - Samuel Cesconetto
- **UNI** - Unimed
- **HSJB** - Hospital São João Batista
- **HSD** - Hospital São Donato

## Interface do Usuário

### HeaderConfig
- **Switch de Vídeo de Introdução**: Ativa/desativa a concatenação
- **Indicador Visual**: Badge "Intro" aparece nas instituições que possuem vídeo
- **Status**: Mostra se o vídeo está disponível para a instituição selecionada

### Página de Configurações
- **Status do FFmpeg**: Mostra se o FFmpeg está disponível
- **Instalação Automática**: Botão para instalar FFmpeg (macOS com Homebrew)
- **Instruções**: Guia de instalação manual para outras plataformas

## Tratamento de Erros

- **FFmpeg não encontrado**: Vídeo é salvo sem introdução
- **Vídeo de introdução não encontrado**: Gravação normal é mantida
- **Erro na concatenação**: Arquivo original é preservado
- **Falha no salvamento**: Mensagens de erro detalhadas

## Logs e Debug

O sistema registra logs detalhados para debug:
- Verificação de disponibilidade de vídeos
- Processo de concatenação
- Erros e warnings
- Status do FFmpeg

## Limitações Atuais

1. **Seletor de Arquivo**: Vídeos de introdução só funcionam com local de salvamento específico
2. **Formatos**: Otimizado para MP4, pode ter limitações com outros formatos
3. **Tamanho**: Vídeos muito grandes podem demorar para concatenar
4. **Plataforma**: Instalação automática do FFmpeg apenas no macOS

## Próximos Passos

- [ ] Suporte a introdução com seletor de arquivo
- [ ] Preview dos vídeos de introdução
- [ ] Configuração de duração da introdução
- [ ] Suporte a outros formatos de vídeo
- [ ] Cache de verificação de disponibilidade