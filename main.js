const { app, BrowserWindow, Menu, MenuItem, ipcMain, dialog } = require("electron");
const fs = require("fs");
const path = require("path");
const { windowsStore } = require("process");

const createWindow = (filePath = null) => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,

        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        }
    });

    var fileExt = null;

    async function saveAs() {
        var res = await dialog.showSaveDialog(win, {
            filters: [
                { name: "Atlas", extensions: ["atlas"]},
                { name: "Atlas JSON", extensions: ["json"]}
            ],
            defaultPath: "atlas.atlas",
        });

        if (res.canceled) {
            return false;
        };

        filePath = res.filePath;
        fileExt = path.extname(filePath);
        win.webContents.send("file_save", fileExt);

        win.setTitle(`${path.basename(filePath)} - Atlaspack`);

        return true;
    }

    async function saveFile() {
        if (filePath === null) {
            return await saveAs();
        } else {
            win.webContents.send("file_save", fileExt);
            return true;
        }
    }

    function openFile(fpath) {
        return new Promise((resolve, reject) => {
            fs.readFile(fpath, (err, data) => {
                if (err) {
                    console.error(err);
                    return;
                }

                filePath = fpath;
                fileExt = path.extname(fpath);
                win.setTitle(`${path.basename(filePath)} - Atlaspack`);

                win.webContents.send("file_open", data, fileExt);
                resolve();
            });
        });
    }

    ipcMain.on("doSave", (ev, data) => {
        console.log("Write to " + filePath);
        console.log(data);
        fs.writeFile(filePath, Buffer.from(data), (err) => {
            console.error(err);
        });
    });

    const MENU_TEMPLATE = [
        {
            label: "&File",
            submenu: [
                {
                    label: "New",
                    accelerator: "CommandOrControl+N",
                    click: () => {
                        dialog.showMessageBox(win, {
                            message: `Do you want to save changes to ${filePath || "Untitled"}?`,
                            type: "question",
                            title: "New Document",
                            buttons: ["Save", "Don't Save", "Cancel "],
                            defaultId: 1,
                            cancelId: 2,
                        }).then(async(data) => {
                            var res = data.response;

                            if (res === 2) return;
                            if (res === 0) {
                                let res = await saveFile()
                             
                                // if user canceled, return
                                if (!res) return;
                            }

                            filePath = null;
                            fileExt = null;
                            win.setTitle("Atlaspack");

                            win.webContents.send("file_new");
                        })
                    }
                },
                {
                    label: "Save As",
                    accelerator: "CommandOrControl+Shift+S",
                    click: () => saveAs(),
                },
                {
                    label: "Save",
                    accelerator: "CommandOrControl+S",
                    click: () => saveFile(),
                },
                {
                    accelerator: "CommandOrControl+O",
                    label: "Open",
                    click: () => {
                        dialog.showOpenDialog(win, {filters: [
                            { name: "Atlas", extensions: ["atlas"]},
                            { name: "Atlas JSON", extensions: ["json"]},
                            { name: "All Files", extensions: ["*"]}
                        ]}).then((res) => {
                            if (!res.canceled) {
                                openFile(res.filePaths[0]);
                            }
                        })
                    }
                },
                {
                    label: "Export",
                    click: async () => {
                        var pngRes = await dialog.showSaveDialog(win, {
                            filters: [
                                { name: "PNG", extensions: ["png"] },
                                { name: "All Files", extensions: ["*"] }
                            ],
                            defaultPath: "atlas.png",
                        });

                        if (pngRes.canceled) return;

                        /*var metaRes = await dialog.showSaveDialog(win, {
                            filters: [
                                { name: "Atlas Metadata", extensions: ["meta"]},
                                { name: "All Files", extensions: ["*"]}
                            ],
                            defaultPath: path.basename(pngRes.filePath, path.extname(pngRes.filePath)),
                        });*/
                        var metaPath = path.join(path.dirname(pngRes.filePath), path.basename(pngRes.filePath, path.extname(pngRes.filePath)) + ".meta");

                        win.webContents.send("file_export", path.relative(metaPath, pngRes.filePath));
                        ipcMain.once("doExport", (ev, pngData, metaData) => {
                            fs.writeFileSync(metaPath, metaData, "utf-8");
                            fs.writeFileSync(pngRes.filePath, Buffer.from(pngData));
                        })
                    },
                },
                {type: "separator"},
                {role: "close"}]
        },
        {
            label: "&Edit",
            submenu: [
                {role: "undo"},
                {role: "redo"},
                {type: "separator"},
                {
                    label: "Resize to Extents",
                    accelerator: "CommandOrControl+E",
                    click: () => win.webContents.send("edit_resize"),
                },
                {
                    label: "Format Selection",
                    accelerator: "CommandOrControl+F",
                    click: () => win.webContents.send("edit_format"),
                },
                {
                    label: "Set ID",
                    click: () => win.webContents.send("edit_id"),
                },
                {type: "separator"},
                {role: "cut"},
                {role: "copy"},
                {role: "paste"}
            ],
        },
        {
            label: "&View",
            submenu: [{role: "resetzoom"}, {role: "zoomin"}, {role: "zoomout"}, {role: "reload"}],
        }
    ]
    
    const menu = Menu.buildFromTemplate(MENU_TEMPLATE);
    Menu.setApplicationMenu(menu);

    win.loadFile("app/index.html");

    win.setTitle("Untitled - Atlaspack")

    win.webContents.once("dom-ready", () => {
        if (filePath) {
            openFile(filePath);
        }

        win.webContents.openDevTools();
    });
};
 
app.whenReady().then(() => {
    if (process.argv.length > 2) {
        for (let i = 2; i < process.argv.length; i++) {
            let arg = process.argv[i];    
            console.log("open " + arg);
            createWindow(arg);
        }
    } else {
        createWindow();
    }

    app.on("activate", () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
})