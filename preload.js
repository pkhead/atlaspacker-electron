const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("appControls", {
    // file controls
    new: (callback) => ipcRenderer.on("file_new", callback),
    open: (callback) => ipcRenderer.on("file_open", callback),
    save: (callback) => ipcRenderer.on("file_save", (ev, type) => {
        callback(type).then((data) => ipcRenderer.send("doSave", data));
    }),
    export: (callback) => ipcRenderer.on("file_export", (ev, pngName) => {
        callback(pngName).then((data) => ipcRenderer.send("doExport", data.image, data.meta));
    }),

    // edit controls
    resize: (callback) => ipcRenderer.on("edit_resize", callback),
    format: (callback) => ipcRenderer.on("edit_format", callback),
    id: (callback) => ipcRenderer.on("edit_id", callback),
});