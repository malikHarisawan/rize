const { app, BrowserWindow, ipcMain, screen, Tray, Menu, globalShortcut } = require('electron');
const { exec, spawn } = require('child_process');
const path = require('path');

let mainWindow = null;
let popupWindow = null;
let tray = null;

function createWindow() {
    mainWindow = new BrowserWindow({

        width: 800,
        height: 600,
        show: false,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false,
        },
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools(); 

    mainWindow.on('close', (e) => {
        if (!app.isQuiting) {
            e.preventDefault();
            mainWindow.hide();
        }
        return false;
    });
}


function showMainWindow() {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
}


function createPopUp(appName, pid) {
    if (popupWindow) return;
    const cursorPosition = screen.getCursorScreenPoint();
    const distractedDisplay = screen.getDisplayNearestPoint(cursorPosition);


    const { x, y, width, height } = distractedDisplay.workArea;

    const popupWidth = 600;
    const popupHeight = 600;

    const popupX = x + (width - popupWidth) / 2;
    const popupY = y + (height - popupHeight) / 2;


    popupWindow = new BrowserWindow({
        width: popupWidth,
        height: popupHeight,
        x: Math.round(popupX),
        y: Math.round(popupY),
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        fullscreen: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    popupWindow.loadFile('popup.html', {
        query: { app: appName, pid: pid },
    });

    popupWindow.on('closed', () => {
        popupWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();
    ipcMain.on('show-popup-message', (event, appName, pid) => {
        createPopUp(appName, pid);
    });

    tray = new Tray('./logo.png');
    const trayMenu = Menu.buildFromTemplate([
        { label: 'Show App', click: () => showMainWindow() },
        {
            label: 'Quit', click: () => {
                app.isQuiting = true;
                if (mainWindow) {
                    mainWindow.close();
                }
                app.quit()
            }
        },
    ]);

    tray.setContextMenu(trayMenu);
    tray.setToolTip('Focusbook');

    tray.on('click', () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
        }
    });
    globalShortcut.register('CommandOrControl+o', () => {
        showMainWindow();
    });

    globalShortcut.register('CommandOrControl+q', () => {
        app.isQuiting = true
        if (mainWindow) {
            mainWindow.close();
        }
        app.quit()
    });

});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
app.on('window-all-closed', (e) => {
    if (process.platform !== 'darwin') {
        e.preventDefault();
   
    }
});

ipcMain.on('stay-focused', (event, data) => {
    if (popupWindow) {
        popupWindow.close();
        popupWindow = null;

        if (!data.appName.endsWith('.exe')) {
            const pythonProcess = spawn('python', ['closeTab.py', data.pid, data.appName]);
            pythonProcess.stdout.on('data', (data) => {
                const result = JSON.parse(data.toString());

            });

            pythonProcess.stderr.on('data', (data) => {
                console.error('Python script error:', data.toString());
            });
        } else {
            exec(`taskkill /IM ${data.appName} /F`, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Error closing app: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.error(`Error: ${stderr}`);
                    return;
                }
                console.log(`App closed: ${stdout}`);
            });
        }
    }
});
app.on('activate', () => {
    if (mainWindow && !mainWindow.isVisible()) {
        mainWindow.show();
    } else if (!mainWindow) {
        createWindow();
    }
});
ipcMain.on('cooldown', (event) => {
    if (popupWindow) {
        popupWindow.close();
        popupWindow = null;
        if (mainWindow) {
            mainWindow.webContents.send('cooldown');
        }
    }
});

ipcMain.on('dismiss', (event, appName) => {

    if (popupWindow) {
        if (mainWindow) {
            console.log("dismess index")
            mainWindow.webContents.send('dismiss', appName);
        }
        popupWindow.close();
        popupWindow = null;
    }
});
