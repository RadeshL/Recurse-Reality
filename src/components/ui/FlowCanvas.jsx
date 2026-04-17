import { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AnimatedEdge from './AnimatedEdge';

const edgeTypes = {
  animatedEdge: AnimatedEdge,
};

let nodeId = 0;

function buildTree(arr, l, r, parentId = null, events = []) {
  const currentId = `node-${nodeId++}`;

  // EVENT: function call
  events.push({
    type: "CALL",
    id: currentId,
    l,
    r,
    parentId,
  });

  if (l === r) {
    events.push({
      type: "RETURN",
      id: currentId,
      parentId,
      value: arr[l],
    });

    return { value: arr[l], id: currentId };
  }

  const mid = Math.floor((l + r) / 2);

  const left = buildTree(arr, l, mid, currentId, events);
  const right = buildTree(arr, mid + 1, r, currentId, events);

  const result = left.value + right.value;

  // EVENT: return
  events.push({
    type: "RETURN",
    id: currentId,
    parentId,
    value: result,
  });

  return { value: result, id: currentId };
}

function layoutTree(events, nodeId, depth = 0, xOffset = 0) {
  const children = events
    .filter(e => e.type === "CALL" && e.parentId === nodeId)
    .map(e => e.id);

  const y = depth * 150;

  // BASE CASE (leaf node)
  if (children.length === 0) {
    return {
      positions: {
        [nodeId]: { x: xOffset, y }
      },
      width: 100 // width of leaf
    };
  }

  // RECURSIVE CASE
  let currentX = xOffset;
  let totalWidth = 0;
  let positions = {};

  const childLayouts = [];

  children.forEach(childId => {
    const layout = layoutTree(events, childId, depth + 1, currentX);
    childLayouts.push(layout);

    currentX += layout.width + 50; // spacing between subtrees
    totalWidth += layout.width + 50;
  });

  totalWidth -= 50; // remove extra spacing

  // Parent X = midpoint of children
  const firstChild = childLayouts[0];
  const lastChild = childLayouts[childLayouts.length - 1];

  const parentX =
    (firstChild.positions[children[0]].x +
      lastChild.positions[children[children.length - 1]].x) / 2;

  // Merge all positions
  childLayouts.forEach(layout => {
    positions = { ...positions, ...layout.positions };
  });

  // Add current node
  positions[nodeId] = { x: parentX, y };

  return {
    positions,
    width: totalWidth
  };
}

function generateNodesAndEdges(events) {
  const nodes = [];
  const edges = [];

  // Find root node
  const rootEvent = events.find(e => e.type === "CALL" && e.parentId === null);

  const { positions } = layoutTree(events, rootEvent.id);

  // Create nodes
  events.forEach(event => {
    if (event.type === "CALL") {
      const pos = positions[event.id];

      nodes.push({
        id: event.id,
        position: pos,
        data: {
          label: `sum(arr, ${event.l}, ${event.r})`,
          isActive: false
        },
        style: {
          background: '#1e293b',
          color: '#fff',
          border: '2px solid #00ffcc',
          borderRadius: '8px',
          padding: '10px',
          fontSize: '12px'
        }
      });

      // Create edges
      if (event.parentId) {
        edges.push({
          id: `${event.parentId}-${event.id}`,
          source: event.parentId,
          target: event.id,
          type: 'animatedEdge',
          animated: false
        });
      }
    }
  });

  return { nodes, edges };
}

export default function FlowCanvas() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [events, setEvents] = useState([]);
  const [activeEdges, setActiveEdges] = useState(new Set());
  const [activeNodes, setActiveNodes] = useState(new Set());
  const activeNodesRef = useRef(new Set());

  // Sync ref with state
  useEffect(() => {
    activeNodesRef.current = activeNodes;
  }, [activeNodes]);

  const EDGE_DURATION = 800;     // animation time
  const NODE_DELAY = 150;        // delay before emitting next edge

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'animatedEdge',
          },
          eds
        )
      ),
    []
  );

  const onEdgeAnimationComplete = useCallback((targetNodeId) => {
    setActiveNodes(prev => new Set(prev).add(targetNodeId));
  }, []);

  const playEvents = useCallback(async (events) => {
    // Start with root node active
    const rootEvent = events.find(e => e.type === "CALL" && e.parentId === null);
    setActiveNodes(new Set([rootEvent.id]));
    activeNodesRef.current = new Set([rootEvent.id]);

    for (let i = 0; i < events.length; i++) {
      const e = events[i];

      if (e.type === "CALL" && e.parentId) {
        // Wait for parent node to be active before animating edge
        while (!activeNodesRef.current.has(e.parentId)) {
          await new Promise(res => setTimeout(res, 10));
        }

        const edgeId = `${e.parentId}-${e.id}`;
        setActiveEdges(prev => new Set([...prev, edgeId]));

        // Wait for edge animation to complete
        await new Promise(res => setTimeout(res, EDGE_DURATION));
        
        // Node receives signal here
        onEdgeAnimationComplete(e.id);
        
        // Small controlled delay before emitting
        await new Promise(res => setTimeout(res, NODE_DELAY));
      }

      if (e.type === "RETURN" && e.parentId) {
        // For return edges, wait for child node to be active
        while (!activeNodesRef.current.has(e.id)) {
          await new Promise(res => setTimeout(res, 10));
        }

        const edgeId = `${e.parentId}-${e.id}`;
        setActiveEdges(prev => new Set([...prev, edgeId]));

        // Return edges don't need to activate parent (already active)
        await new Promise(res => setTimeout(res, EDGE_DURATION));
      }
    }
  }, [onEdgeAnimationComplete]);

  const handleRun = useCallback(() => {
    const events = [];
    nodeId = 0;

    // Hardcoded input for the first function call
    const hardcodedArray = [1, 2, 3, 4, 5];
    buildTree(hardcodedArray, 0, hardcodedArray.length - 1, null, events);

    console.log('Generated events:', events);
    setEvents(events);

    const { nodes: generatedNodes, edges: generatedEdges } = generateNodesAndEdges(events);
    setNodes(generatedNodes);
    setEdges(generatedEdges);

    // Start animation
    setActiveEdges(new Set());
    setActiveNodes(new Set());
    playEvents(events);
  }, [playEvents]);

  useEffect(() => {
    handleRun();
  }, [handleRun]);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '8px' }}>
        <button
          onClick={handleRun}
          style={{
            background: '#00ffcc',
            color: '#000',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Run sum([1,2,3,4,5], 0, 4)
        </button>
        <div style={{ color: '#fff', marginTop: '10px', fontSize: '12px' }}>
          Events: {events.length}<br />
          Nodes: {nodes.length}<br />
          Edges: {edges.length}
        </div>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges.map(edge => ({
          ...edge,
          data: {
            isActive: activeEdges.has(edge.id),
            sourceActive: activeNodes.has(edge.source),
            targetActive: activeNodes.has(edge.target)
          }
        }))}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
    </div>
  );
}