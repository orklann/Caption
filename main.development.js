import os from 'os'
import path from 'path'
import {app, autoUpdater, BrowserWindow, Menu, shell, ipcMain, dialog } from 'electron';
import pkg from './package.json'


// -----
// const platform = os.platform() + '_' + os.arch();
// const version = app.getVersion();
// const updateURL = `http://localhost:6000/update/${os.platform()}?version=${pkg.version}`;
//
// autoUpdater.setFeedURL(updateURL);
//
// autoUpdater.on('checking-for-update', () => {
//     console.log('Checking for updates...');
// });
//
// autoUpdater.on('update-available', () => {
//
//     console.log('New Update Available!');
//
//     const options = {
//         type: 'question',
//         buttons: ['Restart', 'Later'],
//         title: "Update Available",
//         message: 'The new version has been downloaded. Restart the application to apply the updates.',
//         detail: `Caption ${pkg.version}`
//     }
//
//     dialog.showMessageBox(options, function(response) {
//         if (response == 0) {
//             autoUpdater.quitAndInstall();
//         }
//     });
//
// });
//
// autoUpdater.on('update-not-available', () => {
//     console.log(`You've got the latest version.`);
// });
//
// autoUpdater.on('update-downloaded', (e) => {
//     console.log(`update-downloaded`);
//     // autoUpdater.quitAndInstall();
// });
//
// autoUpdater.on('error', (error) => {
//     console.log(error)
// });
// -----

let menu;
let template;
let mainWindow = null;
let settingsWindow = null;

if (process.env.NODE_ENV === 'development') {
    // eslint-disable-line global-require
    require('electron-debug')();
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});


const installExtensions = async () => {
    if (process.env.NODE_ENV === 'development') {
        // eslint-disable-line global-require
        const installer = require('electron-devtools-installer');

        const extensions = [
            'REACT_DEVELOPER_TOOLS',
            'REDUX_DEVTOOLS'
        ];
        const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
        for (const name of extensions) {
            try {
                await installer.default(installer[name], forceDownload);
            } catch (e) {} // eslint-disable-line
        }
    }
};

/*
* Create Main Window
*/
const createMainWindow = () => {
    // Create the windows
    mainWindow = new BrowserWindow({
        center: true,
        show: false,
        width: 350,
        height: 320,
        vibrancy: 'ultra-dark',
        frame: false,
        transparent: true
    });

    // Set URL
    mainWindow.loadURL(`file://${__dirname}/app/app.html`);

    // vibrancy
    // electronVibrancy.SetVibrancy(mainWindow, 9);

    // Events
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
        settingsWindow = null;
    });
}

/*
* Create Settings Window
*/
const createSettingsWindow = () => {

    // Create
    settingsWindow = new BrowserWindow({
        show: false,
        width: 300,
        height: 150,
        vibrancy: 'ultra-dark',
        frame: false,
        transparent: true,
        resizable: false
    });

    // Set URL
    settingsWindow.loadURL(`file://${__dirname}/app/app.html#settings`);

    // vibrancy
    // electronVibrancy.SetVibrancy(settingsWindow, 9);

    // Events
    settingsWindow.on('closed', () => {
        settingsWindow = null
    });
}

