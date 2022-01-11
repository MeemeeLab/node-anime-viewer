import http from 'http';
import fetch from 'node-fetch';

export class Proxy {
    server;
    destination;
    headerOverrides;
    constructor(destination, headerOverrides) {
        this.destination = destination;
        this.headerOverrides = headerOverrides;
        this.server = http.createServer(this._handleRequest.bind(this));
        this.server.listen(0);
    }
    /**
     * @param {http.IncomingMessage} req 
     * @param {http.ServerResponse} res 
     */
    _handleRequest(req, res) {
        fetch(this.destination, Object.assign(req.headers, this.headerOverrides))
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
