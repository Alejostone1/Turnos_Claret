const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  // Crea la ventana del navegador.
  const mainWindow = new BrowserWindow({
    width: 1280, // Ancho de la ventana
    height: 900, // Alto de la ventana
    webPreferences: {
      // Adjunta el script de "puente" para la comunicación segura
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Carga la vista principal en la raíz del proyecto.
  mainWindow.loadFile(path.join(__dirname, '..', 'INICIO_TURNOS.html'));
}

// Listener para el evento de guardado de archivo desde la interfaz
ipcMain.handle('save-file', async (event, { data, fileName }) => {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  
  const { filePath, canceled } = await dialog.showSaveDialog(browserWindow, {
    title: 'Guardar Reporte de Excel',
    defaultPath: fileName,
    filters: [{ name: 'Archivos de Excel', extensions: ['xlsx'] }]
  });

  if (canceled || !filePath) {
    return { success: false, message: 'Guardado cancelado por el usuario.' };
  }

  try {
    // Los datos vienen como un string base64, hay que convertirlos a un buffer
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true, path: filePath };
  } catch (error) {
    console.error('Fallo al guardar el archivo:', error);
    return { success: false, message: error.message };
  }
});

// Este método se llamará cuando Electron haya terminado
// la inicialización y esté listo para crear ventanas.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Cierra la aplicación cuando todas las ventanas se han cerrado (excepto en macOS).
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
