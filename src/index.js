#!/usr/bin/env node
import anime, {AnimeTitle} from './modules/anime.js';
import processUtil from './modules/process.js';
import Terminal from 'terminal-kit';
import {
    DefaultInterface,
    HistoryInterface,
    EditConfigInterface,
    SearchAnimeInterface,
    SelectAnimeInterface,
    SelectEpisodeInterface,
    SelectResolutionInterface,
    PlayingInterface,
    VLCExitInterface
} from './modules/interface.js';
import history from './modules/history.js';
import config from './modules/config.js';

Terminal.terminal.on('key', (key) => {
    if (key === 'CTRL_C') {
        Terminal.terminal.clear();
        Terminal.terminal.red('Exiting with exit code 1...\n');
        process.exit(1);
    }
});

// Set default value for config if not exists
if (!config.get('initialized')) {
    config.set('initialized', true);

    // processUtil.launcher
    if (processUtil.getStartCommandLineForCurrentOS('vlc') !== undefined) {
        config.set('processUtil.launcher', 'vlc');
    } else {
        // android
        config.set('processUtil.launcher', null);
    }
}

function showSearchAnimeInterface(interfaces) {
    const searchAnimeInterface = new SearchAnimeInterface(Terminal.terminal, {
        searchAnime: async (query) => {
            const titles = await anime.searchTitle(query);
            showSelectAnimeInterface({...interfaces, searchAnimeInterface}, {titles});
        },
        back: () => {
            interfaces.defaultInterface.reInitialize();
        }
    });
    searchAnimeInterface.initialize();
}

function showSelectAnimeInterface(interfaces, options) {
    const selectAnimeInterface = new SelectAnimeInterface(Terminal.terminal, {
        selectAnime: async (index) => {
            const selectedTitle = options.titles[index];
            showSelectEpisodeInterface({...interfaces, selectAnimeInterface}, {...options, selectedTitle});
        },
        back: () => {
            interfaces.searchAnimeInterface.reInitialize();
        },
        getAnimeNames: () => {
            return options.titles.map(title => title.title);
        }
    });
    selectAnimeInterface.initialize();
}

function showSelectEpisodeInterface(interfaces, options) {
    (async () => {
        const availableEpisodes = await options.selectedTitle.getEpisodes();
        const selectEpisodeInterface = new SelectEpisodeInterface(Terminal.terminal, {
            selectEpisode: async (index) => {
                const selectedEpisode = availableEpisodes[index];
                showSelectResolutionInterface({...interfaces, selectEpisodeInterface}, {...options, selectedEpisode, availableEpisodes});
            },
            back: () => {
                interfaces.selectAnimeInterface.reInitialize();
            },
            getAvailableEpisodes: () => {
                return availableEpisodes.map(episode => episode.episode);
            }
        });
        selectEpisodeInterface.initialize();
    })();
}

function showSelectResolutionInterface(interfaces, options) {
    (async () => {
        const availableVideos = (await options.selectedEpisode.getAvailableVideos()).filterByVideoType('mp4');
        const selectResolutionInterface = new SelectResolutionInterface(Terminal.terminal, {
            selectResolution: (resolution) => {
                const selectedVideo = availableVideos.getVideos().find(v => v.resolution == resolution);
                playVideo({...interfaces, selectResolutionInterface}, {...options, fileURL: selectedVideo.file});
            },
            selectHighest: () => {
                const selectedVideo = availableVideos.byHighResolution();
                playVideo({...interfaces, selectResolutionInterface}, {...options, fileURL: selectedVideo.file});
            },
            selectLowest: () => {
                const selectedVideo = availableVideos.byLowResolution();
                playVideo({...interfaces, selectResolutionInterface}, {...options, fileURL: selectedVideo.file});
            },
            getAvailableResolutions: () => {
                return availableVideos.getVideosHasResolution().map(video => video.resolution).sort((a, b) => b - a);
            }
        });
        selectResolutionInterface.initialize();
    })();
}

