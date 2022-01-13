import http from 'http';
import fetch from 'node-fetch';
import https from 'https';

const ignoreCertificateAgent = new https.Agent({
    rejectUnauthorized: false
});

export class Proxy {
    server;
    destinationHost;
    destination;
    headerOverrides;
    constructor(destination, headerOverrides) {
        this.destination = destination;
        this.headerOverrides = headerOverrides;
        this.destinationHost = new URL(destination).host;
        this.headerOverrides['host'] = this.destinationHost;
        this.server = http.createServer(this._handleRequest.bind(this));
        this.server.listen(0);
    }
    /**
     * @param {http.IncomingMessage} req 
     * @param {http.ServerResponse} res 
     */
    _handleRequest(req, res) {
        fetch(this.destination, {headers: Object.assign(req.headers, this.headerOverrides), agent: ignoreCertificateAgent})
            .then(resp => {
                res.writeHead(resp.status, resp.headers.raw());
                resp.body.pipe(res);
            });
    }
    getPort() {
        return this.server.address().port;
    }
}

export default Proxy;
