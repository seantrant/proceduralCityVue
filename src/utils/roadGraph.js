import * as Three from 'three';

const ROAD_LINE_Y = 0.112;

/**
 * Build a navigable road-network graph from the flat grid array.
 *
 * Uses an index-based flat array for O(1) lookups instead of Map<string>.
 *
 * @param {Array}  arrayOfGrids  – grid cells from GridSetup.createNewGrid()
 * @param {number} spacing       – world-units per cell
 * @param {number} halfExtent    – ((gridSize-1)/2)*spacing
 * @returns {Map<string, object>} nodes keyed by "x,y"
 */
export function buildRoadGraph(arrayOfGrids, spacing, halfExtent) {
  if (!arrayOfGrids.length) return new Map();

  // Determine grid bounds for flat index
  let maxX = 0;
  let maxY = 0;
  arrayOfGrids.forEach((cell) => {
    if (cell.coords.x > maxX) maxX = cell.coords.x;
    if (cell.coords.y > maxY) maxY = cell.coords.y;
  });
  const gridW = maxX + 1;

  const isDriveable = (cell) => !!cell && (cell.contents === 'road' || cell.contents === 'junction');

  // Flat array indexed by (y * gridW + x) – null for non-driveable cells
  const flatNodes = new Array(gridW * (maxY + 1)).fill(null);
  const nodes = new Map();
  const keyFor = (x, y) => `${x},${y}`;

  // Create a node for every driveable cell
  arrayOfGrids.forEach((cell) => {
    if (!isDriveable(cell)) return;
    const { x, y } = cell.coords;
    const worldX = x * spacing - halfExtent;
    const worldZ = y * spacing - halfExtent;
    const node = {
      key: keyFor(x, y),
      coords: { x, y },
      worldPos: new Three.Vector3(worldX, ROAD_LINE_Y, worldZ),
      contents: cell.contents,
      neighbors: [],
    };
    flatNodes[y * gridW + x] = node;
    nodes.set(node.key, node);
  });

  // Connect cardinal neighbours using flat index for O(1) lookup
  const deltas = [[0, -1], [0, 1], [1, 0], [-1, 0]];
  nodes.forEach((node) => {
    const { x, y } = node.coords;
    for (let d = 0; d < 4; d++) {
      const nx = x + deltas[d][0];
      const ny = y + deltas[d][1];
      if (nx < 0 || ny < 0 || nx >= gridW || ny > maxY) continue;
      const neighbor = flatNodes[ny * gridW + nx];
      if (neighbor) node.neighbors.push(neighbor);
    }
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
