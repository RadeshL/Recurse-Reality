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
    if (data?.isActive) {
      setAnimate(true);
    }
  }, [data?.isActive]);

  return (
    <BaseEdge
      path={edgePath}
      style={
        data?.isActive
          ? {
              stroke: '#00ffcc',
              strokeWidth: 2,
              strokeDasharray: 1000,
              strokeDashoffset: 1000,
              animation: 'draw 1s ease forwards',
            }
          : {
              stroke: 'transparent', // <-- hides inactive edge completely
            }
      }
    />
  );
}