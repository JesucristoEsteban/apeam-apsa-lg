// Libraries
import pkg from 'websocket';
const { client, connection } = pkg;
// Import modules
import { readFile } from 'fs';
import { promisify } from 'util';
// Export the session class
export class Configuration {
    // Constructor
    constructor() { }
    // Read the configuration file
    async readConfig() {
        // Define a null json
        let json;
        // Try/Catch block
        try {
            // Promisify the readFile function
            const readFileAsync = promisify(readFile);
            // Read the conf.json file as string
            const data = await readFileAsync('./conf.json', 'utf8');
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
    }
    //
    async getServers() {
        // Get the config file
        const config = await this.readConfig();
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
    }
    // Get the named server from the config
    async getServer(name) {
        // Get the config file
        const config = await this.readConfig();
        // Validate the config exists
        if (config) {
            // Get the server
            const server = config.servers[name];
            // Define the url
            server.url = `${server.protocol}://${server.host}:${server.port}${server.sub}`;
            // Return the name server
            return server;
        }
    }
}
export class LocationService {
    //
    constructor() {
        // Define the restart time in seconds
        this.restartTime = 5;
        this.maxAttempts = 5;
        this.attempts = 0;
        // initialize the configuration
        this.configuration = new Configuration();
    }
    //
    async start() {
        // Get the radio location gateway
        const rlg = await this.configuration.getServer('rlg');
        const url = `${rlg?.protocol}://${rlg?.host}:${rlg?.port}/`;
        // Initialize the client
        this.client = new client();
        // Initialize the socket configuration
        this.client.on('connectFailed', (error) => {
            // Log the error connection
            console.log('Connect Error: ' + error.toString());
            // Restart the connection
            this.restart();
        });
        this.client.on('connect', (conn) => {
            // Log the connection success
            console.log(`WS Connected to ${url}`);
            // Save the connection
            this.connection = conn;
            // Define the on error method
            this.connection.on('error', (error) => {
                // Log the error in the connection
                console.log('Connection Error: ' + error.toString());
                // Restart the service
                this.restart();
            });
            // Define the on close method
            this.connection.on('close', () => {
                // Log the connection was closed
                console.log('Connection Closed');
                // Restart the service
                this.restart();
            });
            // Define the on message method
            this.connection.on('message', async (message) => {
                // Parse the message
                const gpsData = this.parse(message);
                // Validate if it's a locationUpdate message
                if (gpsData && 'locationUpdate' in gpsData) {
                    // Send the position using axios to a remote server
                    await this.sendPosition(gpsData.locationUpdate);
                }
            });
        });
        // Connect to the websocket server
        this.client.connect(`${url}`);
    }
    // Validate and parse the message from binaty to json
    parse(message) {
        // Define an empty json response
        let jsonResponse = null;
        // Define a try/catch block
        try {
            // Validate the IMessage it's valid
            if (message) {
                // Validate the message has information
                if (message.binaryData) {
                    // Convert the message to streing
                    const stringMessage = message.binaryData.toString('utf8');
                    // Parse the string to json
                    jsonResponse = JSON.parse(stringMessage);
                }
                else {
                    // Throw an error
                    throw ({ error: 'EMPTY message.' });
                }
            }
            else {
                // Throw an error
                throw ({ error: 'UNDEFINED message.' });
            }
        }
        catch (error) {
            // Log the error
            console.log('Websocket message error: ', error.toString());
        }
        // Return the jsonResponse
        return jsonResponse;
    }
    // Notice and restart the websocket service in the required time
    restart() {
        // Increase the attempts
        this.attempts = ++this.attempts <= this.maxAttempts ? this.attempts : 1;
        const restartTime = Math.pow(this.restartTime, this.attempts);
        // Restart the connection in restartTime seconds
        console.log(`Restart the connection in ${restartTime} seconds.`);
        // Wait the restartTime to try again
        setTimeout(() => {
            // Remove all listeners
            this.connection && this.connection.removeAllListeners();
            // Try to reconnect
            this.start();
        }, restartTime * 1000);
    }
    // Send the 
    async sendPosition(data) {
        // Get the server configuration
        const server = await this.configuration.getServer('api');
        // Define the url
        const url = `${server?.protocol}://${server?.host}:${server?.port}/public/devices/radio`;
        // Log the url and data
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
            .then(response => response.json())
            .then(data => {
            console.log('Success:', data);
        })
            .catch((error) => {
            console.error('Error:', error);
        });
    }
}
new LocationService().start();
//# sourceMappingURL=index.js.map