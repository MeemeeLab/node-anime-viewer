import fs from 'fs';

import { historyFilePath } from "../config.js";
import { AnimeEpisode } from './anime.js';

export class HistoryManager {
    /**
     * @type {Object}
     * @private
     */
    _history;

    constructor() {
        if (fs.existsSync(historyFilePath)) {
            this._history = JSON.parse(fs.readFileSync(historyFilePath));
        } else {
            this._history = {
                version: 1,
                data: {}
            };
        }
    }

    /**
     * Save history to file
     */
    save() {
        fs.writeFileSync(historyFilePath, JSON.stringify(this._history));
    }

    /**
     * Add history data
     * @param {AnimeEpisode} episode
     */
    add(episode) {
        this._history.data[episode.title.id] = {
            title: episode.title.title ?? this._history.data[episode.title.id].title,
            episode: episode.episode,
            timestamp: +Date.now()
        };
    }

    /**
     * Get history data, sorted by timestamp
     * @returns {{id: string, title: string, episode: number}[]}
     */
    getAll() {
        return Object.keys(this._history.data).map(id => {
            return {
                id: id,
                title: this._history.data[id].title,
                episode: this._history.data[id].episode
            };
        }).sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Dispose HistoryManager
     */
    dispose() {
        this.save();
    }
}

export default new HistoryManager();