app.on('ready', async () => {
    await installExtensions();

    // create windows
    createMainWindow();
    createSettingsWindow();

    // Events
    ipcMain.on('open-settings', () => {
        settingsWindow.show();
        if (process.env.NODE_ENV === 'development') {
            settingsWindow.openDevTools();
        }
    });

    ipcMain.on('close-settings', () => {
        settingsWindow.hide();
    });

    ipcMain.on('close-main', () => {
        mainWindow.close();
        app.quit();
    });

    ipcMain.on('lang-changed', () => {
        mainWindow.webContents.send('change-language')
    })

    mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
        // Set the save path, making Electron not to prompt a save dialog.
        // item.setSavePath('/tmp/save.pdf')

        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                console.log('Download is interrupted but can be resumed')
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    console.log('Download is paused')
                } else {
                    console.log(`Received bytes: ${item.getReceivedBytes()}`)
                }
            }
        })

        item.once('done', (event, state) => {
            if (state === 'completed') {
                console.log('Download successfully')
            } else {
                console.log(`Download failed: ${state}`)
            }
        })

    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.openDevTools();
        mainWindow.webContents.on('context-menu', (e, props) => {
            const { x, y } = props;

            Menu.buildFromTemplate([{
                label: 'Inspect element',
                click() {
                    mainWindow.inspectElement(x, y);
                }
            }]).popup(mainWindow);
        });
    }

    if (process.platform === 'darwin') {
        template = [{
            label: 'Caption',
            submenu: [{
                label: 'About Caption',
                selector: 'orderFrontStandardAboutPanel:'
            }, {
                label: 'Check for Updates...',
                click() {
                    autoUpdater.checkForUpdates();
                }
            }, {
                type: 'separator'
            }, {
                label: 'Services',
                submenu: []
            }, {
                type: 'separator'
            }, {
                label: 'Hide Caption',
                accelerator: 'Command+H',
                selector: 'hide:'
            }, {
                label: 'Hide Others',
                accelerator: 'Command+Shift+H',
                selector: 'hideOtherApplications:'
            }, {
                label: 'Show All',
                selector: 'unhideAllApplications:'
            }, {
                type: 'separator'
            }, {
                label: 'Quit',
                accelerator: 'Command+Q',
                click() {
                    app.quit();
                }
            }]
        }, {
            label: 'Edit',
            submenu: [{
                label: 'Undo',
                accelerator: 'Command+Z',
                selector: 'undo:'
            }, {
                label: 'Redo',
                accelerator: 'Shift+Command+Z',
                selector: 'redo:'
            }, {
                type: 'separator'
            }, {
                label: 'Cut',
                accelerator: 'Command+X',
                selector: 'cut:'
            }, {
                label: 'Copy',
                accelerator: 'Command+C',
                selector: 'copy:'
            }, {
                label: 'Paste',
                accelerator: 'Command+V',
                selector: 'paste:'
            }, {
                label: 'Select All',
                accelerator: 'Command+A',
                selector: 'selectAll:'
            }]
        }, {
            label: 'View',
            submenu: (process.env.NODE_ENV === 'development') ? [{
                label: 'Reload',
                accelerator: 'Command+R',
                click() {
                    mainWindow.webContents.reload();
                }
            }, {
                label: 'Toggle Full Screen',
                accelerator: 'Ctrl+Command+F',
                click() {
                    mainWindow.setFullScreen(!mainWindow.isFullScreen());
                }
            }, {
                label: 'Toggle Developer Tools',
                accelerator: 'Alt+Command+I',
                click() {
                    mainWindow.toggleDevTools();
                }
            }] : [{
                label: 'Toggle Full Screen',
                accelerator: 'Ctrl+Command+F',
                click() {
                    mainWindow.setFullScreen(!mainWindow.isFullScreen());
                }
            }]
        }, {
            label: 'Window',
            submenu: [{
                label: 'Minimize',
                accelerator: 'Command+M',
                selector: 'performMiniaturize:'
            }, {
                label: 'Close',
                accelerator: 'Command+W',
                selector: 'performClose:'
            }, {
                type: 'separator'
            }, {
                label: 'Bring All to Front',
                selector: 'arrangeInFront:'
            },{
                label: 'Toggle Developer Tools',
                accelerator: 'Alt+Command+I',
                click() {
                    mainWindow.toggleDevTools();
                }
            }]
        }, {
            label: 'Help',
            submenu: [{
                label: 'Learn More',
                click() {
                    shell.openExternal('http://electron.atom.io');
                }
            }, {
                label: 'Documentation',
                click() {
                    shell.openExternal('https://github.com/atom/electron/tree/master/docs#readme');
                }
            }, {
                label: 'Community Discussions',
                click() {
                    shell.openExternal('https://discuss.atom.io/c/electron');
                }
            }, {
                label: 'Search Issues',
                click() {
                    shell.openExternal('https://github.com/atom/electron/issues');
                }
            }]
        }];

        menu = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menu);
    } else {
        template = [{
            label: '&File',
            submenu: [{
                label: '&Open',
                accelerator: 'Ctrl+O'
            }, {
                label: '&Close',
                accelerator: 'Ctrl+W',
                click() {
                    mainWindow.close();
                }
            }]
        }, {
            label: '&View',
            submenu: (process.env.NODE_ENV === 'development') ? [{
                label: '&Reload',
                accelerator: 'Ctrl+R',
                click() {
                    mainWindow.webContents.reload();
                }
            }, {
                label: 'Toggle &Full Screen',
                accelerator: 'F11',
                click() {
                    mainWindow.setFullScreen(!mainWindow.isFullScreen());
                }
            }, {
                label: 'Toggle &Developer Tools',
                accelerator: 'Alt+Ctrl+I',
                click() {
                    mainWindow.toggleDevTools();
                }
            }] : [{
                label: 'Toggle &Full Screen',
                accelerator: 'F11',
                click() {
                    mainWindow.setFullScreen(!mainWindow.isFullScreen());
                }
            }]
        }, {
            label: 'Help',
            submenu: [{
                label: 'Learn More',
                click() {
                    shell.openExternal('http://electron.atom.io');
                }
            }, {
                label: 'Documentation',
                click() {
                    shell.openExternal('https://github.com/atom/electron/tree/master/docs#readme');
                }
            }, {
                label: 'Community Discussions',
                click() {
                    shell.openExternal('https://discuss.atom.io/c/electron');
                }
            }, {
                label: 'Search Issues',
                click() {
                    shell.openExternal('https://github.com/atom/electron/issues');
                }
            }]
        }];
        menu = Menu.buildFromTemplate(template);
        mainWindow.setMenu(menu);
    }
});
