// main.js - Processo Principal
const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let tray;
let isRecording = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false, // Inicia oculta
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // IMPORTANTE: Impede throttling quando minimizada
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Configurações anti-throttling
  app.commandLine.appendSwitch('disable-background-timer-throttling');
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

  mainWindow.loadFile('index.html');

  // Eventos da janela
  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide(); // Oculta ao invés de minimizar
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Controle de foco/visibilidade
  mainWindow.on('blur', () => {
    mainWindow.webContents.send('window-blur');
  });

  mainWindow.on('focus', () => {
    mainWindow.webContents.send('window-focus');
  });
}

function createTray() {
  // Criar ícone da bandeja
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath);
  
  tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
  
  updateTrayMenu();
  
  tray.setToolTip('Gravador de Vídeo');
  
  // Duplo clique para mostrar/ocultar
  tray.on('double-click', () => {
    toggleWindow();
  });
}

function updateTrayMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: mainWindow.isVisible() ? 'Ocultar' : 'Mostrar',
      click: () => toggleWindow()
    },
    { type: 'separator' },
    {
      label: isRecording ? 'Parar Gravação' : 'Iniciar Gravação',
      click: () => toggleRecording()
    },
    {
      label: 'Status da Gravação',
      enabled: false,
      sublabel: isRecording ? 'Gravando...' : 'Parada'
    },
    { type: 'separator' },
    {
      label: 'Configurações',
      click: () => {
        showWindow();
        mainWindow.webContents.send('open-settings');
      }
    },
    { type: 'separator' },
    {
      label: 'Sair',
      click: () => {
        app.isQuiting = true;
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
}

function toggleWindow() {
  if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    showWindow();
  }
  updateTrayMenu();
}

function showWindow() {
  mainWindow.show();
  mainWindow.focus();
}

function toggleRecording() {
  isRecording = !isRecording;
  mainWindow.webContents.send('toggle-recording', isRecording);
  updateTrayMenu();
  
  // Atualizar ícone da bandeja baseado no status
  updateTrayIcon();
}

function updateTrayIcon() {
  const iconName = isRecording ? 'tray-recording.png' : 'tray-icon.png';
  const iconPath = path.join(__dirname, 'assets', iconName);
  const trayIcon = nativeImage.createFromPath(iconPath);
  tray.setImage(trayIcon.resize({ width: 16, height: 16 }));
}

// IPC Handlers
ipcMain.handle('start-recording', async () => {
  isRecording = true;
  updateTrayMenu();
  updateTrayIcon();
  return { success: true };
});

ipcMain.handle('stop-recording', async () => {
  isRecording = false;
  updateTrayMenu();
  updateTrayIcon();
  return { success: true };
});

ipcMain.handle('get-recording-status', async () => {
  return { isRecording };
});

// Manter aplicação viva em background
ipcMain.handle('keep-alive', async () => {
  // Força manter processos ativos
  return { alive: true };
});

// App Events
app.whenReady().then(() => {
  createWindow();
  createTray();
  
  // Manter aplicação rodando mesmo sem janelas
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // Não fechar no macOS
  if (process.platform !== 'darwin') {
    if (!app.isQuiting) {
      // Não sair, apenas ocultar
      return;
    }
  }
  app.quit();
});

app.on('before-quit', () => {
  app.isQuiting = true;
});

// ============================================
// preload.js - Script de Preload
// ============================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Controle de gravação
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  getRecordingStatus: () => ipcRenderer.invoke('get-recording-status'),
  
  // Eventos da janela
  onWindowBlur: (callback) => ipcRenderer.on('window-blur', callback),
  onWindowFocus: (callback) => ipcRenderer.on('window-focus', callback),
  onToggleRecording: (callback) => ipcRenderer.on('toggle-recording', callback),
  onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
  
  // Keep alive
  keepAlive: () => ipcRenderer.invoke('keep-alive'),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// ============================================
// renderer.js - Processo Renderer
// ============================================

class VideoRecorder {
  constructor() {
    this.isRecording = false;
    this.mediaRecorder = null;
    this.stream = null;
    this.chunks = [];
    this.isWindowFocused = true;
    
    this.initializeEventListeners();
    this.startKeepAlive();
  }

