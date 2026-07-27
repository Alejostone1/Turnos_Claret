const { contextBridge, ipcRenderer } = require('electron');

// Expone una API segura al proceso de la interfaz (TURNOS.js)
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Envía los datos del archivo al proceso principal para que los guarde.
   * @param {object} fileData - Un objeto que contiene los datos y el nombre del archivo.
   * @param {string} fileData.data - Los datos del archivo en formato base64.
   * @param {string} fileData.fileName - El nombre sugerido para el archivo.
   * @returns {Promise<object>} - Una promesa que se resuelve con el resultado de la operación.
   */
  saveFile: (fileData) => ipcRenderer.invoke('save-file', fileData)
});
