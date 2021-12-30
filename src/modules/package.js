import fetch from "node-fetch";

export function getPackageVersionNpm(pkg) {
    return fetch('https://registry.npmjs.org/' + pkg + '/latest')
        .then(res => res.json())
        .then(json => json.version)
        .then(version => version.replaceAll('.', ''))
        .then(version => parseInt(version));
}

export function getGist(gistId) {
    return fetch('https://api.github.com/gists/' + gistId)
        .then(res => res.json())
        .then(json => json.files['index.txt'].content);
}

export default {
    getPackageVersionNpm,
    getGist
}
