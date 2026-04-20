// PURE PROJECTOR - Reconstructs state by replaying events

interface Event {
  type: "CALL" | "RETURN";
  id: string;
  l?: number;
  r?: number;
  parentId?: string | null;
  value?: number;
}

interface ProjectedState {
  nodes: any[];
  edges: any[];
  nodeValues: Record<string, number>;
  activeEdges: Set<string>;
  activeNodes: Set<string>;
}

export function projectState(events: Event[], uptoIndex: number): ProjectedState {
  const state: ProjectedState = {
    nodes: [],
    edges: [],
    nodeValues: {} as Record<string, number>,
    activeEdges: new Set<string>(),
    activeNodes: new Set<string>()
  };

  // Find root node and get layout positions
  const rootEvent = events.find(e => e.type === "CALL" && e.parentId === null);
  if (!rootEvent) return state;

  // Generate layout positions using same logic as FlowCanvas
  const { positions } = layoutTree(events, rootEvent.id);

  // Replay events from 0 to uptoIndex
  for (let i = 0; i <= uptoIndex && i < events.length; i++) {
    const event = events[i];

    if (event.type === "CALL") {
      // Create node if not exists
      const pos = positions[event.id];
      const existingNode = state.nodes.find(n => n.id === event.id);
      
      if (!existingNode) {
        state.nodes.push({
          id: event.id,
          position: pos,
          type: 'custom',
          data: {
            label: `sum(arr, ${event.l}, ${event.r})`,
            isActive: false,
            value: state.nodeValues[event.id] || null
          }
        });
      }

      // Create CALL edge
      if (event.parentId) {
        const edgeId = `${event.parentId}-${event.id}`;
        const existingEdge = state.edges.find(e => e.id === edgeId);
        
        if (!existingEdge) {
          state.edges.push({
            id: edgeId,
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

      // Mark node as active
      state.activeNodes.add(event.id);
      
    } else if (event.type === "RETURN") {
      // Create RETURN edge
      if (event.parentId) {
        const edgeId = `${event.id}-${event.parentId}-return`;
        const existingEdge = state.edges.find(e => e.id === edgeId);
        
        if (!existingEdge) {
          state.edges.push({
            id: edgeId,
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

        // Mark return edge as active
        state.activeEdges.add(edgeId);
      }

      // Update node value immediately (no animation delays)
      if (event.parentId && event.value !== undefined) {
        state.nodeValues[event.parentId] = (state.nodeValues[event.parentId] || 0) + event.value;
        
        // Update node display
        const parentNode = state.nodes.find(n => n.id === event.parentId);
        if (parentNode) {
          parentNode.data.value = state.nodeValues[event.parentId];
        }
      }

      // Mark node as active
      state.activeNodes.add(event.id);
    }
  }

  return state;
}

// Layout function (copied from FlowCanvas for consistency)
interface LayoutResult {
  positions: Record<string, { x: number; y: number }>;
  width: number;
}

function layoutTree(events: Event[], nodeId: string, depth = 0, xOffset = 0): LayoutResult {
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
  let positions: Record<string, { x: number; y: number }> = {};

  const childLayouts: LayoutResult[] = [];

  children.forEach((childId: string) => {
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
