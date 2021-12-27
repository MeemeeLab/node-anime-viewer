import child_process from 'child_process';

const debugging = {
    forceRejectVLCInstalled: false
}

function getStartCommandLineForCurrentOS(filePath) {
    switch (process.platform) {
        case 'darwin':
            return 'open '+filePath+' && lsof -p $! +r 1 &>/dev/null';
        case 'win32': 
        case 'win64':
            return 'start /wait "" "'+filePath+'"';
        default:
            return 'xdg-open '+filePath+' && tail --pid=$! -f /dev/null';
    }
}

let vlcInstalled = null;

function checkVLCInstalled() {
    return new Promise((resolve) => {
        if (vlcInstalled !== null) {
            vlcInstalled ? resolve(true) : resolve(false);
            return;
        }
        if (debugging.forceRejectVLCInstalled) {
            resolve(false);
            return;
        }
        child_process.exec('vlc vlc://quit', (err) => {
            if (err) {
                vlcInstalled = false;
                resolve(false);
            } else {
                vlcInstalled = true;
                resolve(true);
            }
        });
    });
}

export function openVLC(url) {
    return new Promise(async(resolve, reject) => {
        if (!await checkVLCInstalled()) {
            reject();
            return;
        }
        child_process.spawn('vlc', [url]).on('close', () => resolve());
    });
}

export function openDefaultApplication(url) {
    if (!url.startsWith('http')) {
        throw new Error('Malicious code detected, Please report this issue on github.');
    }
    return new Promise((resolve) => {
        child_process.exec(getStartCommandLineForCurrentOS(url)).on('close', () => resolve());
    });
}

export default {
    openVLC,
    openDefaultApplication
}
