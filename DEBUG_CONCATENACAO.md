# 🔍 Debug da Concatenação de Vídeos

## 🚨 Problema Atual
A concatenação não está funcionando e o loading não está aparecendo após gravar um vídeo.

## 🛠️ Mudanças Implementadas para Debug

### 1. **Integração Global no BaseLayout**
- ✅ Adicionado `VideoConcatenationOverlay` no `BaseLayout.tsx`
- ✅ Adicionado `useVideoConcatenation` hook no layout principal
- ✅ Adicionado botão de teste temporário (apenas em desenvolvimento)

### 2. **Logs de Debug Adicionados**

#### `advanced-screen-recorder.ts`
```typescript
console.log("🎬 Disparando concatenação automática com vídeo remoto...");
console.log("🎬 Caminho do vídeo gravado:", result.filePath);
console.log("🎬 Verificando se videoConcatAPI está disponível:", !!window.videoConcatAPI);
```

#### `useVideoConcatenation.ts`
```typescript
console.log('🎬 useVideoConcatenation: Configurando listeners...');
console.log('🎬 Registrando listener IPC...');
console.log('🎬 Registrando listener window...');
```

#### `VideoConcatenationOverlay.tsx`
```typescript
console.log('🎬 VideoConcatenationOverlay render:', { isVisible, recordedVideoPath });
console.log('🎬 VideoConcatenationOverlay useEffect:', { isVisible, recordedVideoPath, hasAPI: !!window.videoConcatAPI });
```

### 3. **Função de Debug Global**
- ✅ Criado `src/helpers/debug-concat.ts`
- ✅ Exposto `window.debugConcat()` para teste no console

## 🧪 Como Testar

### 1. **Teste Básico no Console**
```javascript
// Verificar se tudo está funcionando
window.debugConcat()
```

### 2. **Teste do Botão Temporário**
- Procure pelo botão azul "🧪 Testar Concatenação" no canto superior direito
- Clique nele para simular um evento de concatenação

### 3. **Teste Real com Gravação**
1. Grave um vídeo no aplicativo
2. Salve o vídeo
3. Observe os logs no console
4. Verifique se o overlay aparece

## 🔍 Logs Esperados

### Quando Funcionar Corretamente:
```
🎬 useVideoConcatenation: Configurando listeners...
🎬 Registrando listener IPC...
🎬 Registrando listener window...
🎬 Listeners configurados com sucesso!
🎬 VideoConcatenationOverlay render: { isVisible: false, recordedVideoPath: null }

// Após salvar vídeo:
🎬 Disparando concatenação automática com vídeo remoto...
🎬 Caminho do vídeo gravado: /path/to/video.mp4
🎬 Verificando se videoConcatAPI está disponível: true
🎬 Evento criado: CustomEvent { ... }
🎬 Evento disparado com sucesso!
🎬 Recebido evento window de auto-concatenação: { recordedVideoPath: "/path/to/video.mp4" }
🎬 VideoConcatenationOverlay render: { isVisible: true, recordedVideoPath: "/path/to/video.mp4" }
🎬 Iniciando concatenação...
```

## 🚨 Possíveis Problemas

### 1. **videoConcatAPI não disponível**
- Verificar se `video-concat-context.ts` está sendo carregado
- Verificar se `context-exposer.ts` inclui `exposeVideoConcatContext()`
- Verificar se `listeners-register.ts` inclui `registerVideoConcatListeners()`

### 2. **Eventos não sendo disparados**
- Verificar se `advanced-screen-recorder.ts` está sendo usado
- Verificar se o salvamento está passando por esse código
- Verificar se há erros no console

### 3. **Hook não está escutando**
- Verificar se `BaseLayout` está sendo renderizado
- Verificar se o hook está sendo inicializado
- Verificar se os listeners estão sendo registrados

### 4. **Overlay não aparece**
- Verificar se `isVisible` está sendo setado como `true`
- Verificar se não há erros de CSS/styling
- Verificar se o componente está sendo renderizado

## 🔧 Comandos de Debug

### No Console do DevTools:
```javascript
// 1. Verificar APIs
console.log('videoConcatAPI:', !!window.videoConcatAPI);
console.log('electronAPI:', !!window.electronAPI);

// 2. Testar FFmpeg
await window.videoConcatAPI.checkFFmpeg();

// 3. Simular evento
window.dispatchEvent(new CustomEvent('video-concat:start-auto-concatenation', {
  detail: { recordedVideoPath: '/tmp/test.mp4' }
}));

// 4. Debug completo
window.debugConcat();
```

## 📋 Checklist de Verificação

- [ ] `videoConcatAPI` está disponível no window
- [ ] FFmpeg está funcionando
- [ ] Listeners estão sendo registrados
- [ ] Eventos estão sendo disparados após salvar vídeo
- [ ] Hook está recebendo os eventos
- [ ] Overlay está sendo renderizado
- [ ] Estado `isVisible` está sendo atualizado

## 🎯 Próximos Passos

1. **Executar testes** usando as funções de debug
2. **Verificar logs** no console durante gravação
3. **Identificar** onde o fluxo está falhando
4. **Corrigir** o problema específico encontrado
5. **Remover** logs de debug e botão de teste

---

**Use este guia para identificar exatamente onde o problema está ocorrendo.**