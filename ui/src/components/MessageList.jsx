import React, { useRef, useEffect } from 'react';
import { Info, CheckCircle, XCircle, AlertCircle, Zap } from 'lucide-react';
import './MessageList.css';

const MessageList = ({ messages }) => {
  const messagesEndRef = useRef(null);

  // useEffect(() => {
  //   messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  // }, [messages]);

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <XCircle size={20} />;
      case 'interrupt':
        return <Zap size={20} />;
      case 'info':
      default:
        return <Info size={20} />;
    }
  };

  return (
    <div className="messages-container">
      <h3>Activity Log</h3>
      <div className="messages-list">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message message-${msg.type}`}>
            <div className="message-header">
              {getIcon(msg.type)}
              <span className="message-type">{msg.type.toUpperCase()}</span>
              <span className="message-time">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <div className="message-content">
              {msg.content}
            </div>
            {msg.details && (
              <details className="message-details">
                <summary>View Details</summary>
                <pre className="details-code">
                  {JSON.stringify(msg.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default MessageList;
