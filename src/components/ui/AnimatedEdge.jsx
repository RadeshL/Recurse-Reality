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
    <path
      id={id}
      d={edgePath}
      stroke={data?.isActive ? '#00ffcc' : '#555'}
      strokeWidth={2}
      fill="none"
      style={
        animate
          ? {
              strokeDasharray: 1000,
              strokeDashoffset: 1000,
              animation: 'draw 10s ease forwards',
            }
          : {}
      }
    />
  );
}