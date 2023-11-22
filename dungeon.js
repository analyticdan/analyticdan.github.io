const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");

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

var CURRENT_KEY = 1;

function isValidTile(row, col) {
  return row >= 0 && row < DUNGEON_HEIGHT && col >= 0 && col < DUNGEON_WIDTH;
}

function generateDungeon() {
  const grid = Array(DUNGEON_HEIGHT)
    .fill(0)
    .map(() => Array(DUNGEON_WIDTH));

  const start = {
    id: 0,
    state: VISITED,
    row: Math.floor(Math.random() * DUNGEON_HEIGHT),
    col: Math.floor(Math.random() * DUNGEON_WIDTH),
    parent: null,
    children: [],
  };
  grid[start.row][start.col] = true;

  function getValidDirections(node) {
    const validDirections = [];
    for (const direction of DIRECTIONS) {
      const nextRow = node.row + direction[0];
      const nextCol = node.col + direction[1];
      if (isValidTile(nextRow, nextCol) && !grid[nextRow][nextCol]) {
        validDirections.push(direction);
      }
    }
    return validDirections;
  }

  var node = start;
  for (var i = 1; i < CRITICAL_PATH_LENGTH; i++) {
    var requiresKey = false;
    var validDirections = getValidDirections(node);

    /* If we reach a dead end on the critical path, drop a key and backtrack. */
    if (validDirections.length == 0) {
      node.hasKey = requiresKey = CURRENT_KEY;
      CURRENT_KEY += 1;
    }
    while (validDirections.length == 0) {
      node = node.parent;
      validDirections = getValidDirections(node);
    }

    /* Add extra weight to going the same direction if this is the first passthrough. */
    if (node.parent != null && !requiresKey) {
      const previousDirection = validDirections.find(
        (direction) =>
          direction[0] == node.row - node.parent.row &&
          direction[1] == node.col - node.parent.col
      );
      if (previousDirection) {
        validDirections.push(previousDirection);
      }
    }

    const r = Math.floor(Math.random() * validDirections.length);
    const direction = validDirections[r];
    const child = {
      id: i,
      state: node == start ? SEEN : UNSEEN,
      row: node.row + direction[0],
      col: node.col + direction[1],
      parent: node,
      children: [],
      requiresKey: requiresKey,
    };
    grid[child.row][child.col] = true;
    node.children.push(child);
    node = child;
  }
  return start;
}

function drawTiles() {
  const tileHeight = canvas.height / DUNGEON_HEIGHT;
  const tileWidth = canvas.width / DUNGEON_WIDTH;

  const heightOffset = tileHeight / 5;
  const widthOffset = tileWidth / 5;

  var stack = [dungeonRoot];
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.state == VISITED) {
      context.fillStyle = "green";
    } else if (node.state == SEEN) {
      context.fillStyle = "yellow";
    } else if (DEBUG) {
      context.fillStyle = "red";
    } else {
      continue;
    }
    context.strokeRect(
      node.col * tileWidth + widthOffset,
      node.row * tileHeight + heightOffset,
      tileWidth - 2 * widthOffset,
      tileHeight - 2 * heightOffset
    );
    context.fillRect(
      node.col * tileWidth + widthOffset,
      node.row * tileHeight + heightOffset,
      tileWidth - 2 * widthOffset,
      tileHeight - 2 * heightOffset
    );
    const tileCenterX = node.col * tileWidth + tileWidth / 2;
    const tileCenterY = node.row * tileHeight + tileHeight / 2;
    if (node == playersNode) {
      context.fillStyle = "blue";
      context.beginPath();
      context.arc(
        tileCenterX,
        tileCenterY,
        Math.min(heightOffset, widthOffset),
        0,
        2 * Math.PI
      );
      context.fill();
    }
    if (node.hasKey) {
      context.fillStyle = "black";
      context.fillText(node.hasKey, tileCenterX, tileCenterY);
    }
    if (DEBUG || node.state == VISITED) {
      for (const child of node.children) {
        const startY = tileCenterY + (tileHeight / 2) * (child.row - node.row);
        const startX = tileCenterX + (tileWidth / 2) * (child.col - node.col);
        context.fillStyle = "black";
        context.beginPath();
        context.moveTo(startX - 1 * widthOffset, startY - 1 * heightOffset);
        context.lineTo(startX + 1 * widthOffset, startY - 1 * heightOffset);
        context.lineTo(startX + 1 * widthOffset, startY + 1 * heightOffset);
        context.lineTo(startX - 1 * widthOffset, startY + 1 * heightOffset);
        context.fill();
        if (child.requiresKey) {
          context.fillStyle = "white";
          context.fillText(child.requiresKey, startX, startY);
        }
      }
    }
    node.children.forEach((child) => stack.push(child));
    if (DEBUG) {
      context.fillStyle = "black";
      context.fillText(
        node.id,
        node.col * tileWidth + widthOffset,
        node.row * tileHeight + 2 * heightOffset
      );
    }
  }
}

const dungeonRoot = generateDungeon();
var playersNode = dungeonRoot;
const playerKeys = [];
var hasWon = false;

canvas.addEventListener("keydown", (e) => {
  var direction;
  switch (e.code) {
    case "KeyW":
    case "ArrowUp":
      direction = UP;
      break;
    case "KeyA":
    case "ArrowLeft":
      direction = LEFT;
      break;
    case "KeyS":
    case "ArrowDown":
      direction = DOWN;
      break;
    case "KeyD":
    case "ArrowRight":
      direction = RIGHT;
      break;
  }

  const nextRow = playersNode.row + direction[0];
  const nextCol = playersNode.col + direction[1];
  if (
    playersNode.parent != null &&
    playersNode.parent.row == nextRow &&
    playersNode.parent.col == nextCol
  ) {
    playersNode = playersNode.parent;
    drawTiles();
    return;
  }
  for (const child of playersNode.children) {
    if (child.row == nextRow && child.col == nextCol) {
      if (child.requiresKey && !playerKeys.includes(child.requiresKey)) {
        alert("You do not have the required key:", child.requiresKey);
      } else {
        if (child.state == SEEN) {
          child.state = VISITED;
          if (child.hasKey) {
            playerKeys.push(child.hasKey);
            child.hasKey = 0;
          }
          for (const childsChild of child.children) {
            childsChild.state = SEEN;
          }
        }
        playersNode = child;
        drawTiles();
      }
      break;
    }
  }

  if (playersNode.id == CRITICAL_PATH_LENGTH - 1 && !hasWon) {
    alert("Congrats! You made it to the end.");
    hasWon = true;
  }
});

drawTiles();
