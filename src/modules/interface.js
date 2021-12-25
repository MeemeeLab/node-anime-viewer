import Terminal from "terminal-kit";
import {readFileSync} from "fs";

const config = JSON.parse(readFileSync("package.json"));

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
        this.term.white(config.name + ' ').green(config.version + '\n');
        this.term.white('Copyright (C) 2021 ').blue(config.author);
        this.term.white('\n\n');
        this.Init();
    }
    Init() {}
}

export class SearchAnimeInterface extends Interface {
    Init() {
        this.term.white('Search anime: ');
        this.term.inputField({}, (err, input) => {
            if (err) throw err;
            this.cb.searchAnime(input);
        })
    }
}

export class SelectAnimeInterface extends Interface {
    Init() {
        this.term.white('Select anime: \n');
        this.term.singleColumnMenu(this.cb.getAnimeNames(), (err, input) => {
            if (err) throw err;
            this.cb.selectAnime(input.selectedIndex);
        })
    }
}

export class SelectEpisodeInterface extends Interface {
    Init() {
        this.term.white('Select episode: \n');
        this.term.gridMenu(this.cb.getAvailableEpisodes(), (err, input) => {
            if (err) throw err;
            this.cb.selectEpisode(input.selectedIndex);
        })
    }
}

export class SelectResolutionInterface extends Interface {
    Init() {
        const resolutions = this.cb.getAvailableResolutions();
        if (resolutions.length === 1) {
            this.cb.selectResolution(resolutions[0]);
            return;
        }
        this.term.white('Select resolution: \n');
        this.term.singleColumnMenu(['Highest available', ...resolutions, 'Lowest available'], (err, input) => {
            if (err) throw err;
            if (input.selectedIndex === 0) {
                this.cb.selectHighest();
            } else if (input.selectedIndex === resolutions.length + 1) {
                this.cb.selectLowest();
            } else {
                this.cb.selectResolution(resolutions[input.selectedIndex - 1]);
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
                    this.cb.playNextEpisode();
                    break;
                case 1:
                    this.cb.repeatEpisode();
                    break;
                case 2:
                    this.cb.playPreviousEpisode();
                    break;
                case 3:
                    this.cb.exit();
                    break;
            }
        });
    }
}

export class PlayingInterface extends Interface {
    Init() {
        this.term.white('Currently playing: ').blue(this.cb.getCurrentTitle().title).white(' ').green(this.cb.getCurrentEpisode().episode + '/' + this.cb.getEpisodes().length).white('\n');
    }
}
