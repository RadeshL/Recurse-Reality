import { useState, useCallback, useEffect, useRef } from 'react';
import { ReactFlow, applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AnimatedEdge from './AnimatedEdge';
import CustomNode from './CustomNode';
import { GridPattern } from './grid-pattern';
import { supabase, emitEvent, createSession, fetchEvents } from '../../lib/supabase';
import { projectState } from '../../lib/projector';
import EventPanel from './EventPanel';

const edgeTypes = {
  animatedEdge: AnimatedEdge,
};

const nodeTypes = {
  custom: CustomNode,
};

let nodeId = 0;

async function buildTree(arr, l, r, parentId = null, events = [], sessionId = null, depth = 0) {
  const currentId = `node-${nodeId++}`;

  // EVENT: function call
  const callEvent = {
    type: "FunctionCalled",
    node_id: currentId,
    args: { l, r },
    parent_event_id: parentId,
    depth
  };
  
  events.push({
    type: "CALL",
    id: currentId,
    l,
    r,
    parentId,
  });

  // Emit to database
  if (sessionId) {
    await emitEvent(sessionId, callEvent);
  }

  if (l === r) {
    const returnEvent = {
      type: "FunctionReturned",
      node_id: currentId,
      value: arr[l],
      parent_event_id: parentId,
      depth
    };
    
    events.push({
      type: "RETURN",
      id: currentId,
      parentId,
      value: arr[l],
    });

    // Emit to database
    if (sessionId) {
      await emitEvent(sessionId, returnEvent);
    }

    return { value: arr[l], id: currentId };
  }

  const mid = Math.floor((l + r) / 2);

  const left = await buildTree(arr, l, mid, currentId, events, sessionId, depth + 1);
  const right = await buildTree(arr, mid + 1, r, currentId, events, sessionId, depth + 1);

  const result = left.value + right.value;

  // EVENT: return
  const returnEvent = {
    type: "FunctionReturned",
    node_id: currentId,
    value: result,
    parent_event_id: parentId,
    depth
  };
  
  events.push({
    type: "RETURN",
    id: currentId,
    parentId,
    value: result,
  });

  // Emit to database
  if (sessionId) {
    await emitEvent(sessionId, returnEvent);
  }

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
  const [selectedEventIndex, setSelectedEventIndex] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(300); // ms per step
  const [isAnimating, setIsAnimating] = useState(false);
  const activeNodesRef = useRef(new Set());
  const nodeValuesRef = useRef({});
  const runIdRef = useRef(0);

  // Sync refs with state
  // ...
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
    if (events.length === 0) return;

    setIsAnimating(true);
    setCurrentIndex(0);
    setSelectedEventIndex(0);

    // Reset the visual state before the animation begins
    setActiveEdges(new Set());
    setActiveNodes(new Set());
    activeNodesRef.current = new Set();
    setNodeValues({});
    nodeValuesRef.current = {};

    setNodes(prev =>
      prev.map(node => ({
        ...node,
        data: {
          ...node.data,
          value: null
        }
      }))
    );

    setEdges(prev =>
      prev.map(edge => ({
        ...edge,
        data: {
          ...edge.data,
          isReturning: false
        }
      }))
    );

    const rootEvent = events.find(e => e.type === "CALL" && e.parentId === null);
    setActiveNodes(new Set([rootEvent.id]));
    activeNodesRef.current = new Set([rootEvent.id]);

    for (let i = 0; i < events.length; i++) {
      // STOP if a newer run started
      if (runId !== runIdRef.current) {
        setIsAnimating(false);
        return;
      }

      const e = events[i];

      if (e.type === "CALL" && e.parentId) {
        while (!activeNodesRef.current.has(e.parentId)) {
          if (runId !== runIdRef.current) {
            setIsAnimating(false);
            return;
          }
          await new Promise(res => setTimeout(res, 10));
        }

        const edgeId = `${e.parentId}-${e.id}`;
        setActiveEdges(prev => new Set([...prev, edgeId]));

        await new Promise(res => setTimeout(res, EDGE_DURATION));
        if (runId !== runIdRef.current) {
          setIsAnimating(false);
          return;
        }

        onEdgeAnimationComplete(e.id);
        await new Promise(res => setTimeout(res, NODE_DELAY));
        if (runId !== runIdRef.current) {
          setIsAnimating(false);
          return;
        }
      }

      if (e.type === "RETURN" && e.parentId) {
        while (!activeNodesRef.current.has(e.id)) {
          if (runId !== runIdRef.current) {
            setIsAnimating(false);
            return;
          }
          await new Promise(res => setTimeout(res, 10));
        }

        const edgeId = `${e.id}-${e.parentId}-return`;

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

        await new Promise(res => setTimeout(res, 800));
        if (runId !== runIdRef.current) {
          setIsAnimating(false);
          return;
        }

        setNodeValues(prev => {
          const newValue = (prev[e.parentId] || 0) + e.value;

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

          const updated = {
            ...prev,
            [e.parentId]: newValue
          };
          nodeValuesRef.current = updated;
          return updated;
        });
      }

      setCurrentIndex(i);
      setSelectedEventIndex(i);
    }

    setIsAnimating(false);
    setIsPlaying(false);
  }, [onEdgeAnimationComplete]);

  const handleRun = useCallback(async () => {
    // Reset UI immediately
    setActiveEdges(new Set());
    setActiveNodes(new Set());
    setNodeValues(() => ({}));
    nodeValuesRef.current = {};
    
    // Create session
    const hardcodedArray = [1, 2, 3, 4, 5];
    const session = await createSession('sum', { arr: hardcodedArray });
    const sessionId = session.id;

    // Generate local events synchronously for UI
    const localEvents = [];
    nodeId = 0;

    // WAIT for full tree to complete - CRITICAL FIX
    await buildTree(
      hardcodedArray,
      0,
      hardcodedArray.length - 1,
      null,
      localEvents,
      null, // don't block UI with DB during recursion
      0
    );

    console.log('Generated events:', localEvents);
    setEvents(localEvents);

    const { nodes: generatedNodes, edges: generatedEdges } = generateNodesAndEdges(localEvents);
    setNodes(generatedNodes);
    setEdges(generatedEdges);

    // Reset node display
    setNodes(prev =>
      prev.map(node => ({
        ...node,
        data: {
          ...node.data,
          value: null
        }
      }))
    );
    
    // Start animation immediately
    runIdRef.current += 1;
    const currentRunId = runIdRef.current;
    
    playEvents(localEvents, currentRunId);

    // Background DB write - SIDE EFFECT (non-blocking)
    localEvents.forEach(event => {
      emitEvent(sessionId, {
        type: event.type === "CALL" ? "FunctionCalled" : "FunctionReturned",
        node_id: event.id,
        ...(event.type === "CALL"
          ? { args: { l: event.l, r: event.r } }
          : { value: event.value }),
        parent_event_id: null, // NULL is fine for linear timeline
        depth: 0
      }).catch(error => {
        console.error('Background DB write failed:', error);
      });
    });

    // Reset timeline state
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [playEvents]);

  // STATE APPLICATION - Only for non-playing scenarios (slider, click, rewind)
  useEffect(() => {
    if (events.length === 0 || isPlaying === true || isAnimating === true) return;

    const state = projectState(events, currentIndex);

    setNodes(state.nodes);
    setEdges(state.edges);
    setNodeValues(state.nodeValues);
    setActiveEdges(state.activeEdges);
    setActiveNodes(state.activeNodes);
    setSelectedEventIndex(currentIndex);
  }, [currentIndex, events, isPlaying, isAnimating]);

  // TIMELINE CONTROLS
  const handlePlay = () => {
    if (events.length === 0) return;

    runIdRef.current += 1;
    const currentRunId = runIdRef.current;

    setIsPlaying(true);
    setCurrentIndex(0);
    setSelectedEventIndex(0);

    playEvents(events, currentRunId);
  };

  const handlePause = () => {
    setIsPlaying(false);
    runIdRef.current += 1;
  };

  const handleRewind = () => {
    setIsPlaying(false);
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleForward = () => {
    setIsPlaying(false);
    setCurrentIndex(prev => Math.min(events.length - 1, prev + 1));
  };

  const handleSpeedChange = (speed) => {
    setPlaySpeed(speed);
  };

  const handleSliderChange = (e) => {
    setIsPlaying(false);
    setCurrentIndex(Number(e.target.value));
  };

  // Event panel click handler (updated)
  const handleEventClick = useCallback((index) => {
    setIsPlaying(false);
    setCurrentIndex(index);
  }, []);

  // Load events from database on mount (optional for replay)
  useEffect(() => {
    const loadFromDatabase = async () => {
      try {
        // For now, we'll create new sessions on each run
        // Later you can implement session selection for replay
      } catch (error) {
        console.error('Error loading from database:', error);
      }
    };
    
    loadFromDatabase();
  }, []);

  useEffect(() => {
    handleRun();
  }, [handleRun]);
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      {/* Main Content Area */}
      <div style={{ 
        flex: 1, 
        position: 'relative', 
        width: 'calc(100vw - 300px)', 
        height: '100vh' 
      }}>
        {/* Background Layer */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',  // IMPORTANT: allows dragging nodes
          backgroundColor: '#0a0a0a'  // Dark background
        }}>
          <GridPattern 
            width={40} 
            height={40} 
            x={-1} 
            y={-1} 
            strokeDasharray="0" 
            className="w-full h-full" 
            stroke="#333"
            strokeWidth="1"
          />
        </div>

        {/* React Flow Layer */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '100%'
        }}>
          <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, background: 'rgba(0,0,0,0.8)', padding: '15px', borderRadius: '8px', minWidth: '320px' }}>
            {/* Run Button */}
            <button
              onClick={handleRun}
              style={{
                background: '#00ffcc',
                borderColor: '#00ffcc',
                borderWidth: '2px',
                borderStyle: 'solid',
                color: '#000',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginBottom: '15px',
                width: '100%'
              }}
            >
              🔄 Run sum([1,2,3,4,5], 0, 4)
            </button>

            {/* Timeline Controls */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ color: '#00ffcc', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
                 Timeline Controls
              </div>
              
              {/* Play/Pause and Step Controls */}
              <div style={{ display: 'flex', gap: '5px', marginBottom: '10px' }}>
                <button
                  onClick={isPlaying ? handlePause : handlePlay}
                  disabled={isAnimating}
                  style={{
                    background: isAnimating ? '#666' : (isPlaying ? '#ff6b6b' : '#51cf66'),
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: isAnimating ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    opacity: isAnimating ? 0.6 : 1
                  }}
                >
                  {isPlaying ? '⏸ Pause' : '▶️ Play'}
                </button>
                
                <button
                  onClick={handleRewind}
                  disabled={isAnimating}
                  style={{
                    background: isAnimating ? '#666' : '#4a90e2',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: isAnimating ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: isAnimating ? 0.6 : 1
                  }}
                >
                  ⏮ Back
                </button>
                
                <button
                  onClick={handleForward}
                  disabled={isAnimating}
                  style={{
                    background: isAnimating ? '#666' : '#4a90e2',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    cursor: isAnimating ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    opacity: isAnimating ? 0.6 : 1
                  }}
                >
                  ⏭ Forward
                </button>
              </div>

              {/* Speed Controls */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ color: '#fff', fontSize: '11px', marginBottom: '5px' }}>
                   Speed: {playSpeed}ms
                </div>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button
                    onClick={() => handleSpeedChange(600)}
                    style={{
                      background: playSpeed === 600 ? '#00ffcc' : '#666',
                      color: playSpeed === 600 ? '#000' : '#fff',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Slow
                  </button>
                  <button
                    onClick={() => handleSpeedChange(300)}
                    style={{
                      background: playSpeed === 300 ? '#00ffcc' : '#666',
                      color: playSpeed === 300 ? '#000' : '#fff',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => handleSpeedChange(100)}
                    style={{
                      background: playSpeed === 100 ? '#00ffcc' : '#666',
                      color: playSpeed === 100 ? '#000' : '#fff',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      fontSize: '10px'
                    }}
                  >
                    Fast
                  </button>
                </div>
              </div>

              {/* Timeline Slider */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ color: '#fff', fontSize: '11px', marginBottom: '5px' }}>
                   Timeline: {currentIndex} / {Math.max(0, events.length - 1)}
                </div>
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, events.length - 1)}
                  value={currentIndex}
                  onChange={handleSliderChange}
                  style={{
                    width: '100%',
                    height: '6px',
                    background: '#333',
                    outline: 'none',
                    borderRadius: '3px',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Stats */}
              <div style={{ color: '#fff', fontSize: '11px' }}>
                Events: {events.length}<br />
                Nodes: {nodes.length}<br />
                Edges: {edges.length}
              </div>
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
      </div>

      {/* Event Timeline Panel */}
      <EventPanel
        events={events}
        selectedEventIndex={selectedEventIndex}
        onEventClick={handleEventClick}
      />
    </div>
  );
}
