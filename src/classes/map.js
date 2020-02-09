"use strict";

require("../libs.js");

/* MapServer class maintains list of maps in memory. */
class MapServer {
    constructor() {
        this.maps = {};
        this.initializeMaps();
    }

    /* Load all the maps into memory. */
    initializeMaps() {
        logger.logWarning("Loading maps into RAM...");

        this.maps = {};
        let keys = Object.keys(filepaths.maps);

        for (let mapName of keys) {
            let node = filepaths.maps[mapName];
            let map = json.parse(json.read(node.base));

            // set infill locations
            for (let entry in node.entries) {
                map.SpawnAreas.push(json.parse(json.read(node.entries[entry])));
            }

            // set exfill locations
            for (let exit in node.exits) {
                map.exits.push(json.parse(json.read(node.exits[exit])));
            }

            // set scav locations
            for (let wave in node.waves) {
                map.waves.push(json.parse(json.read(node.waves[wave])));
            }

            // set boss locations
            for (let spawn in node.bosses) {
                map.BossLocationSpawn.push(json.parse(json.read(node.bosses[spawn])));
            }

            this.maps[mapName] = map;
        }
    }

    /* generates a random map preset to use for local session */
    generate(mapName) {
        let data = this.maps[mapName];
        let lootCount = settings.gameplay.maploot[mapName];
        let mapLoots = [];

        // Regroup loots by Id
        let lootsById = new Map();
        let allLoots = filepaths.maps[mapName].loot;
        let keys = Object.keys(allLoots);
        let n = keys.length;
        while (n --> 0) { // loop on all possible loots
            let loot = json.parse(json.read(allLoots[keys[n]]));
            if (!lootsById.has(loot.Id)) {
                lootsById.set(loot.Id, []);
            }
            lootsById.get(loot.Id).push(loot);
        }

        // First, take one instance of each loot
        for (let inst of lootsById.values()) {
            let rand = utility.getRandomInt(0, inst.length - 1);
            mapLoots.push(inst[rand]);
        }
        // Then shuffle them using Fisher-Yates and take what we need
        if (mapLoots.length > lootCount) {
            let tmp, j, i = mapLoots.length;
            while (i --> 1) {
                j = utility.getRandomInt(0, i);
                tmp = mapLoots[i];
                mapLoots[i] = mapLoots[j];
                mapLoots[j] = tmp;
            }
            mapLoots.splice(0, mapLoots.length - lootCount);
        }

        data.Loot = mapLoots;
        return data;
    }

    /* get a map with generated loot data */
    get(map) {
        let mapName = map.toLowerCase().replace(" ", "");
        return json.stringify(this.generate(mapName));
    }

    /* get all maps without loot data */
    generateAll() {
        let base = json.parse(json.read("db/cache/locations.json"));
        let data = {};

        // use right id's
        for (let mapName in this.maps) {
            data[this.maps[mapName]._Id] = this.maps[mapName];
        }

        base.data.locations = data;
        return json.stringify(base);
    }
}

module.exports.mapServer = new MapServer();