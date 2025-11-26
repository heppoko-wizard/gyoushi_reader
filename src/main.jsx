// ============================================================
// 🚀 STARTUP LOG - アプリケーション起動の最初のログ
// ============================================================
console.log('🚀🚀🚀 [STARTUP] main.jsx loaded - Application starting...');
console.log('📍 [STARTUP] Current location:', window.location.href);
console.log('📍 [STARTUP] User Agent:', navigator.userAgent);
console.log('📍 [STARTUP] Time:', new Date().toISOString());

// ============================================================
// pako をグローバルに設定（kuromoji用）
// zlibjs の代わりに pako を使用（SES lockdown の問題を回避）
// ============================================================
console.log('⬇️ [PAKO] Loading pako library...');
import pako from 'pako';

// kuromoji が期待する形式で pako をグローバルに設定
window.Zlib = {
    Gunzip: function (data) {
        // pako の inflate を使ってデータを展開
        return {
            decompress: function () {
                console.log('🔧 [PAKO] Decompressing data with pako...');
                return pako.inflate(data);
            },
            ip: 0,
            op: 0
        };
    }
};

console.log('✅ [PAKO] pako loaded and configured as window.Zlib');
console.log('🔍 [PAKO] window.Zlib.Gunzip exists:', typeof window.Zlib.Gunzip !== 'undefined');

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'


class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ error, errorInfo });
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '20px', color: 'red', whiteSpace: 'pre-wrap', fontFamily: 'monospace', backgroundColor: '#fff0f0' }}>
                    <h1>Something went wrong.</h1>
                    <h2 style={{ fontSize: '1.2em', marginTop: '10px' }}>{this.state.error && this.state.error.toString()}</h2>
                    <details style={{ marginTop: '10px' }}>
                        <summary>Stack Trace</summary>
                        {this.state.errorInfo && this.state.errorInfo.componentStack}
                    </details>
                </div>
            );
        }

        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)
