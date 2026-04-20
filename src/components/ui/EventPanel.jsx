import React from 'react';

const EventPanel = ({ events, selectedEventIndex, onEventClick }) => {
  return (
    <div style={{
      width: '300px',
      height: '100vh',
      backgroundColor: '#1a1a1a',
      borderLeft: '1px solid #333',
      padding: '16px',
      overflowY: 'auto',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3 style={{
        color: '#00ffcc',
        margin: '0 0 16px 0',
        fontSize: '14px',
        fontWeight: 'bold'
      }}>
        Event Timeline
      </h3>
      
      <div style={{ color: '#999', marginBottom: '12px', fontSize: '11px' }}>
        Click any event to reconstruct state
      </div>

      {events.map((event, index) => (
        <div
          key={index}
          onClick={() => onEventClick(index)}
          onMouseDown={(e) => e.preventDefault()}
          style={{
            padding: '8px 12px',
            marginBottom: '4px',
            borderRadius: '4px',
            cursor: 'pointer',
            backgroundColor: selectedEventIndex === index ? '#00ffcc' : '#2a2a2a',
            color: '#fff',
            border: selectedEventIndex === index ? 'none' : '1px solid #fff6f6',
            transition: 'all 0.2s ease',
            fontSize: '11px',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            WebkitTouchCallout: 'none',
            WebkitTapHighlightColor: 'transparent'
          }}
          onMouseEnter={(e) => {
            if (selectedEventIndex !== index) {
              e.target.style.backgroundColor = '#333';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedEventIndex !== index) {
              e.target.style.backgroundColor = '#2a2a2a';
            }
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2px'
          }}>
            <span style={{ color: '#666', fontSize: '10px' }}>
              [{index.toString().padStart(2, '0')}]
            </span>
            <span style={{
              fontWeight: selectedEventIndex === index ? 'bold' : 'normal',
              color: '#fff'
            }}>
              {event.type === "CALL" ? "FunctionCalled" : "FunctionReturned"}
            </span>
          </div>
          
          {event.type === "CALL" ? (
            <div style={{ 
              fontSize: '10px', 
              color: '#999',
              marginLeft: '20px' 
            }}>
              l={event.l}, r={event.r}
            </div>
          ) : (
            <div style={{ 
              fontSize: '10px', 
              color: '#999',
              marginLeft: '20px' 
            }}>
              value={event.value}
            </div>
          )}
          
          {event.parentId && (
            <div style={{ 
              fontSize: '9px', 
              color: '#666',
              marginTop: '2px' 
            }}>
              parent: {event.parentId}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EventPanel;
