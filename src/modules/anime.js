import cheerio from 'cheerio';
import fetch from 'node-fetch';
import CryptoJS from 'crypto-js';
import url from 'url';

const BASEURL = "https://www.gogoanime.fi";
const USERAGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36";

// HELPER FUNCTIONS

async function fetchAndParse(fetchParams) {
    const $ = await fetch(fetchParams.url, {
            headers: fetchParams.headers
        })
        .then(res => res.text())
        .then(body => cheerio.load(body));
    if ($('title').text().match(/Access denied \| .* used Cloudflare to restrict access/)) {
        throw new Error('Cloudflare detected');
    }
    return $;
}

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function f_random(length) {
    var i = length
      , str = '';
    while (i > 0x0) {
        i--,
        str += getRandomInt(0, 9);
    }
    return str;
}

const iv = CryptoJS.enc.Utf8.parse('4770478969418267');
const ajaxData = CryptoJS.enc.Utf8.parse('63976882873559819639988080820907');
/**
 * Parses the embedded video URL to encrypt-ajax.php parameters
 * @param {cheerio} $ Cheerio object of the embedded video page
 * @param {string} id Id of the embedded video URL
 */
function generateEncryptAjaxParameters($, id) {
    const
        cryptVal = $("script[data-name='episode']").data().value
      , decryptedData = CryptoJS.AES['decrypt'](cryptVal, ajaxData, {
            'iv': iv
        })
      , decryptedStr = CryptoJS.enc.Utf8.stringify(decryptedData)
      , videoId = decryptedStr.substring(0, decryptedStr.indexOf('&'))
      , encryptedVideoId = CryptoJS.AES['encrypt'](videoId, ajaxData, {
            'iv': iv
        }).toString();
    return 'id=' + encryptedVideoId + decryptedStr.substring(decryptedStr.indexOf('&')) + '&alias=' + videoId;
}

/**
 * Decrypts the encrypted-ajax.php response
 * @param {object} obj Response from the server
 */
function decryptEncryptAjaxResponse(obj) {
    const decrypted = CryptoJS.enc.Utf8.stringify(CryptoJS.AES.decrypt(obj.data, ajaxData, {
        'iv': iv
    }));
    return JSON.parse(decrypted);
}

// CLASSES

export class AnimeVideo {
    /**
     * @type {string}
     */
    file;
    /**
     * @type {string}
     */
    label;
    /**
     * @type {number}
     */
    resolution;
    /**
     * @type {string}
     */
    type;
    constructor(obj) {
        Object.assign(this, obj);
        this.resolution = parseInt(this.label.substring(0, this.label.indexOf(' ')));
    }
}

export class AnimeVideoCollection {
    /**
     * @type {AnimeVideo[]}
     * @private
     */
    _rawVideos;

    constructor(rawVideos) {    
        this._rawVideos = rawVideos;
    }

    filterByVideoType(type) {
        return new AnimeVideoCollection(this._rawVideos.filter(v => v.type === type));
    }

    byHighResolution() {
        return this._rawVideos.sort((a, b) => b.resolution - a.resolution)[0];
    }
    byLowResolution() {
        return this._rawVideos.sort((a, b) => a.resolution - b.resolution)[0];
    }

    getVideos() {
        return this._rawVideos;
    }
    getVideosHasResolution() {
        return this.getVideos().filter(v => !isNaN(v.resolution));
    }
}

export class AnimeEpisode {
    /**
     * @type {AnimeTitle}
     */
    title;
    /**
     * @type {number}
     */
    episode;
    /**
     * @type {string}
     * @private
     */
    _embedUrlCache;
    async getEmbedUrl() {
        if (this._embedUrlCache) return this._embedUrlCache;
        const $ = await fetchAndParse({
            url: `${BASEURL}/${this.title.id}-episode-${this.episode}`,
            headers: {
                'User-Agent': USERAGENT
            }
        });
        const url = 'https:' + $('.play-video').find('iframe').attr('src');
        this._embedUrlCache = url;
        return url;
    }
    async getAvailableVideos() {
        const embed = url.parse(await this.getEmbedUrl(), true);
        const $ = await fetchAndParse({
            url: await this.getEmbedUrl(),
            headers: {
                'User-Agent': USERAGENT
            }
        });
        const params = generateEncryptAjaxParameters($, embed.query.id);
        const fetchRes = await fetch(`${embed.protocol}//${embed.hostname}/encrypt-ajax.php?${params}`, {
            headers: {
                'User-Agent': USERAGENT,
                'Referer': await this.getEmbedUrl(),
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(resp => resp.json());
        const response = decryptEncryptAjaxResponse(fetchRes);
        const videos = new AnimeVideoCollection([]);
        response.source.forEach(v => videos._rawVideos.push(new AnimeVideo(v)));
        //response.source_bk.forEach(v => videos._rawVideos.push(new AnimeVideo(v)));
        return videos;
    }
}

export class AnimeTitle {
    /**
     * @type {string|null}
     */
    title;
    /**
     * @type {string}
     */
    id;
    /**
     * @type {number|null}
     */
    releaseYear;
    /**
     * Get available episodes
     * @returns {Promise<AnimeEpisode[]>}
     */
    async getEpisodes() {
        const $ = await fetchAndParse({
            url: `${BASEURL}/category/${this.id}`,
            headers: {
                'User-Agent': USERAGENT
            }
        });
        // const epInfo = $('.active');
        // const epStart = parseInt(epInfo.attr('ep_start')) + 1;
        // const epEnd = parseInt(epInfo.attr('ep_end'));

        // This should fix #21
        const episodePages = $('#episode_page').find('li');
        const epStart = parseInt(episodePages.first().find('a').attr('ep_start')) + 1;
        const epEnd = parseInt(episodePages.last().find('a').attr('ep_end'));

        const episodes = [];

        for (let i = epStart; i <= epEnd; i++) {
            const ep = new AnimeEpisode();
            ep.title = this;
            ep.episode = i;
            episodes.push(ep);
        }

        return episodes;
    }
    static byId(id) {
        const title = new AnimeTitle();
        title.id = id;
        title.title = null;
        title.releaseYear = null;
        return title;
    }
}

// FUNCTIONS

/**
 * Search for an anime title by name.
 * @param {string} query 
 * @returns {Promise<AnimeTitle[]>}
 */
export async function searchTitle(query) {
    const $ = await fetchAndParse({
        url: `${BASEURL}/search.html?keyword=${query}`,
        headers: {
            'User-Agent': USERAGENT
        }
    });
    // Don't worry, 'keywork' is not a OUR typo, It gogoanime's typo.
    if ($('.last_episodes').find('.items').text().match(/Sorry, Not found Anime with keywork '.*'./)) {
        return [];
    }
    const titles = [];
    $('.last_episodes').find('.items').children().each((i, el) => {
        const title = new AnimeTitle();
        title.title = $(el).find('a').text().trim();
        title.id = $(el).find('a').attr('href').split('/')[2];
        title.releaseYear = parseInt($(el).find('.released').text().trim().substring(9));
        titles.push(title);
    });
    return titles;
}

export default {
    AnimeTitle,
    AnimeEpisode,
    AnimeVideoCollection,
    AnimeVideo,
    searchTitle
}
