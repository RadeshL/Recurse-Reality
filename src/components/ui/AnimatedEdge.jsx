import { BaseEdge, getBezierPath } from '@xyflow/react';
import { useEffect, useState } from 'react';

export default function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data
}) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Only animate when source node is active and edge is marked as active
    if (data?.isActive && data?.sourceActive) {
      setAnimate(true);
    }
  }, [data?.isActive, data?.sourceActive]);

  return (
    <BaseEdge
      path={edgePath}
      style={
        (data?.isActive && data?.sourceActive)
          ? {
              stroke: '#00ffcc',
              strokeWidth: 2,
              strokeDasharray: 1000,
              strokeDashoffset: 1000,
              animation: 'draw 5s ease forwards',
            }
          : {
              stroke: 'transparent', // <-- hides inactive edge completely
            }
      }
    />
  );
}