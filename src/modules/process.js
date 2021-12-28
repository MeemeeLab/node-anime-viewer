import child_process from 'child_process';
import Terminal from 'terminal-kit'

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
        case 'android':
            throw new Error('You must install VLC on android');
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
        if (process.platform !== 'android') {
            if (!await checkVLCInstalled()) {
                reject();
                return;
            }
            child_process.spawn('vlc', [url]).once('close', () => resolve());
        } else {
        // there is no way to 'check' VLC on android other than outright launching it
            try {
                child_process.spawnSync('/data/data/com.termux/files/usr/bin/am',
                    ['start', '-W', '-S', '-n', 'org.videolan.vlc/org.videolan.vlc.gui.video.VideoPlayerActivity','-a', 'android.intent.action.VIEW', '-d', url],{stdio:'inherit'}
                    )
            } catch (error) { reject(); return }
                resolve() // we don't know when it is done
            }
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
