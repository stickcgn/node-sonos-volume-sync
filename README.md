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

## Configuration

Register this app in `settings.json` of [node-sonos-http-api](https://github.com/jishi/node-sonos-http-api) as a webhook like this:

```
{
  ...
  "webhook": "http://localhost:5007/"
  ...
}    
```

## TODOs 
- add a config
- make port configurable
- make sonos-api configurable
- enhance README.md

