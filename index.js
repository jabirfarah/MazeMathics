import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { parse } from 'node:url';
import { WebSocketServer } from 'ws';
import mime from 'mime/lite.js';

const TILES = [
	{ // Floor
		solid: false
	},
	{ // Walls
		solid: true,
		movable: false
	},
	{ // Movable boxes
		solid: true,
		movable: true
	}
];

const worldSize = {
	x: 20,
	y: 20
};
const world = [];
// Generate empty world
for (let x = 0; x < worldSize.x; ++x) {
	world.push([]);
	for (let y = 0; y < worldSize.y; ++y)
		world[x].push(0);
}
// Generate features for testing
for (let y = 7; y < 17; ++y)
	world[14][y] = 1;
world[3][5] = 2;
world[0][18] = 2;
console.log('world generated');

const players = new Map();
const updateAllPlayers = () => {
	for (const { socket } of [...players.values()])
		socket.send(JSON.stringify({
			world,
			players: [...players.values()].map(({ color, direction, position }) => ({ color, direction, position }))
		}));
};
new WebSocketServer({
	server: createServer((request, response) => {
		const path = join('./public/', parse(request.url).pathname);
		createReadStream(path).on('open', function() {
			response.setHeader('Content-Type', mime.getType(path));
			this.pipe(response);
		}).on('error', () => response.writeHead(404).end()); // Errors usually mean the file cannot be read (does not exist)
	}).listen(8080, () => console.log('server listening on port 8080'))
}).on('connection', (socket) => {
	console.log('player connected');
	const uuid = randomUUID();
	players.set(uuid, {
		color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // random color generator
		direction: {
			x: 0,
			y: 0
		},
		position: {
			x: 0,
			y: 0
		},
		socket
	});
	updateAllPlayers();
	const player = players.get(uuid);
	socket.on('message', (data) => {
		try {
			const message = JSON.parse(data);
			if (Object.hasOwn(player.direction, message.directionAxis)) { // If the requested direction exists
				const newDirection = {
					x: 0,
					y: 0
				};
				message.directionStep = +(message.directionStep > 0) || -1;
				newDirection[message.directionAxis] = message.directionStep;
				if (player.direction[message.directionAxis] === message.directionStep) { // If player is already facing that way
					const endPushingPosition = { ...player.position };
					do { // Check if player can move boxes
						endPushingPosition.x = (endPushingPosition.x + newDirection.x + worldSize.x) % worldSize.x;
						endPushingPosition.y = (endPushingPosition.y + newDirection.y + worldSize.y) % worldSize.y;
					} while (TILES[world[endPushingPosition.x][endPushingPosition.y]].movable);
					if (!TILES[world[endPushingPosition.x][endPushingPosition.y]].solid) {
						for (let x = endPushingPosition.x; x - player.position.x; x -= newDirection.x) { // Shift tiles
							world[x][player.position.y] = world[(x - newDirection.x + worldSize.x) % worldSize.x][player.position.y];
						}
						for (let y = endPushingPosition.y; y - player.position.y; y -= newDirection.y) {
							world[player.position.x][y] = world[player.position.x][(y - newDirection.y + worldSize.y) % worldSize.y];
						}
						player.position.x += newDirection.x;
						player.position.y += newDirection.y;
					}
				}
				player.direction = newDirection;
				updateAllPlayers();
			}
		} catch (error) {
			console.log(error);
		}
	}).on('close', () => {
		console.log('player disconnected');
		players.delete(uuid);
	});
})
