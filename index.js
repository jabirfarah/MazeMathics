// HERE BE DRAGONS
// (they are made of spaghetti)

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { parse } from 'node:url';
import { WebSocketServer } from 'ws';
import mime from 'mime/lite.js';

import { writeFile } from 'node:fs/promises';

const TILES = [
	{ // floor
		solid: false,
		movable: false
	},
	{ // Wall; 1
		solid: true,
		movable: false
	},
	{ // Door; 2
		solid: true,
		movable: false
	},
	{ // Crate (Locked)
		solid: true,
		movable: false
	},
	{ // Crate (Unlocked)
		solid: true,
		movable: true
	}
];

const world = [
[1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
[1,0,4,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,1,1,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,0,4,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,4,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,0,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1,0,0,0,0,0,0,4,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1,0,1,1,0,1,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,1,0,1,0,1,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,1,1,1,0,1,1,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,1,0,1,0,1,0,0,1,1,1,1,1,0,0,1,0,0,1,0,0,1,4,0,0,0,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,1,0,1,0,1,0,0,0,4,0,0,0,0,0,1,0,0,1,0,0,1,0,1,1,1,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,1,1,1,1,0,1,0,1,0,1,0,0,0,1,1,1,1,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,1,0,0,1,0,1,0,1,0,1,1,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,1,0,0,1,0,1,0,1,0,0,4,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,1,0,0,1,0,1,1,1,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,1,0,0,1,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,4,1,0,1,0,0,0,1,1,1],
[1,0,1,0,0,0,1,0,0,1,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,1,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,1,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,1,1,1,1,1,1,1,1,0,1,0,1,0,0,0,0,0,1,1,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,4,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,4,1,1,1,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,1,0,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,0,1,1,1,1,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,4,1,4,1,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,1,4,4,1,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,4,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,0,0,1,0,1],
[1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,4,1,1,1,1,1],
[1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,4,0,1,0,0],
[1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,4,1,0,1,0,1],
[1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,1,0,1,1,1,1,1,1,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,0,0,1,0,1,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,1,1,1,1,0,1,0,1,0,4,0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,1,0,4,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,0,1,4,1,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,0,1,0,0,1,0,0,1,0,0,0,0,1,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,1,1,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,1,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,1,1,1,1,1,0,0,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,0,1,1,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,1,1,1,4,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,4,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,1,1,1,1,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
[1,0,1,0,0,0,0,0,0,0,0,1,0,1,0,0,0,1,0,0,0,0,1,0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,1,0,0,0,0,0,1],
[1,0,1,1,1,1,1,1,1,1,1,1,0,1,0,0,0,1,0,0,0,0,1,0,0,1,0,0,0,1,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0,1,0,1,0,0,0,0,0,1],
[1,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1,0,0,0,0,4,0,0,1,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,1,0,1,0,1,0,0,0,0,0,1],
[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const WORLD_SIZE_X = world.length;
const WORLD_SIZE_Y = world[0].length;
const SPAWN_X = 0;
const SPAWN_Y = 1;
const PLAYER_VIEW_RADIUS_X = 35;
const PLAYER_VIEW_RADIUS_Y = 35;

const players = new Map();
const updateAllPlayers = () => {
	for (const { socket, position } of [...players.values()]) {
		const viewedWorld = [];
		for (let x = (position.x - PLAYER_VIEW_RADIUS_X); x <= (position.x + PLAYER_VIEW_RADIUS_X); ++x) {
			const aaa = [];
			for (let y = (position.y - PLAYER_VIEW_RADIUS_Y); y <= (position.y + PLAYER_VIEW_RADIUS_Y); ++y)
			aaa.push((x < 0 || x >= WORLD_SIZE_X || y < 0 || y >= WORLD_SIZE_Y) ? 0 : world[(x)][(y)]);
			viewedWorld.push(aaa);
		}
		socket.send(JSON.stringify({
			viewedWorld,
			playerCoords: position,
			players: [...players.values()].map(({ color, direction, position, pulling }) => ({ color, direction, position, pulling }))
		}));
	}
};
new WebSocketServer({
	server: createServer((request, response) => {
		const path = join('./public/', parse(request.url).pathname);
		createReadStream(path).on('open', function() {
			response.setHeader('Content-Type', mime.getType(path));
			this.pipe(response);
		}).on('error', () => response.writeHead(404).end());
	}).listen(8080)
}).on('connection', (socket) => {
	const uuid = randomUUID();
	players.set(uuid, {
		color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
		direction: {
			x: 0,
			y: 0
		},
		position: {
			x: SPAWN_X,
			y: SPAWN_Y
		},
		pulling: {
			x: 0,
			y: 0
		},
		socket
	});
	updateAllPlayers();
	const player = players.get(uuid);
	socket.on('message', async (data) => {
		try {
			const message = JSON.parse(data);
			switch (message.action) {
				case 'push':
					if (Object.hasOwn(player.direction, message.directionAxis)) {
						const newDirection = {
							x: 0,
							y: 0
						};
						message.directionStep = +(message.directionStep > 0) || -1;
						newDirection[message.directionAxis] = message.directionStep;
						if (player.direction[message.directionAxis] === message.directionStep) {
							const endPushingPosition = { ...player.position };
							do {
								endPushingPosition.x = (endPushingPosition.x + newDirection.x + WORLD_SIZE_X) % WORLD_SIZE_X;
								endPushingPosition.y = (endPushingPosition.y + newDirection.y + WORLD_SIZE_Y) % WORLD_SIZE_Y;
							} while (TILES[world[endPushingPosition.x][endPushingPosition.y]].movable);
							if (!TILES[world[endPushingPosition.x][endPushingPosition.y]].solid) {
								const playerCanMove = !TILES[world[player.position.x][player.position.y]].solid;
								if (!world[endPushingPosition.x][endPushingPosition.y]) {
									for (let x = endPushingPosition.x; x - player.position.x; x = (x - newDirection.x + WORLD_SIZE_X) % WORLD_SIZE_X)
										world[x][player.position.y] = world[(x - newDirection.x + WORLD_SIZE_X) % WORLD_SIZE_X][player.position.y];
									for (let y = endPushingPosition.y; y - player.position.y; y = (y - newDirection.y + WORLD_SIZE_Y) % WORLD_SIZE_Y)
										world[player.position.x][y] = world[player.position.x][(y - newDirection.y + WORLD_SIZE_Y) % WORLD_SIZE_Y];
								}
								if (!playerCanMove)
									world[player.position.x][player.position.y] = 0;
								const pulledTile = world[(player.position.x + player.pulling.x + WORLD_SIZE_X) % WORLD_SIZE_X][(player.position.y + player.pulling.y + WORLD_SIZE_Y) % WORLD_SIZE_Y];
								if (playerCanMove && TILES[pulledTile].movable) {
									world[player.position.x][player.position.y] = pulledTile;
									world[(player.position.x + player.pulling.x + WORLD_SIZE_X) % WORLD_SIZE_X][(player.position.y + player.pulling.y + WORLD_SIZE_Y) % WORLD_SIZE_Y] = 0;
									player.pulling = {
										x: -newDirection.x,
										y: -newDirection.y
									};
								} else
									player.pulling = {
										x: 0,
										y: 0
									};
								if (playerCanMove) {
									player.position.x = (player.position.x + newDirection.x + WORLD_SIZE_X) % WORLD_SIZE_X;
									player.position.y = (player.position.y + newDirection.y + WORLD_SIZE_Y) % WORLD_SIZE_Y;
								}
							}
						}
						player.direction = newDirection;
						if (player.direction.x === player.pulling.x && player.direction.y === player.pulling.y)
							player.pulling = {
								x: 0,
								y: 0
							};

							/*
						// maths below 
						try {
							const tokens = [];
							for (let y = 0; y < WORLD_SIZE_Y; ++y)
								for (let x = 0; x < WORLD_SIZE_X; ++x)
									if (world[x][y] > 2) {
										if (!tokens.length) {
											tokens.push({
												operator: '+',
												value: +world[x][y]
											});
									}
										else {
											if (world[x][y] > 12)
												tokens.push({
													operator: '+-*^%'[world[x][y] - 13],
													value: 0
												});
											else
												tokens[tokens.length - 1].value = tokens[tokens.length - 1].value * 10 + world[x][y];
										}
									}
							for (const operations of ['^', '*%', '+-'])
								for (let i = 0; i < tokens.length; ++i) {
									const current = tokens[i];
									if (operations.includes(current)) {
										things.erase(i);
										const previous = tokens[--i];
										switch (current) {
											case '+':
												previous.value += current.value;
												break;
											case '-':
												previous.value -= current.value;
												break;
											case '*':
												previous.value *= current.value;
												break;
											case '/':
												previous.value /= current.value;
												break;
											case '^':
												previous.value **= current.value;
												break;
											case '%':
												previous.value = previous.value % current.value;
												break;
										}
								}}
								console.log(tokens[0].value);
						} catch {}
						// maths above
						*/

						updateAllPlayers();
					}
					break;
				case 'pull':
					const oldPulling = { ...player.pulling };
					player.pulling = { ...player.direction };
					if (player.pulling.x !== oldPulling.x || player.pulling.y !== oldPulling.y)
						updateAllPlayers();
					break;
				case 'place':
					// console.log('placing');
					world[(player.position.x + player.direction.x + WORLD_SIZE_X) % WORLD_SIZE_X][(player.position.y + player.direction.y + WORLD_SIZE_Y) % WORLD_SIZE_Y] = message.tile;
					updateAllPlayers();
					await writeFile('world.txt', world.map((column) => column.join(',')).join('\n'));
					// console.log('placed');
			}
		} catch (error) {
			console.log(error);
		}
	}).on('close', () => {
		players.delete(uuid);
		updateAllPlayers();
	});
})
