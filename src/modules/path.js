import { execSync } from 'child_process';
import { statSync } from 'fs';

export function getDownloadFolderForCurrentOS() {
    switch (process.platform) {
        case "darwin":
            return `${process.env.HOME}/Downloads`;
        case "win32":
        case "win64":
            return `${process.env.USERPROFILE}\\Downloads`;
        default:
            let dir;
            try {
              dir = execSync('xdg-user-dir DOWNLOAD', { encoding: 'utf8' }).trim();
            } catch (_) {}
            if (dir && dir !== process.env.HOME) return dir;
          
            let stat;
            const homeDownloads = `${process.env.HOME}/Downloads`;
            try {
              stat = statSync(homeDownloads);
            } catch (_) {}
            if (stat) return homeDownloads;
          
            return '/tmp/';
    }
}

export default {
    getDownloadFolderForCurrentOS
}
