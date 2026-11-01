import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/UI/ErrorBoundary.jsx';
import './i18n/i18n.js';
import './index.css';

const basename =
  import.meta.env.BASE_URL === '/civisproof-gis/'
    ? '/civisproof-gis'
    : '/';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);