const http = require('http');

// TODO: beim topology change muss die volume des coordinators verteilt werden

console.log("Starting server")

const TIMEOUT = 1000;
const SONOS_API_BASE_URL = "http://localhost:5005";
const FACTORS = {
	"Wohnzimmer": 1.2
};
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
	// Sync all rooms with the coordinator	
	groups.forEach((group) => {
		syncGroup(group, group.coordinator.state.volume, group.coordinator.roomName);
	});
};

const volumeChange = (data) => {
	if(data.previousVolume == data.newVolume) {
		return;
	}
	//console.log("> " + data.roomName + " " + data.previousVolume + " -> " + data.newVolume);
	const groupToSync = groups.find((group) => {
		return group.members.find((member) => member.roomName === data.roomName ) !== undefined;
	});
	if(groupToSync) {
		clearTimeout(syncTimeout);
		syncTimeout = setTimeout(() => {
			syncTimeout = null;
			syncGroup(groupToSync, data.newVolume, data.roomName);
		}, TIMEOUT);
	}
};

const syncGroup = (group, newVolume, origin) => {
	console.log("syncing to " + newVolume);
	const promises = group.members
		.filter((member) => member.roomName !== origin)
		.map((member) => {
			const destinationVolume = harmonizeVolume(origin, member.roomName, newVolume);
			console.log('> about to change ' + member.roomName + ' to ' + destinationVolume);
			return httpRequest(SONOS_API_BASE_URL + "/" + member.roomName + "/volume/" + destinationVolume);
		});
	Promise.all(promises).catch((err) => {
		console.log('> syncing err', err);
	});
};

const harmonizeVolume = (origin, destination, volume) => {
	const baseVolume = Math.round(volume / (FACTORS[origin] || 1.0));
	const destinationVolume = Math.round(baseVolume * (FACTORS[destination] || 1.0));
	console.log("> " + origin, volume, " -> ", destination, destinationVolume);
	return destinationVolume;
};

const eventHandler = (event) => {
	if(event.type === "volume-change") {
		volumeChange(event.data);
	} else 	if(event.type === "topology-change") {
		topologyChange(event.data);
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
