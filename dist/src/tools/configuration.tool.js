import { __awaiter } from "tslib";
// Import modules
import { readFile } from 'fs';
import { promisify } from 'util';
// Export the session class
export class Configuration {
    // Constructor
    constructor() { }
    // Read the configuration file
    readConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            // Define a null json
            let json = null;
            // Try/Catch block
            try {
                // Promisify the readFile function
                const readFileAsync = promisify(readFile);
                // Read the conf.json file as string
                const data = yield readFileAsync('src/assets/conf.json', 'utf8');
                // Parse the json
                json = JSON.parse(data);
                // Catch an error
            }
            catch (error) {
                // Throw an error
                throw ({ error: 'Ocurrió un error en el archivo de configuración' });
            }
            // Return the json
            return json;
        });
    }
    //
    getServers() {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the config file
            const config = yield this.readConfig();
            // Validate the config exists
            if (config) {
                // Iterate the servers
                Object.keys(config.servers).forEach(key => {
                    // Define the url
                    config.servers[key].url = `${config.servers[key].protocol}://${config.servers[key].host}:${config.servers[key].port}${config.servers[key].sub}`;
                });
                // Remove the rlg server
                delete config.servers.rlg;
                // Return the servers
                return config.servers;
            }
        });
    }
    // Get the named server from the config
    getServer(name) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the config file
            const config = yield this.readConfig();
            // Validate the config exists
            if (config) {
                // Get the server
                const server = config.servers[name];
                // Define the url
                server.url = `${server.protocol}://${server.host}:${server.port}${server.sub}`;
                // Return the name server
                return server;
            }
        });
    }
}
//# sourceMappingURL=configuration.tool.js.map