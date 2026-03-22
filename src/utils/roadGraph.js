import * as Three from 'three';

const ROAD_LINE_Y = 0.112;

/**
 * Build a navigable road-network graph from the flat grid array.
 *
 * @param {Array}  arrayOfGrids  – grid cells from GridSetup.createNewGrid()
 * @param {number} spacing       – world-units per cell
 * @param {number} halfExtent    – ((gridSize-1)/2)*spacing
 * @returns {Map<string, object>} nodes keyed by "x,y"
 */
export function buildRoadGraph(arrayOfGrids, spacing, halfExtent) {
  const nodes = new Map();
  const keyFor = (x, y) => `${x},${y}`;
  const isDriveable = (cell) => !!cell && (cell.contents === 'road' || cell.contents === 'junction');

  // index every cell by coord key
  const cellMap = new Map();
  arrayOfGrids.forEach((cell) => {
    cellMap.set(keyFor(cell.coords.x, cell.coords.y), cell);
  });

  // create a node for every driveable cell
  arrayOfGrids.forEach((cell) => {
    if (!isDriveable(cell)) return;
    const worldX = cell.coords.x * spacing - halfExtent;
    const worldZ = cell.coords.y * spacing - halfExtent;
    nodes.set(keyFor(cell.coords.x, cell.coords.y), {
      key: keyFor(cell.coords.x, cell.coords.y),
      coords: { x: cell.coords.x, y: cell.coords.y },
      worldPos: new Three.Vector3(worldX, ROAD_LINE_Y, worldZ),
      contents: cell.contents,
      neighbors: [], // filled below
    });
  });

  // connect cardinal neighbours
  const deltas = [[0, -1], [0, 1], [1, 0], [-1, 0]];
  nodes.forEach((node) => {
    deltas.forEach(([dx, dy]) => {
      const nKey = keyFor(node.coords.x + dx, node.coords.y + dy);
      const neighbor = nodes.get(nKey);
      if (neighbor) node.neighbors.push(neighbor);
    });
  });

  return nodes;
}

/**
 * Generate a looping vehicle path through the road graph.
 *
 * Strategy: random walk with a straight-ahead bias and no immediate U-turns.
 * The path is returned as an array of Vector3 waypoints.
 *
 * @param {Map}    roadGraph – from buildRoadGraph()
 * @param {number} minLength – minimum waypoints (default 40)
 * @param {number} maxLength – maximum waypoints (default 80)
 * @returns {Three.Vector3[]}
 */
export function generateVehiclePath(roadGraph, minLength = 40, maxLength = 80) {
  if (!roadGraph || roadGraph.size === 0) return [];

  const nodeArray = Array.from(roadGraph.values());
  const startNode = nodeArray[Math.floor(Math.random() * nodeArray.length)];
  if (!startNode.neighbors.length) return [startNode.worldPos.clone()];

  const pathLength = minLength + Math.floor(Math.random() * (maxLength - minLength));
  const path = [startNode.worldPos.clone()];
  let prev = null;
  let current = startNode;

  for (let step = 1; step < pathLength; step++) {
    const candidates = current.neighbors.filter((n) => n !== prev || current.neighbors.length === 1);
    if (!candidates.length) break;

    // straight-ahead bias: if previous direction is known, try to continue
    let next = null;
    if (prev) {
      const dx = current.coords.x - prev.coords.x;
      const dy = current.coords.y - prev.coords.y;
      const straightKey = `${current.coords.x + dx},${current.coords.y + dy}`;
      const straightNeighbor = candidates.find((n) => n.key === straightKey);
      if (straightNeighbor && Math.random() < 0.6) {
        next = straightNeighbor;
      }
    }

    if (!next) {
      next = candidates[Math.floor(Math.random() * candidates.length)];
    }

    path.push(next.worldPos.clone());
    prev = current;
    current = next;
  }

  return path;
}
