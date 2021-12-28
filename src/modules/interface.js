import Terminal from "terminal-kit";

import { packageConfig } from '../config.js';

export default class Interface {
    term;
    cb;
    /**
     * @param {Terminal.Terminal} term 
     * @param {Object} cb
     */
    constructor(term, cb) {
        this.term = term;
        this.cb = cb;
        this.term.clear();
        this.term.white(packageConfig.name + ' ').green(packageConfig.version + '\n');
        this.term.white('Copyright (C) 2021 ').blue(packageConfig.author).white(' and ').yellow('Contributors\n');
        this.term.white('\n\n');
        this.Init();
    }
    Init() {}
    reInitialize() {
        this.term.clear();
        this.term.white(packageConfig.name + ' ').green(packageConfig.version + '\n');
        this.term.white('Copyright (C) 2021 ').blue(packageConfig.author).white(' and ').yellow('Contributors\n');
        this.term.white('\n\n');
        this.Init();
    }
}

export class DefaultInterface extends Interface {
    Init() {
        this.term.white('What do you want to do next?\n');
        this.term.singleColumnMenu(['Search anime and play', 'Select anime from history'], (err, input) => {
            if (err) throw err;
            switch (input.selectedIndex) {
                case 0:
                    this.cb.searchAnime.call(this);
                    break;
                case 1:
                    this.cb.viewHistory.call(this);
                    break;
            }
        });
    }
}

export class HistoryInterface extends Interface {
    Init() {
        if (this.cb.getAnimes.call(this).length === 0) {
            this.term.red('No anime in history\n');
            this.term.white('Press any key to continue...\n');
            this.term.once('key', () => {
                this.cb.back.call(this);
            });
            return;
        }
        this.term.white('Select an anime from history (Press ESC to go back)\n');
        this.term.singleColumnMenu(this.cb.getAnimes.call(this).map(title => `${title.title} (Episode ${title.episode})`), {cancelable: true}, (err, input) => {
            if (err) throw err;
            if (input.canceled) {
                this.cb.back.call(this);
                return; 
            }
            this.cb.playAnime(this.cb.getAnimes.call(this)[input.selectedIndex]);
        });
    }
}

export class SearchAnimeInterface extends Interface {
    Init() {
        this.term.white('Search anime: ');
        this.term.inputField({cancelable: true}, (err, input) => {
            if (err) throw err;
            if (input === undefined) {
                this.cb.back.call(this);
            }
            this.cb.searchAnime.call(this, input);
        })
    }
}

export class SelectAnimeInterface extends Interface {
    Init() {
        this.term.white('Select anime: \n');
        this.term.singleColumnMenu(this.cb.getAnimeNames.call(this), (err, input) => {
            if (err) throw err;
            this.cb.selectAnime.call(this, input.selectedIndex);
        })
    }
}

export class SelectEpisodeInterface extends Interface {
    Init() {
        this.term.white('Select episode: \n');
        this.term.gridMenu(this.cb.getAvailableEpisodes.call(this), (err, input) => {
            if (err) throw err;
            this.cb.selectEpisode.call(this, input.selectedIndex);
        })
    }
}

export class SelectResolutionInterface extends Interface {
    Init() {
        const resolutions = this.cb.getAvailableResolutions.call(this);
        if (resolutions.length === 1) {
            this.cb.selectResolution.call(this, resolutions[0]);
            return;
        }
        this.term.white('Select resolution: \n');
        this.term.singleColumnMenu(['Highest available', ...resolutions, 'Lowest available'], (err, input) => {
            if (err) throw err;
            if (input.selectedIndex === 0) {
                this.cb.selectHighest.call(this);
            } else if (input.selectedIndex === resolutions.length + 1) {
                this.cb.selectLowest.call(this);
            } else {
                this.cb.selectResolution.call(this, resolutions[input.selectedIndex - 1]);
            }
        });
    }
}

export class VLCExitInterface extends Interface {
    Init() {
        this.term.singleColumnMenu(['Play next episode', 'Repeat episode', 'Play previous episode', 'Exit'], (err, input) => {
            if (err) throw err;
            switch (input.selectedIndex) {
                case 0:
                    this.cb.playNextEpisode.call(this);
                    break;
                case 1:
                    this.cb.repeatEpisode.call(this);
                    break;
                case 2:
                    this.cb.playPreviousEpisode.call(this);
                    break;
                case 3:
                    this.cb.exit.call(this);
                    break;
            }
        });
    }
}

export class PlayingInterface extends Interface {
    Init() {
        this.term.white(process.platform === 'android' ? 'Trying to play: ' : 'Currently playing: ').blue(this.cb.getCurrentTitle.call(this).title).white(' ').green(this.cb.getCurrentEpisode.call(this).episode + '/' + this.cb.getEpisodes.call(this).length).white('\n');
    }
}