function playVideo(interfaces, options) {
    history.add(options.selectedEpisode);

    const playingInterface = new PlayingInterface(Terminal.terminal, {
        getCurrentTitle: () => {
            return options.selectedTitle;
        },
        getCurrentEpisode: () => {
            return options.selectedEpisode;
        },
        getEpisodes: () => {
            return options.availableEpisodes;
        }
    });
    playingInterface.initialize();

    function onExit() {
        showVLCExitInterface({...interfaces, playingInterface}, options);
    }

    processUtil.openURL(config.get('processUtil.launcher'), options.fileURL)
        .then(onExit)
        .catch(() => {
            // VLC is not installed
            processUtil.openDefaultApplication(options.fileURL)
                .then(onExit)
                .catch(() => {
                    Terminal.terminal.clear();
                    Terminal.terminal.error('VLC is not installed, please install it first.');
                    process.exit(1);
                });
        });
}

function showVLCExitInterface(interfaces, options) {        
    const vlcExitInterface = new VLCExitInterface(Terminal.terminal, {
        playNextEpisode: () => {
            if (options.selectedEpisode.episode >= options.availableEpisodes.length) {
                Terminal.terminal.white('\n\n').red('Episode ' + options.selectedEpisode.episode + 1 + ' is not available.\n');
                Terminal.terminal.white('Press any key to continue...');
                Terminal.terminal.once('key', () => {
                    interfaces.selectEpisodeInterface.reInitialize();
                });
                return;
            }
            options.selectedEpisode = options.availableEpisodes.find(episode => episode.episode == options.selectedEpisode.episode + 1);
            showSelectResolutionInterface(interfaces, options);
        },
        repeatEpisode: () => {
            showSelectResolutionInterface(interfaces, options);
        },
        playPreviousEpisode: () => {
            if (options.selectedEpisode.episode <= 1) {
                Terminal.terminal.white('\n\n').red('Episode ' + options.selectedEpisode.episode - 1 + ' is not available.\n');
                Terminal.terminal.white('Press any key to continue...');
                Terminal.terminal.once('key', () => {
                    interfaces.selectEpisodeInterface.reInitialize();
                });
                return;
            }
            options.selectedEpisode = options.availableEpisodes.find(episode => episode.episode == options.selectedEpisode.episode - 1);
            showSelectResolutionInterface(interfaces, options);
        },
        back: () => {
            interfaces.selectEpisodeInterface.reInitialize();
        },
        exit: () => {
            history.dispose();
            Terminal.terminal.clear();
            process.exit();
        }
    });
    vlcExitInterface.initialize();
}

function showHistoryInterface(interfaces) {
    const historyInterface = new HistoryInterface(Terminal.terminal, {
        playAnime: async (data) => {
            const title = AnimeTitle.byId(data.id);
            title.title = data.title;
            const availableEpisodes = await title.getEpisodes(); 
            const interfaces = {
                historyInterface,
                searchAnimeInterface: historyInterface,
                selectAnimeInterface: historyInterface,
                selectEpisodeInterface: historyInterface, // Map all of them to history interface because we don't need to show them
            }
            const options = {
                titles: [title],
                selectedTitle: title,
                availableEpisodes,
                selectedEpisode: availableEpisodes.find(episode => episode.episode == data.episode),
            }
            showSelectResolutionInterface(interfaces, options);
        },
        back: () => {
            interfaces.defaultInterface.reInitialize();
        },
        getAnimes: () => {
            return history.getAll();
        }
    });
    historyInterface.initialize();
}

function showEditConfigInterface(interfaces) {
    const editConfigInterface = new EditConfigInterface(Terminal.terminal, {
        setConfig: (key, data) => {
            config.set(key, data);
        },
        getConfig: (key) => {
            return config.get(key);
        },
        back: () => {
            Terminal.terminal.clear();
            interfaces.defaultInterface.reInitialize();
        }
    });
    editConfigInterface.initialize();
}

const defaultInterface = new DefaultInterface(Terminal.terminal, {
    searchAnime: () => {
        showSearchAnimeInterface({defaultInterface});
    },
    viewHistory: () => {
        showHistoryInterface({defaultInterface});
    },
    editConfig: () => {
        showEditConfigInterface({defaultInterface});
    }
});
defaultInterface.initialize();

function cleanUp() {
    history.dispose();
    config.dispose();
}

process.on('exit', cleanUp.bind(null));
