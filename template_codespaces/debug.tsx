import React from 'react';
import { renderToString } from 'react-dom/server';
import App from './src/App';
import { Providers } from './src/providers';

try {
  let html = renderToString(<Providers><App /></Providers>);
  console.log('SUCCESS: No errors during render!');
} catch (e) {
  console.error('REACT_RENDER_ERROR:', e);
}
