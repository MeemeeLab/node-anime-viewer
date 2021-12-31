import child_process from 'child_process';

const debugging = {
    forceRejectVLCInstalled: false
}

export function getStartCommandLineForCurrentOS(filePath) {
    switch (process.platform) {
        case 'darwin':
            return 'open '+filePath+' && lsof -p $! +r 1 &>/dev/null';
        case 'win32':
        case 'win64':
            return 'start /wait "" "'+filePath+'"';
        case 'android':
            return undefined;
        default:
            return 'xdg-open '+filePath+' && tail --pid=$! -f /dev/null';
    }
}

export function openURL(commandLine, url) {
    return new Promise(async(resolve, reject) => {
        if (
            process.platform === 'android' || 
            commandLine === null || 
            debugging.forceRejectVLCInstalled
        ) {
            reject();
            return;
        }
        child_process.spawn(commandLine, [url], { stdio: 'inherit' }).once('close', () => resolve()).once('error', () => reject());
    });
}

export function openDefaultApplication(url) {
    if (!url.startsWith('http')) {
        throw new Error('Malicious code detected, Please report this issue on github.');
    }
    return new Promise((resolve) => {
        if (process.platform === 'android') {
            child_process.spawnSync('/data/data/com.termux/files/usr/bin/am',
                ['start', '-W', '-S', '-n', 'org.videolan.vlc/org.videolan.vlc.gui.video.VideoPlayerActivity','-a', 'android.intent.action.VIEW', '-d', url],
                {stdio:'inherit'}
            )
            resolve();
            return;
        }
        child_process.exec(getStartCommandLineForCurrentOS(url)).on('close', () => resolve());
    });
}

export default {
    openURL,
    openDefaultApplication,
    getStartCommandLineForCurrentOS
}
