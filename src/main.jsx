// ============================================================
// 🚀 STARTUP LOG - アプリケーション起動の最初のログ
// ============================================================
console.log('🚀🚀🚀 [STARTUP] main.jsx loaded - Application starting...');
console.log('📍 [STARTUP] Current location:', window.location.href);
console.log('📍 [STARTUP] User Agent:', navigator.userAgent);
console.log('📍 [STARTUP] Time:', new Date().toISOString());

// ============================================================
// zlibjs のロード（エラーが出る可能性がある箇所）
// ============================================================
console.log('⬇️ [ZLIB] Loading zlibjs/bin/gunzip.min.js...');
// zlibjs を明示的にインポートしてグローバルで利用可能にする
// kuromoji が require("zlibjs/bin/gunzip.min.js") で使用するため
import 'zlibjs/bin/gunzip.min.js';
// zlibjs は UMD モジュールなので、window.Zlib として自動的にグローバルに設定されます

// zlibjsがロードされた後の確認
console.log('🔍 [ZLIB] Import statement executed');
console.log('🔍 [ZLIB] window.Zlib exists:', typeof window !== 'undefined' && typeof window.Zlib !== 'undefined');
if (typeof window !== 'undefined' && typeof window.Zlib !== 'undefined') {
    console.log('🔍 [ZLIB] window.Zlib.Gunzip exists:', typeof window.Zlib.Gunzip !== 'undefined');
    console.log('✅ [ZLIB] zlibjs loaded successfully');
} else {
    console.warn('⚠️ [ZLIB] window.Zlib is not defined yet (may be defined later)');
}

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
