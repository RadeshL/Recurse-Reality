import { Handle, Position } from '@xyflow/react';

export default function CustomNode({ data }) {
  return (
    <div style={{ 
      position: 'relative',
      background: '#1e293b',
      color: '#fff',
      border: '2px solid #00ffcc',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
      minWidth: '120px',
      textAlign: 'center'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: '#00ffcc' }} />

      <div>{data.label}</div>

      {data.value !== null && data.value !== undefined && (
        <div style={{
          position: 'absolute',
          top: '-25px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#00ffcc',
          fontSize: '14px',
          fontWeight: 'bold',
          background: 'rgba(0,0,0,0.8)',
          padding: '2px 6px',
          borderRadius: '4px',
          whiteSpace: 'nowrap'
        }}>
          {data.value}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: '#00ffcc' }} />
    </div>
  );
}
