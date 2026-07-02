import React, { useState } from 'react';
import AIAssistant from '../AIAssistant';
import AIInsights from '../AIInsights';
import AIManager from '../AIManager';
import { aiAssistantAPI } from '../../services/aiAssistantAPI';

export default function AiHub() {
  const [activeView, setActiveView] = useState('chat');
  const [systemStatus, setSystemStatus] = useState('online');

  return (
    <div style={styles.container}>
      {/* TOP BAR */}
      <div style={styles.topBar}>
        🧠 AI OPERATING SYSTEM
        <span style={{ marginLeft: 20, color: 'lime' }}>● {systemStatus}</span>
      </div>

      {/* MAIN BODY */}
      <div style={styles.body}>
        {/* LEFT NAV */}
        <div style={styles.nav}>
          <button onClick={() => setActiveView('chat')}>💬 Chat</button>

          <button onClick={() => setActiveView('insights')}>📊 Insights</button>

          <button onClick={() => setActiveView('admin')}>🧠 Admin</button>

          <button onClick={() => setActiveView('system')}>⚙ System</button>
        </div>

        {/* CONTENT AREA */}
        <div style={styles.content}>
          {activeView === 'chat' && (
            <div style={styles.panel}>
              <AIAssistant />
            </div>
          )}

          {activeView === 'insights' && (
            <div style={styles.panel}>
              <AIInsights />
            </div>
          )}

          {activeView === 'admin' && (
            <div style={styles.panel}>
              <AIManager />
            </div>
          )}

          {activeView === 'system' && (
            <div style={styles.panel}>
              <SystemMonitor />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* SYSTEM MONITOR (LIGHTWEIGHT VIEW ONLY) */
function SystemMonitor() {
  return (
    <div>
      <h3>⚙ AI System Status</h3>
      <p>Orchestrator: ACTIVE</p>
      <p>Control Plane: ONLINE</p>
      <p>AI Engine: RUNNING</p>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#0b0f19',
    color: 'white',
  },

  topBar: {
    padding: 15,
    borderBottom: '1px solid #222',
    fontWeight: 'bold',
  },

  body: {
    display: 'flex',
    flex: 1,
  },

  nav: {
    width: 200,
    borderRight: '1px solid #222',
    display: 'flex',
    flexDirection: 'column',
    padding: 10,
    gap: 10,
  },

  content: {
    flex: 1,
    padding: 10,
  },

  panel: {
    background: '#111827',
    padding: 15,
    borderRadius: 10,
    height: '100%',
    overflow: 'auto',
  },
};
