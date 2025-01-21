const { app, BrowserWindow, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const { spawn } = require('child_process');
let mainWindow = null
let popupWindow = null
function createWindow() {
     mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            sandbox: false
        }
    });

    mainWindow.loadFile('index.html');
    //win.webContents.openDevTools(); 
    mainWindow.on('closed', () => {
        win = null;
        if (popupWindow) {
            popupWindow.close();
            popupWindow = null;
        }
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
       
    }
});
ipcMain.on('show-popup-message', (event, appName,pid) => {
    if (popupWindow) {
        return; 
    }

    popupWindow = new BrowserWindow({
        width: 600,
        height: 600,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    popupWindow.loadFile('popup.html', {
        query: { 
            'app': appName,
            'pid': pid 
        }
    });

    popupWindow.on('closed', () => {
        popupWindow = null;

    });
});

ipcMain.on('stay-focused', (event, data) => {
    if (popupWindow) {
        popupWindow.close();
        popupWindow = null;
    
   
    if (!data.appName.endsWith('.exe')) {
        const pythonProcess = spawn('python', ['closeTab.py', data.pid, data.appName]);
        pythonProcess.stdout.on('data', (data) => {
            const result = JSON.parse(data.toString());
            console.log('Python script result:', result);
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error('Python script error:', data.toString());
        });
        }
    else{
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


ipcMain.on('cooldown',(event)=>{
    if (popupWindow) {
        popupWindow.close();
        popupWindow = null;
        mainWindow.webContents.send('cooldown');
    }
})


ipcMain.on('dismiss',(event,appName)=>{
    if (popupWindow) {
        popupWindow.close();
        popupWindow = null;
        mainWindow.webContents.send('dismiss',appName);
    }
});