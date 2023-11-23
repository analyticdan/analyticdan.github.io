const CANVAS = document.getElementById("canvas");
const CONTEXT = CANVAS.getContext("2d");

const DEBUG = 0;

const DUNGEON_HEIGHT = 10;
const DUNGEON_WIDTH = 10;
const CRITICAL_PATH_LENGTH = 80;

const UNSEEN = 0;
const SEEN = 1;
const VISITED = 2;

const UP = [-1, 0];
const LEFT = [0, -1];
const DOWN = [1, 0];
const RIGHT = [0, 1];
const DIRECTIONS = [UP, LEFT, DOWN, RIGHT];

function isValidTile(row, col) {
  return row >= 0 && row < DUNGEON_HEIGHT && col >= 0 && col < DUNGEON_WIDTH;
}

function getAdjacentTiles(currentRoom, predicate) {
  const adjacentTiles = [];
  for (const direction of DIRECTIONS) {
    const row = currentRoom.row + direction[0];
    const col = currentRoom.col + direction[1];
    if (isValidTile(row, col) && (!predicate || predicate(row, col))) {
      adjacentTiles.push([row, col]);
    }
  }
  return adjacentTiles;
}

function createRoom(id, state, row, col, parent, lock) {
  return {
    id: id,
    state: state,
    row: row,
    col: col,
    parent: parent,
    children: [],
    lock: lock,
    key: 0,
  };
}

function generateDungeon() {
  var keyCounter = 0;
  const startRoom = createRoom(
    0,
    VISITED,
    Math.floor(Math.random() * DUNGEON_HEIGHT),
    Math.floor(Math.random() * DUNGEON_WIDTH),
    null,
    0
  );
  const grid = Array(DUNGEON_HEIGHT)
    .fill(false)
    .map(() => Array(DUNGEON_WIDTH));
  grid[startRoom.row][startRoom.col] = true;

  var currentRoom = startRoom;
  for (var i = 1; i < CRITICAL_PATH_LENGTH; i++) {
    var lock = 0;
    var nextTiles = getAdjacentTiles(
      currentRoom,
      (row, col) => !grid[row][col]
    );

    /* If we reach a dead end on the critical path, drop a key and backtrack. */
    if (nextTiles.length == 0) {
      keyCounter += 1;
      currentRoom.key = keyCounter;
      lock = keyCounter;
    }
    while (nextTiles.length == 0) {
      currentRoom = currentRoom.parent;
      nextTiles = getAdjacentTiles(currentRoom, (row, col) => !grid[row][col]);
    }

    /* Add extra weight to going the same direction as parent to make the dungeon more linear. */
    if (currentRoom.parent != null) {
      const linearDirectionRow =
        currentRoom.row + (currentRoom.row - currentRoom.parent.row);
      const linearDirectionCol =
        currentRoom.col + (currentRoom.col - currentRoom.parent.col);
      if (
        isValidTile(linearDirectionRow, linearDirectionCol) &&
        !grid[linearDirectionRow][linearDirectionCol]
      ) {
        nextTiles.push([linearDirectionRow, linearDirectionCol]);
      }
    }

    const r = Math.floor(Math.random() * nextTiles.length);
    const nextTile = nextTiles[r];
    const nextRoom = createRoom(
      i,
      currentRoom == startRoom ? SEEN : UNSEEN,
      nextTile[0],
      nextTile[1],
      currentRoom,
      lock
    );
    grid[nextRoom.row][nextRoom.col] = true;
    currentRoom.children.push(nextRoom);
    currentRoom = nextRoom;
  }
  // to do: generate bonus paths
  // to do: add extra keys using topological sort (earlier rooms get keys, later rooms get locks)
  return startRoom;
}

const startRoom = generateDungeon();
var playerRoom = startRoom;
const playerKeys = [];
var hasPlayerWon = false;

