import fs from 'fs';

import { saveFolder, configFilePath } from "../config.js";

export class ConfigManager {
    /**
     * @type {Object}
     * @private
     */
    _config;

    constructor() {
        if (!fs.existsSync(saveFolder)) {
            fs.mkdirSync(saveFolder, { recursive: true });
        }

        if (fs.existsSync(configFilePath)) {
            this._config = JSON.parse(fs.readFileSync(configFilePath));
        } else {
            // If the file doesn't exist
            this._config = {
                version: 1,
                data: {}
            };
        }
    }

    /**
     * Get config data
     * @param {string} key
     */
    get(key) {
        return key.split('.').reduce((obj, key) => {
            if (obj === undefined) return undefined;
            return obj[key];
        }, this._config.data);
    }

    /**
     * Set config data
     * @param {string} key
     */
    set(key, value) {
        key.split('.').reduce((obj, key, index, arr) => {
            if (index === arr.length - 1) {
                obj[key] = value;
            } else {
                obj[key] = obj[key] || {};
            }

            return obj[key];
        }, this._config.data);
    }

    /**
     * Save history to file
     */
    save() {
        fs.writeFileSync(configFilePath, JSON.stringify(this._config));
    }

    /**
     * Dispose ConfigManager
     */
    dispose() {
        this.save();
    }
}

export default new ConfigManager();
