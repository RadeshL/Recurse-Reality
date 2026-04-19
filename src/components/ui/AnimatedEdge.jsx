import { BaseEdge, getBezierPath, getSmoothStepPath } from '@xyflow/react';
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
  const [edgePath] = data?.isReturn 
    ? getSmoothStepPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
      })
    : getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
      });

  const [animate, setAnimate] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Only animate when source node is active and edge is marked as active
    if (data?.isActive && data?.sourceActive) {
      setAnimate(true);
    }
  }, [data?.isActive, data?.sourceActive]);

  useEffect(() => {
    if (data?.isReturning) {
      setProgress(0);

      let t = 0;
      const interval = setInterval(() => {
        t += 0.05;
        setProgress(t);

        if (t >= 1) clearInterval(interval);
      }, 30);

      return () => clearInterval(interval);
    }
  }, [data?.isReturning]);

  // position of moving value with offset to prevent overlap
  const offset = data?.isReturn ? 10 : 0;
  const x = sourceX + (targetX - sourceX) * progress + offset;
  const y = sourceY + (targetY - sourceY) * progress - offset;

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={
          (data?.isActive && data?.sourceActive)
            ? {
                stroke: data?.isReturn ? '#ff4d4f' : '#00ffcc',
                strokeWidth: 2,
                strokeDasharray: 1000,
                strokeDashoffset: 1000,
                animation: 'draw 3s ease forwards',
              }
            : {
                stroke: 'transparent', // <-- hides inactive edge completely
              }
        }
      />

      {/* Moving value */}
      {data?.isReturning && progress < 1 && (
        <text
          x={x}
          y={y}
          fill="#00bfff"
          fontSize={18}              // ← increase size
          fontWeight="bold"          // ← clearer
          textAnchor="middle"        // ← center align
          dominantBaseline="middle"  // ← vertically centered
        >
          {data?.value}
        </text>
      )}
    </>
  );
}