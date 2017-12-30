const http = require('http');

console.log("Starting server")

const TIMEOUT = 1000;
const SONOS_API_BASE_URL = "http://localhost:5005";
const PORT = 5007;
var groups = [];
var syncTimeout = null;

const httpRequest = function(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? require('https') : http;
    const request = lib.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode > 299) {
         reject(new Error('Failed to load page, status code: ' + response.statusCode));
       }
      const body = [];
      response.on('data', (chunk) => body.push(chunk));
      response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject({url:url, err:err}))
    })
};

const topologyChange = (zones) => {
	groups = zones.filter((zone) => zone.members.length > 1);
	console.log("> topologyChange: " + groups.length + " groups");
};

const volumeChange = (data) => {
	if(data.previousVolume == data.newVolume) {
		return;
	}
	console.log("> " + data.roomName + " " + data.previousVolume + " -> " + data.newVolume);
	const groupToSync = groups.find((group) => {
		return group.members.find((member) => member.roomName === data.roomName ) !== undefined;
	});
	if(groupToSync) {
		clearTimeout(syncTimeout);
		syncTimeout = setTimeout(() => {
			syncTimeout = null;
			syncGroup(groupToSync, data.newVolume);
		}, TIMEOUT);
	}
};

const syncGroup = (group, newVolume) => {
	console.log("syncing to " + newVolume);
	const promises = group.members.map((member) => {
		console.log('> about to change ' + member.roomName + ' to ' + newVolume);
		return httpRequest(SONOS_API_BASE_URL + "/" + member.roomName + "/volume/" + newVolume);
	});
	Promise.all(promises).catch((err) => {
		console.log('> syncing err', err);
	});
};

const eventHandler = (event) => {
	if(event.type === "volume-change") {
		volumeChange(event.data);
	} else 	if(event.type === "topology-change") {
		topologyChange(event.data);
	} else {
		console.log(event.type);
	}
};

const httpHandler = (request, response) => {
	if (request.method == 'POST') {
        var body = '';
        request.on('data', (data) => { 
        	body += data; 
        });
        request.on('end', () => { 
        	eventHandler(JSON.parse(body)); 
        });
        response.writeHead(200, {'Content-Type': 'text/html'});
        response.end('post received');
        return;
    }

	response.writeHead(200, {'Content-Type': 'text/plain'});
	response.end('nothing to do');
};

const server = http.createServer(httpHandler);


httpRequest(SONOS_API_BASE_URL + "/zones")
	.then((zones) => {
		topologyChange(JSON.parse(zones));
	})
	.catch(() => {
		console.log('sonos api not yet started');
	})
	.then(() => {
		server.listen(PORT);
	});
