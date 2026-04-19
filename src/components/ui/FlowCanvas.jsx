import { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AnimatedEdge from './AnimatedEdge';
import CustomNode from './CustomNode';

const edgeTypes = {
  animatedEdge: AnimatedEdge,
};

const nodeTypes = {
  custom: CustomNode,
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
        type: 'custom',
        data: {
          label: `sum(arr, ${event.l}, ${event.r})`,
          isActive: false,
          value: null
        }
      });

      // Create CALL edges
      if (event.parentId) {
        edges.push({
          id: `${event.parentId}-${event.id}`,
          source: event.parentId,
          target: event.id,
          type: 'animatedEdge',
          animated: false,
          data: {
            isReturn: false
          }
        });
      }
    }
  });

  // Create RETURN edges
  events.forEach(event => {
    if (event.type === "RETURN" && event.parentId) {
      edges.push({
        id: `${event.id}-${event.parentId}-return`,
        source: event.id,
        target: event.parentId,
        type: 'animatedEdge',
        animated: false,
        data: {
          isReturn: true,
          value: event.value
        }
      });
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
  const [nodeValues, setNodeValues] = useState({});
  const activeNodesRef = useRef(new Set());
  const nodeValuesRef = useRef({});
  const runIdRef = useRef(0);

  // Sync refs with state
  useEffect(() => {
    activeNodesRef.current = activeNodes;
  }, [activeNodes]);

  useEffect(() => {
    nodeValuesRef.current = nodeValues;
  }, [nodeValues]);

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

  const playEvents = useCallback(async (events, runId) => {
    // Start with root node active
    const rootEvent = events.find(e => e.type === "CALL" && e.parentId === null);
    setActiveNodes(new Set([rootEvent.id]));
    activeNodesRef.current = new Set([rootEvent.id]);
    setNodeValues({});
    nodeValuesRef.current = {};

    for (let i = 0; i < events.length; i++) {
      // STOP if new run started
      if (runId !== runIdRef.current) return;
      
      const e = events[i];

      if (e.type === "CALL" && e.parentId) {
        // Wait for parent node to be active before animating edge
        while (!activeNodesRef.current.has(e.parentId)) {
          if (runId !== runIdRef.current) return;
          await new Promise(res => setTimeout(res, 10));
        }

        const edgeId = `${e.parentId}-${e.id}`;
        setActiveEdges(prev => new Set([...prev, edgeId]));

        // Wait for edge animation to complete
        await new Promise(res => setTimeout(res, EDGE_DURATION));
        if (runId !== runIdRef.current) return;
        
        // Node receives signal here
        onEdgeAnimationComplete(e.id);
        
        // Small controlled delay before emitting
        await new Promise(res => setTimeout(res, NODE_DELAY));
        if (runId !== runIdRef.current) return;
      }

      if (e.type === "RETURN" && e.parentId) {
        // For return edges, wait for child node to be active
        while (!activeNodesRef.current.has(e.id)) {
          if (runId !== runIdRef.current) return;
          await new Promise(res => setTimeout(res, 10));
        }

        const edgeId = `${e.id}-${e.parentId}-return`;
        
        // Update edge to show moving value
        setEdges(prev =>
          prev.map(edge =>
            edge.id === edgeId
              ? {
                  ...edge,
                  data: {
                    ...edge.data,
                    isReturning: true,
                    value: e.value,
                  }
                }
              : edge
          )
        );

        setActiveEdges(prev => new Set([...prev, edgeId]));

        // Wait for animation to complete
        await new Promise(res => setTimeout(res, 800));
        if (runId !== runIdRef.current) return;

        // Update parent node value and nodes in same closure
        setNodeValues(prev => {
          const newValue = (prev[e.parentId] || 0) + e.value;

          // update nodes INSIDE same closure (important)
          setNodes(nodes =>
            nodes.map(node =>
              node.id === e.parentId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      value: newValue
                    }
                  }
                : node
            )
          );

          return {
            ...prev,
            [e.parentId]: newValue
          };
        });
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
    
    // FORCE RESET synchronously
    setNodeValues(() => ({}));
    nodeValuesRef.current = {};
    
    // ALSO reset node display
    setNodes(prev =>
      prev.map(node => ({
        ...node,
        data: {
          ...node.data,
          value: null
        }
      }))
    );
    
    runIdRef.current += 1;
    const currentRunId = runIdRef.current;
    
    playEvents(events, currentRunId);
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
            targetActive: activeNodes.has(edge.target),
            isReturn: edge.data?.isReturn || false,
            isReturning: edge.data?.isReturning || false,
            value: edge.data?.value || ''
          }
        }))}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      />
    </div>
  );
}