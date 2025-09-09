import { __awaiter } from "tslib";
// Libraries
import { client } from 'websocket';
// Tools
import { Configuration } from './tools/configuration.tool';
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
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the radio location gateway
            const rlg = yield this.configuration.getServer('rlg');
            const url = `${rlg.protocol}://${rlg.host}:${rlg.port}/`;
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
                this.connection.on('message', (message) => __awaiter(this, void 0, void 0, function* () {
                    // Parse the message
                    const gpsData = this.parse(message);
                    // Validate if it's a locationUpdate message
                    if ('locationUpdate' in gpsData) {
                        // Send the position using axios to a remote server
                        yield this.sendPosition(gpsData.locationUpdate);
                    }
                }));
            });
            // Connect to the websocket server
            this.client.connect(`${url}`);
        });
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
    sendPosition(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Get the server configuration
            const server = yield this.configuration.getServer('api');
            // Define the url
            const url = `${server.protocol}://${server.host}:${server.port}/location`;
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
        });
    }
}
//# sourceMappingURL=location.service.js.map