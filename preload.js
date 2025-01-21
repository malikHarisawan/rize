const { contextBridge, ipcRenderer } = require('electron');
const activeWindows = require('electron-active-window');
const fs = require('fs');
const APP_CATEGORIES = require('./categories.js');
const { spawn } = require('child_process');

let appUsageData = {};
let lastActiveApp = null;
let lastUpdateTime = Date.now();
let lastDismissedTime = 0;
const currentDate = new Date();
const year = currentDate.getFullYear();
const month = String(currentDate.getMonth() + 1).padStart(2, '0');
const day = String(currentDate.getDate()).padStart(2, '0');
const formattedDate = `${year}-${month}-${day}`;
loadData();
let isCoolDown = false
Distracted_apps = ['Notion.exe', 'Spotify.exe', 'Skype.exe', "mail.google.com", "youtube.com", "chatgpt.com"]

async function getActiveChromeTab(pid) {
    if (!pid) {
        console.warn('Invalid PID: Cannot fetch Chrome tab info');
        return null;
    }

    return new Promise((resolve, reject) => {
        const pythonProcess = spawn('python', ['get_active_url.py', pid.toString()]);

        let output = '';
        let error = '';

        pythonProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            error += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                try {
                    const result = JSON.parse(output);
                    resolve(result);
                } catch (parseError) {
                    reject(`Error parsing JSON: ${parseError.message}`);
                }
            } else {
                reject(`Python process exited with code ${code}: ${error}`);
            }
        });
    });
}

async function updateAppUsage() {
    try {
        const currentWindow = await get_Active_Window();
        const pid = await getChromePid();
        let active_url = null;
        if (pid) {
            const chromeTabInfo = await getActiveChromeTab(pid);

            active_url = String(chromeTabInfo.active_app);

        }
        const currentTime = Date.now();

        if (!isCoolDown) {

            if (currentWindow.windowClass == "chrome.exe" && active_url) {
                if (Distracted_apps.includes(active_url)) {
                    ipcRenderer.send('show-popup-message', active_url, pid);
                }
            }
            else if (Distracted_apps.includes(currentWindow.windowClass) && currentWindow.windowClass) {
                ipcRenderer.send('show-popup-message', currentWindow.windowClass);
            }

        }
        if (lastActiveApp && lastActiveApp.windowClass) {
            const timeSpent = currentTime - lastUpdateTime;
            if (!appUsageData.hasOwnProperty(formattedDate)) {
                appUsageData[formattedDate] = { apps: {} };
            }
            if (lastActiveApp.windowClass !== "chrome.exe") {
                if (!appUsageData[formattedDate].apps.hasOwnProperty(lastActiveApp.windowClass)) {
                    appUsageData[formattedDate].apps[lastActiveApp.windowClass] = {
                        time: 0,
                        category: getCategory(lastActiveApp.windowClass),
                    };
                }
                appUsageData[formattedDate].apps[lastActiveApp.windowClass].time += timeSpent;
            }
            if (lastActiveApp.windowClass == "chrome.exe" && active_url) {
                if (!appUsageData[formattedDate].apps.hasOwnProperty(active_url)) {
                    appUsageData[formattedDate].apps[active_url] = {
                        time: 0,
                        category: getCategory(active_url),
                    };
                }
                appUsageData[formattedDate].apps[active_url].time += timeSpent;
            }
        }
        lastActiveApp = currentWindow;
        lastUpdateTime = currentTime;
    } catch (error) {
        console.error('Error updating app usage:', error);
    }
}

async function getChromePid() {
    try {
        const activeWindow = await activeWindows().getActiveWindow();
        if (activeWindow.windowClass === 'chrome.exe') {

            return activeWindow.windowPid;
        }
    } catch (error) {
        console.error('Error fetching Chrome PID:', error);
    }
    return null;
}

function getCategory(app) {
    for (const category in APP_CATEGORIES) {
        if (APP_CATEGORIES.hasOwnProperty(category)) {
            if (APP_CATEGORIES[category].apps.includes(app)) {

                return category;
            }
        }
    }
    return 'Miscellaneous';
}

function getCategoryColor(cat) {

    if (APP_CATEGORIES.hasOwnProperty(cat)) {
        return APP_CATEGORIES[cat].color
    }

    return '#7a7a7a';
}

function getCategoryAppsData(date) {
    const apps_data = {}
    if (appUsageData[date] && appUsageData[date].apps) {

        for (const [app, appData] of Object.entries(appUsageData[date].apps)) {
            const { category, time } = appData;
            const color = getCategoryColor(category)
            if (!apps_data[category]) {
                apps_data[category] = []
            }

            apps_data[category].push({ app, time, color })

        }
        return apps_data
    } else {
        return null
    }

}

const result = getCategoryAppsData(formattedDate)

console.log("result --- ---", result)
setInterval(updateAppUsage, 5000);
setInterval(saveData, 60000);

contextBridge.exposeInMainWorld('activeWindow', {
    getAppUsageStats: () => appUsageData,
    getFormattedStats: (date) => getFormattedStats(date),
    getCategoryAppsData: (date) => getCategoryAppsData(date),
    getCategoryColor: (cat) => getCategoryColor(cat)
});

function getFormattedStats(date) {
    const stats = {};
    if (appUsageData[date] && appUsageData[date].apps) {
        for (const [app, appData] of Object.entries(appUsageData[date].apps)) {
            if (!stats.hasOwnProperty(appData.category)) {
                stats[appData.category] = 0;
            }
            stats[appData.category] += appData.time
        }
        return stats;
    }
    else {
        return null
    }

}

async function get_Active_Window() {
    try {
        const result = await activeWindows().getActiveWindow();
        return result;
    } catch (error) {
        console.error('Error fetching active window:', error);
        return null;
    }
}

function loadData() {
    try {
        const data = fs.readFileSync('data.json', 'utf-8');
        appUsageData = JSON.parse(data);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function saveData() {
    const data = appUsageData;
    const jsonData = JSON.stringify(data, null, 4);
    fs.writeFile('data.json', jsonData, (err) => {
        if (err) console.log('Error writing to file ', err);
    });
}


ipcRenderer.on('dismiss-popup-reply', (event, appName) => {
    const index = Distracted_apps.indexOf(appName);
    console.log("App ----", Distracted_apps)
    if (index > -1) {
        Distracted_apps.splice(index, 1);
        console.log(`${appName} removed from Distracted_apps list`);
    }
});


ipcRenderer.on('cooldown', (event) => {
    isCoolDown = true
    setTimeout(() => {
        isCoolDown = false
    }, 60000)
})

ipcRenderer.on('dismiss', (event, appName) => {
    const index = Distracted_apps.indexOf(appName);
    console.log("App ----", Distracted_apps)
    if (index > -1) {
        Distracted_apps.splice(index, 1);
        console.log(`${appName} removed from Distracted_apps list`);
    }
})

