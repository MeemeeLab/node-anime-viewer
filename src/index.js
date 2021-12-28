#!/usr/bin/env node
import anime, {AnimeTitle} from './modules/anime.js';
import processUtil from './modules/process.js';
import Terminal from 'terminal-kit';
import {
    DefaultInterface,
    HistoryInterface,
    SearchAnimeInterface,
    SelectAnimeInterface,
    SelectEpisodeInterface,
    SelectResolutionInterface,
    PlayingInterface,
    VLCExitInterface
} from './modules/interface.js';
import history from './modules/history.js';

function playVideo(url, episodeCallbacks) {
    function onExit() {
        new VLCExitInterface(Terminal.terminal, {
            playNextEpisode: () => {
                episodeCallbacks.next();
            },
            repeatEpisode: () => {
                episodeCallbacks.repeat();
            },
            playPreviousEpisode: () => {
                episodeCallbacks.previous();
            },
            exit: () => {
                history.dispose();
                Terminal.terminal.clear();
                process.exit();
            }
        });
    }
    processUtil.openVLC(url)
        .then(onExit)
        .catch(() => {
            // VLC is not installed
            processUtil.openDefaultApplication(url)
                .then(onExit)
                .catch(() => {
                    Terminal.terminal.clear();
                    Terminal.terminal.error('VLC is not installed, please install it first.');
                    process.exit(1);
                });
        });
}

async function showPlayUI(selectedTitle, availableEpisodes, selectedEpisode, episodeCallbacks) { 
    // TODO: Show go back button on the VLCExitInterface and not quit
    history.add(selectedEpisode);
    const availableVideos = (await selectedEpisode.getAvailableVideos()).filterByVideoType('mp4');
    new SelectResolutionInterface(Terminal.terminal, {
        selectResolution: (resolution) => {
            new PlayingInterface(Terminal.terminal, {
                getCurrentTitle: () => {
                    return selectedTitle;
                },
                getCurrentEpisode: () => {
                    return selectedEpisode;
                },
                getEpisodes: () => {
                    return availableEpisodes;
                }
            });
            const selectedVideo = availableVideos.getVideos().find(v => v.resolution == resolution);
            playVideo(selectedVideo.file, episodeCallbacks);
        },
        selectHighest: () => {
            new PlayingInterface(Terminal.terminal, {
                getCurrentTitle: () => {
                    return selectedTitle;
                },
                getCurrentEpisode: () => {
                    return selectedEpisode;
                },
                getEpisodes: () => {
                    return availableEpisodes;
                }
            });
            const selectedVideo = availableVideos.byHighResolution();
            playVideo(selectedVideo.file, episodeCallbacks);
        },
        selectLowest: () => {
            new PlayingInterface(Terminal.terminal, {
                getCurrentTitle: () => {
                    return selectedTitle;
                },
                getCurrentEpisode: () => {
                    return selectedEpisode;
                },
                getEpisodes: () => {
                    return availableEpisodes;
                }
            });
            const selectedVideo = availableVideos.byLowResolution();
            playVideo(selectedVideo.file, episodeCallbacks, index);
        },
        getAvailableResolutions: () => {
            return availableVideos.getVideosHasResolution().map(video => video.resolution).sort((a, b) => b - a);
        }
    });
}

const episodesCache = {};

async function showTitleUI(selectedTitle, defaultInterface, episodeOverride) {
    const availableEpisodes = episodesCache[selectedTitle.id] ?? await selectedTitle.getEpisodes();
    episodesCache[selectedTitle.id] = availableEpisodes;
    if (episodeOverride) {
        const selectedEpisode = availableEpisodes.find(e => e.episode == episodeOverride);
        showPlayUI(selectedTitle, availableEpisodes, selectedEpisode, {
            next: () => {
                showTitleUI(selectedTitle, defaultInterface, episodeOverride + 1);
            },
            previous: () => {
                showTitleUI(selectedTitle, defaultInterface, episodeOverride - 1);
            },
            repeat: () => {
                showTitleUI(selectedTitle, defaultInterface, episodeOverride);
            }
        });
        return;
    }
    const selectEpisodeInterface = new SelectEpisodeInterface(Terminal.terminal, {
        selectEpisode: async (index) => {
            const selectedEpisode = availableEpisodes[index];
            history.add(selectedEpisode);
            showPlayUI(selectedTitle, availableEpisodes, selectedEpisode, {
                next: () => {
                    if (selectedEpisode.episode >= availableEpisodes.length) {
                        Terminal.terminal.white('\n\n').red('Episode ' + selectedEpisode.episode + 1 + ' is not available.\n');
                        Terminal.terminal.white('Press any key to continue...');
                        Terminal.terminal.once('key', () => {
                            selectEpisodeInterface.reInitialize();
                        });
                        return;
                    }
                    showTitleUI(selectedTitle, defaultInterface, selectedEpisode.episode + 1);
                },
                previous: () => {
                    if (selectedEpisode.episode <= 1) {
                        Terminal.terminal.white('\n\n').red('Episode ' + selectedEpisode.episode - 1 + ' is not available.\n');
                        Terminal.terminal.white('Press any key to continue...');
                        Terminal.terminal.once('key', () => {
                            selectEpisodeInterface.reInitialize();
                        });
                        return;
                    }
                    showTitleUI(selectedTitle, defaultInterface, selectedEpisode.episode - 1);
                },
                repeat: () => {
                    showTitleUI(selectedTitle, defaultInterface, selectedEpisode.episode);
                }
            });
        },
        back: () => {
            defaultInterface.reInitialize();
        },
        getAvailableEpisodes: () => {
            return availableEpisodes.map(episode => episode.episode);
        }
    });
}

Terminal.terminal.on('key', (key) => {
    if (key === 'CTRL_C') {
        Terminal.terminal.clear();
        Terminal.terminal.red('Exiting with exit code 1...\n');
        process.exit(1);
    }
});

const defaultInterface = new DefaultInterface(Terminal.terminal, {
    searchAnime: () => {
        new SearchAnimeInterface(Terminal.terminal, {
            searchAnime: async (query) => {
                const titles = await anime.searchTitle(query);
                new SelectAnimeInterface(Terminal.terminal, {
                    selectAnime: async (index) => {
                        const selectedTitle = titles[index];
                        showTitleUI(selectedTitle, defaultInterface);
                    },
                    back: () => {
                        defaultInterface.reInitialize();
                    },
                    getAnimeNames: () => {
                        return titles.map(title => title.title);
                    }
                });
            },
            back: () => {
                defaultInterface.reInitialize();
            }
        });
    },
    viewHistory: () => {
        new HistoryInterface(Terminal.terminal, {
            playAnime: (data) => {
                showTitleUI(AnimeTitle.byId(data.id), defaultInterface, data.episode);
            },
            back: () => {
                defaultInterface.reInitialize();
            },
            getAnimes: () => {
                return history.getAll();
            }
        });
    }
});

function cleanUp() {
    history.dispose();
}

process.on('exit', cleanUp.bind(null));
