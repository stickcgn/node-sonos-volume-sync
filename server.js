const http = require('http');
const config = require('./config.json');

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
	console.log("topologyChange, now " + groups.length + " groups");
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
		}, config.syncLatency);
	}
};

const syncGroup = (group, newVolume, origin) => {
	const promises = group.members
		.filter((member) => member.roomName !== origin)
		.map((member) => {
			const destinationVolume = harmonizeVolume(origin, member.roomName, newVolume);
			return httpRequest(config.nodeSonosHttpApi + "/" + member.roomName + "/volume/" + destinationVolume);
		});
	Promise.all(promises).catch((err) => {
		console.log('syncing error', err);
	});
};

const harmonizeVolume = (origin, destination, volume) => {
	const baseVolume = Math.round(volume / (config.volumeFactors[origin] || 1.0));
	const destinationVolume = Math.round(baseVolume * (config.volumeFactors[destination] || 1.0));
	console.log(origin, volume, " -> ", destination, destinationVolume);
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
    }
    response.end();
};

const server = http.createServer(httpHandler);

httpRequest(config.nodeSonosHttpApi + "/zones")
	.then((zones) => {
		topologyChange(JSON.parse(zones));
	})
	.catch(() => {
		console.log("sonos api not yet started, just start it");
	})
	.then(() => {
		server.listen(config.port);
		console.log("server started on port " + config.port);
	});
