import http from 'http';
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
        https.get(this.destination, {
            agent: ignoreCertificateAgent,
            headers: Object.assign(req.headers, this.headerOverrides)
        }, (destinationRes) => {
            res.writeHead(destinationRes.statusCode, destinationRes.headers);
            destinationRes.pipe(res);
        });
    }
    getPort() {
        return this.server.address().port;
    }
}

export default Proxy;
