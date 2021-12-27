#!/usr/bin/env node
import anime from './modules/anime.js';
import processUtil from './modules/process.js';
import Terminal from 'terminal-kit';
import {
    SearchAnimeInterface,
    SelectAnimeInterface,
    SelectEpisodeInterface,
    SelectResolutionInterface,
    PlayingInterface,
    VLCExitInterface
} from './modules/interface.js';

function playVideo(url, selectEpisodeInterface, index) {
    function onExit() {
        new VLCExitInterface(Terminal.terminal, {
            playNextEpisode: () => {
                selectEpisodeInterface.cb.selectEpisode(index + 1);
            },
            repeatEpisode: () => {
                selectEpisodeInterface.cb.selectEpisode(index);
            },
            playPreviousEpisode: () => {
                selectEpisodeInterface.cb.selectEpisode(index - 1);
            },
            exit: () => {
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

Terminal.terminal.on('key', (key) => {
    if (key === 'CTRL_C') {
        Terminal.terminal.clear();
        Terminal.terminal.red('Exiting with exit code 1...\n');
        process.exit(1);
    }
});

new SearchAnimeInterface(Terminal.terminal, {
    searchAnime: async (query) => {
        const titles = await anime.searchTitle(query);
        const selectAnimeInterface = new SelectAnimeInterface(Terminal.terminal, {
            selectAnime: async (index) => {
                const selectedTitle = titles[index];
                const availableEpisodes = await selectedTitle.getEpisodes();
                const selectEpisodeInterface = new SelectEpisodeInterface(Terminal.terminal, {
                    selectEpisode: async (index) => {
                        const selectedEpisode = availableEpisodes[index];
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
                                playVideo(selectedVideo.file, selectEpisodeInterface, index);
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
                                playVideo(selectedVideo.file, selectEpisodeInterface, index);
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
                                playVideo(selectedVideo.file, selectEpisodeInterface, index);
                            },
                            getAvailableResolutions: () => {
                                return availableVideos.getVideosHasResolution().map(video => video.resolution).sort((a, b) => b - a);
                            }
                        });
                    },
                    getAvailableEpisodes: () => {
                        return availableEpisodes.map(episode => episode.episode);
                    }
                });
            },
            getAnimeNames: () => {
                return titles.map(title => title.title);
            }
        });
    }
});
