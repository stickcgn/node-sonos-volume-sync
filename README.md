# node-sonos-volume-sync
Sync volume of groups via [node-sonos-http-api](https://github.com/jishi/node-sonos-http-api).

## Usecase
Use the hardkeys of your sonos speaker and keep the volume of groups in sync.

## Prerequisites

[node-sonos-http-api](https://github.com/jishi/node-sonos-http-api) is installed.

## Installation

Clone this repository, change into that forlder and execute the following
```
npm install
```

## Adding webhook in [node-sonos-http-api](https://github.com/jishi/node-sonos-http-api)

Register this app in `settings.json` of [node-sonos-http-api](https://github.com/jishi/node-sonos-http-api) as a webhook like this:

```
{
  ...
  "webhook": "http://localhost:5007/"
  ...
}    
```

## Configuration 

Second part of configuration takes place in `config.json` of this app:

config.json
```
{
	"port": 5007,
	"syncLatency": 1000,
	"nodeSonosHttpApi": "http://localhost:5005",
	"volumeFactors": {
		"Wohnzimmer": 1.2
	}
}
```

- `port` is the port of this app.
- `syncLatency` is the time (in milliseconds) between the last volume change and the sync. If you hit the volume button several times in a row only the last one will sync.
- `nodeSonosHttpApi` is the base url where [node-sonos-http-api](https://github.com/jishi/node-sonos-http-api) listens.
- `volumeFactors` is a hash of optional factors to harmonize between different room setups. In this example "Wohnzimmer" needs to be 20% louder that my other rooms to feel right.

## Serveral groups at once

Theoretically this app should work with different groups at the same time. But I did not test this. Please let me know if it doen't work.