function move(direction) {
  const nextRow = playerRoom.row + direction[0];
  const nextCol = playerRoom.col + direction[1];

  if (
    playerRoom.parent != null &&
    playerRoom.parent.row == nextRow &&
    playerRoom.parent.col == nextCol
  ) {
    playerRoom = playerRoom.parent;
    drawTiles();
    return;
  }

  const textElement = document.getElementById("text");
  const keysElement = document.getElementById("keys");
  for (const child of playerRoom.children) {
    if (child.row == nextRow && child.col == nextCol) {
      if (child.lock && !playerKeys.includes(child.lock)) {
        if (textElement) {
          textElement.innerHTML +=
            "<br>You do not have the required key: " + child.lock;
        }
        return;
      }
      if (child.state == SEEN) {
        child.state = VISITED;
        if (child.key) {
          playerKeys.push(child.key);
          if (keysElement) {
            keysElement.textContent = "Keys: " + playerKeys;
          }
          if (textElement) {
            textElement.innerHTML += "<br>Acquired key: " + child.key;
          }
          child.key = 0;
        }
        for (const childChild of child.children) {
          childChild.state = SEEN;
        }
      }
      playerRoom = child;
      drawTiles();
      break;
    }
  }

  if (playerRoom.id == CRITICAL_PATH_LENGTH - 1 && !hasPlayerWon) {
    if (textElement) {
      textElement.innerHTML += "<br>Congrats! You made it to the end.";
    }
    alert("Congrats! You made it to the end.");
    hasPlayerWon = true;
  }
}

function moveUp() {
  move(UP);
}

function moveLeft() {
  move(LEFT);
}

function moveDown() {
  move(DOWN);
}

function moveRight() {
  move(RIGHT);
}

CANVAS.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      moveUp();
      break;
    case "KeyA":
    case "ArrowLeft":
      moveLeft();
      break;
    case "KeyS":
    case "ArrowDown":
      moveDown();
      break;
    case "KeyD":
    case "ArrowRight":
      moveRight();
      break;
  }
});

function drawTiles() {
  const tileHeight = CANVAS.height / DUNGEON_HEIGHT;
  const tileWidth = CANVAS.width / DUNGEON_WIDTH;

  const heightOffset = tileHeight / 5;
  const widthOffset = tileWidth / 5;

  var stack = [startRoom];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.state == VISITED) {
      CONTEXT.fillStyle = "green";
    } else if (node.state == SEEN) {
      CONTEXT.fillStyle = "yellow";
    } else if (DEBUG) {
      CONTEXT.fillStyle = "red";
    } else {
      continue;
    }
    /* draw room */
    CONTEXT.strokeRect(
      node.col * tileWidth + widthOffset,
      node.row * tileHeight + heightOffset,
      tileWidth - 2 * widthOffset,
      tileHeight - 2 * heightOffset
    );
    CONTEXT.fillRect(
      node.col * tileWidth + widthOffset,
      node.row * tileHeight + heightOffset,
      tileWidth - 2 * widthOffset,
      tileHeight - 2 * heightOffset
    );
    const tileCenterX = node.col * tileWidth + tileWidth / 2;
    const tileCenterY = node.row * tileHeight + tileHeight / 2;
    /* draw player */
    if (node == playerRoom) {
      CONTEXT.fillStyle = "blue";
      CONTEXT.beginPath();
      CONTEXT.arc(
        tileCenterX,
        tileCenterY,
        Math.min(heightOffset, widthOffset),
        0,
        2 * Math.PI
      );
      CONTEXT.fill();
    }
    /* draw keys */
    if (node.key) {
      CONTEXT.fillStyle = "black";
      CONTEXT.fillText(node.key, tileCenterX, tileCenterY);
    }
    /* display connection between rooms once they are visited */
    if (DEBUG || node.state == VISITED) {
      for (const child of node.children) {
        const startY = tileCenterY + (tileHeight / 2) * (child.row - node.row);
        const startX = tileCenterX + (tileWidth / 2) * (child.col - node.col);
        CONTEXT.fillStyle = "black";
        CONTEXT.beginPath();
        CONTEXT.moveTo(startX - 1 * widthOffset, startY - 1 * heightOffset);
        CONTEXT.lineTo(startX + 1 * widthOffset, startY - 1 * heightOffset);
        CONTEXT.lineTo(startX + 1 * widthOffset, startY + 1 * heightOffset);
        CONTEXT.lineTo(startX - 1 * widthOffset, startY + 1 * heightOffset);
        CONTEXT.fill();
        /* draw locks */
        if (child.lock) {
          CONTEXT.fillStyle = "white";
          CONTEXT.fillText(child.lock, startX, startY);
        }
      }
    }
    /* display room id */
    if (DEBUG) {
      CONTEXT.fillStyle = "black";
      CONTEXT.fillText(
        node.id,
        node.col * tileWidth + widthOffset,
        node.row * tileHeight + 2 * heightOffset
      );
    }
    node.children.forEach((child) => stack.push(child));
  }
}

drawTiles();
