// Libraries
import pkg, { type IBinaryMessage } from 'websocket';
const { client, connection } = pkg;
// Import modules
import { readFile } from 'fs';
import { promisify } from 'util';

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = "0";
//
export interface Server {
	host: string;
	port: string;
	protocol: string;
    sub?: string;
    url?: string;
    username?: string;
    password?: string;
}

export interface Conf {
	servers: {
		[name: string]: Server
	};
}

// Export the session class
export class Configuration {

	// Constructor
	constructor() {}
	// Read the configuration file
	private async readConfig(): Promise<Conf> {
		// Define a null json
		let json: Conf;
		// Try/Catch block
		try {
			// Promisify the readFile function
			const readFileAsync = promisify(readFile);
			// Read the conf.json file as string
			const data = await readFileAsync('./conf.json', 'utf8');
			// Parse the json
			json = JSON.parse(data);
		// Catch an error
		} catch (error) {
			// Throw an error
			throw({error: 'Ocurrió un error en el archivo de configuración'});
		}
		// Return the json
		return json;
	}
    //
    public async getServers() {
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
	public async getServer(name: string) {
		// Get the config filenbvc
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
	// WebSocket client
	private client: any;
	// WebSocket connection
	private connection: any;
	// Define the conifiguration instance
	private configuration: Configuration;
    // Define the restart time in seconds
	private restartTime = 5;
    private readonly maxAttempts = 5;
    private attempts = 0;    
	//
	constructor() {
		// initialize the configuration
		this.configuration = new Configuration();
	}
	//
	public async start() {
		// Get the radio location gateway
		const rlg = await this.configuration.getServer('rlg');
        // const url = `${rlg?.protocol}://${rlg?.host}:${rlg?.port}/`;
        const url = `ws://192.168.1.31:5565`;
		// Initialize the client
		this.client = new client();
		// Initialize the socket configuration
		this.client.on('connectFailed', (error: any) => {
			// Log the error connection
			console.log('Connect Error: ' + error.toString());
			// Restart the connection
			this.restart();
		});

		this.client.on('connect', (conn: any) => {
			// Log the connection success
			console.log(`WS Connected to ${url}`);
			// Save the connection
			this.connection = conn;
			// Define the on error method
			this.connection.on('error', (error: any) => {
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
			this.connection.on('*', (data:any) => {
				console.log(data);
			})
			// Define the on message method
			this.connection.on('message', async (message: any) => {
				console.log(message);
				// Parse the message
				const gpsData = this.parse(message as IBinaryMessage);
				console.log(gpsData);
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
	private parse(message: IBinaryMessage) {
		// Define an empty json response
		let jsonResponse: any = null;
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
				} else {
					// Throw an error
					throw({ error: 'EMPTY message.' });
				}
			} else {
				// Throw an error
				throw({ error: 'UNDEFINED message.' });
			}
		} catch (error: any) {
			// Log the error
			console.log('Websocket message error: ', error.toString());
		}
		// Return the jsonResponse
		return jsonResponse;
	}
	// Notice and restart the websocket service in the required time
	private restart() {
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
	private async sendPosition(data: any) {
		// Get the server configuration
		const server = await this.configuration.getServer('api');
		// Define the url
		const url = `${server?.protocol}://${server?.host}/public/devices/radio`;
		console.log(url);
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