  initializeEventListeners() {
    // Eventos da janela
    window.electronAPI.onWindowBlur(() => {
      this.isWindowFocused = false;
      console.log('Window blurred - maintaining video processing');
    });

    window.electronAPI.onWindowFocus(() => {
      this.isWindowFocused = true;
      console.log('Window focused');
    });

    // Controle via tray
    window.electronAPI.onToggleRecording((event, shouldRecord) => {
      if (shouldRecord) {
        this.startRecording();
      } else {
        this.stopRecording();
      }
    });

    // Controle via interface
    document.getElementById('startBtn').addEventListener('click', () => {
      this.startRecording();
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
      this.stopRecording();
    });
  }

  startKeepAlive() {
    // Manter aplicação viva - chama a cada 5 segundos
    setInterval(() => {
      window.electronAPI.keepAlive();
    }, 5000);
  }

  async startRecording() {
    try {
      // Capturar tela
      this.stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      // Configurar MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      this.chunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.chunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.saveRecording();
      };

      // Iniciar gravação
      this.mediaRecorder.start(1000); // Chunk a cada 1 segundo
      this.isRecording = true;
      
      // Notificar main process
      await window.electronAPI.startRecording();
      
      this.updateUI();
      this.startVideoProcessing();
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      alert('Erro ao iniciar gravação: ' + error.message);
    }
  }

  async stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.stream.getTracks().forEach(track => track.stop());
      this.isRecording = false;
      
      // Notificar main process
      await window.electronAPI.stopRecording();
      
      this.updateUI();
    }
  }

  startVideoProcessing() {
    // Processamento de vídeo que funciona mesmo com janela oculta
    const processFrame = () => {
      if (!this.isRecording) return;
      
      // Seu código de processamento de vídeo aqui
      this.processVideoFrame();
      
      // Usar setTimeout ao invés de requestAnimationFrame para manter funcionando em background
      if (!this.isWindowFocused) {
        setTimeout(processFrame, 16); // ~60fps
      } else {
        requestAnimationFrame(processFrame);
      }
    };
    
    processFrame();
  }

  processVideoFrame() {
    // Lógica de processamento do frame
    // Este método continuará funcionando mesmo com janela oculta
    
    // Exemplo: atualizar preview se janela estiver visível
    if (this.isWindowFocused) {
      this.updatePreview();
    }
    
    // Processamento que deve continuar em background
    this.updateRecordingStats();
  }

  updatePreview() {
    // Atualizar preview apenas se janela estiver visível
    const videoElement = document.getElementById('preview');
    if (videoElement && this.stream) {
      videoElement.srcObject = this.stream;
    }
  }

  updateRecordingStats() {
    // Atualizar estatísticas (tempo, tamanho, etc.)
    const timeElement = document.getElementById('recordingTime');
    if (timeElement) {
      // Atualizar tempo de gravação
    }
  }

  saveRecording() {
    const blob = new Blob(this.chunks, { type: 'video/webm' });
    const url = URL.createObjectURL(blob);
    
    // Criar link para download
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording-${Date.now()}.webm`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  updateUI() {
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const status = document.getElementById('status');
    
    if (this.isRecording) {
      startBtn.disabled = true;
      stopBtn.disabled = false;
      status.textContent = 'Gravando...';
      status.className = 'recording';
    } else {
      startBtn.disabled = false;
      stopBtn.disabled = true;
      status.textContent = 'Parado';
      status.className = 'stopped';
    }
  }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  new VideoRecorder();
});

// ============================================
// index.html - Interface básica
// ============================================

/*
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Gravador de Vídeo</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .controls {
      margin-bottom: 20px;
    }
    
    button {
      padding: 10px 20px;
      margin: 5px;
      font-size: 16px;
      cursor: pointer;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
      font-weight: bold;
    }
    
    .recording {
      background-color: #ffebee;
      color: #c62828;
    }
    
    .stopped {
      background-color: #e8f5e8;
      color: #2e7d32;
    }
    
    #preview {
      width: 100%;
      max-width: 640px;
      height: auto;
      border: 1px solid #ccc;
      border-radius: 5px;
    }
    
    .info {
      background-color: #e3f2fd;
      padding: 15px;
      border-radius: 5px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>Gravador de Vídeo</h1>
  
  <div class="info">
    <p><strong>Dica:</strong> Você pode controlar a gravação pelo ícone na bandeja do sistema, mesmo com a janela fechada!</p>
  </div>
  
  <div class="controls">
    <button id="startBtn">Iniciar Gravação</button>
    <button id="stopBtn" disabled>Parar Gravação</button>
  </div>
  
  <div id="status" class="status stopped">Parado</div>
  
  <div id="recordingTime"></div>
  
  <video id="preview" autoplay muted></video>
  
  <script src="renderer.js"></script>
</body>
</html>
*/