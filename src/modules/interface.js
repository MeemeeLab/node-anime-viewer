import Terminal from "terminal-kit";

import { packageConfig } from '../config.js';
import { getGist, getPackageVersionNpm } from "./package.js";

const msg = await getPackageVersionNpm('node-anime-viewer') > parseInt(packageConfig.version.replaceAll('.', '')) ? 'New version is available for download. Please update using `npm i -g node-anime-viewer` for better experience and bug fixes.\n' : '' +
    await getGist('dff5ecbd6f74857fd1d987399123a35c');

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
        this.term.white('\n');
        this.term.yellow(msg);
        this.term.white('\n');
    }
    initialize() {}
    reInitialize() {
        this.term.clear();
        this.term.white(packageConfig.name + ' ').green(packageConfig.version + '\n');
        this.term.white('Copyright (C) 2021 ').blue(packageConfig.author).white(' and ').yellow('Contributors\n');
        this.term.white('\n\n');
        this.initialize();
    }
}

export class DefaultInterface extends Interface {
    initialize() {
        this.term.white('What do you want to do next?\n');
        this.term.singleColumnMenu(['Search anime and play', 'Select anime from history', 'Edit configuration'], (err, input) => {
            if (err) throw err;
            switch (input.selectedIndex) {
                case 0:
                    this.cb.searchAnime.call(this);
                    break;
                case 1:
                    this.cb.viewHistory.call(this);
                    break;
                case 2:
                    this.cb.editConfig.call(this);
                    break;
            }
        });
    }
}

export class HistoryInterface extends Interface {
    initialize() {
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

export class EditConfigInterface extends Interface {
    initialize() {
        this.term.white('What do you want to edit?\n');
        this.term.singleColumnMenu(['Player launcher', 'Back'], (err, input) => {
            if (err) throw err;
            switch (input.selectedIndex) {
                case 0:
                    if (this.cb.getConfig.call(this, 'processUtil.launcher') === null) {
                        this.term.deleteLine();
                        this.term.red('Not supported\n');
                        this.term.white('Press any key to continue...');
                        this.term.once('key', () => {
                            this.reInitialize();
                        });
                        return;
                    }
                    new EditConfigEntryInterface(this.term, {
                        getKName: () => 'processUtil.launcher',
                        getValue: () => this.cb.getConfig.call(this, 'processUtil.launcher'),
                        setValue: (value) => {
                            this.cb.setConfig.call(this, 'processUtil.launcher', value)
                            this.reInitialize();
                        },
                        validate: () => true
                    }).initialize();
                    break;
                case 1:
                    this.cb.back.call(this);
                    break;
            }
        });
    }
}

export class EditConfigEntryInterface extends Interface {
    initialize() {
        this.term.white('Editing: ' + this.cb.getKName.call(this) + '\n\n');
        this.term.white('Enter new value: ').inputField({
            default: this.cb.getValue.call(this)
        }, (err, input) => {
            if (err) throw err;
            this.term.deleteLine();
            if (!this.cb.validate(input)) {
                this.term.red('Invalid value\n');
                this.term.white('Press any key to continue...');
                this.term.once('key', () => {
                    this.reInitialize();
                });
                return;
            }
            this.cb.setValue.call(this, input);
        });
    }
}

export class SearchAnimeInterface extends Interface {
    initialize() {
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
    initialize() {
        if (this.cb.getAnimeNames.call(this).length === 0) {
            this.term.red('No anime found\n');
            this.term.white('Press any key to continue...\n');
            this.term.once('key', () => {
                this.cb.back.call(this);
            });
            return;
        }
        this.term.white('Select anime: \n');
        this.term.singleColumnMenu(this.cb.getAnimeNames.call(this), (err, input) => {
            if (err) throw err;
            this.cb.selectAnime.call(this, input.selectedIndex);
        })
    }
}

export class SelectEpisodeInterface extends Interface {
    initialize() {
        this.term.white('Select episode: \n');
        this.term.gridMenu(['Type episode number'].concat(this.cb.getAvailableEpisodes.call(this).concat(['Cancel'])), (err, input) => {
            if (err) throw err;
            if (input.selectedIndex === this.cb.getAvailableEpisodes.call(this).length+1) {
                this.cb.back.call(this);
                return;
            } else if (input.selectedIndex === 0) {
                this.term.white('\nType episode number: ');
                this.term.inputField((err, strInput) => {
                    if (err) throw err;
                    this.term.deleteLine();
                    const input = parseInt(strInput);
                    if (isNaN(input)) {
                        this.term.red('Invalid input\n');
                        this.term.white('Press any key to continue...\n');
                        this.term.once('key', () => {
                            this.reInitialize();
                        });
                        return;
                    } else if (input < 1 || input > this.cb.getAvailableEpisodes.call(this).length) {
                        this.term.red('Out of range\n');
                        this.term.white('Press any key to continue...\n');
                        this.term.once('key', () => {
                            this.reInitialize();
                        });
                        return;
                    }
                    this.cb.selectEpisode.call(this, input - 1);
                });
                return;
            }
            this.cb.selectEpisode.call(this, input.selectedIndex-1);
        })
    }
}

export class SelectResolutionInterface extends Interface {
    initialize() {
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
    initialize() {
        this.term.singleColumnMenu(['Play next episode', 'Repeat episode', 'Play previous episode', 'Go back', 'Exit'], (err, input) => {
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
                    this.cb.back.call(this);
                    break;
                case 4:
                    this.cb.exit.call(this);
                    break;
            }
        });
    }
}

export class PlayingInterface extends Interface {
    initialize() {
        this.term
            .white(process.platform === 'android' ? 'Trying to play: ' : 'Currently playing: ')
            .blue(this.cb.getCurrentTitle.call(this).title)
            .white(' ')
            .green(
                this.cb.getCurrentEpisode.call(this).episode + 
                '/' + 
                this.cb.getEpisodes.call(this).length)
            .white('\n');
    }
}
