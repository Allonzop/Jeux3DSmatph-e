import { createRoot } from 'react-dom/client';

import App from './App';
import { initSafeAreaInsets } from './lib/safeArea';

import './index.css';

initSafeAreaInsets();

createRoot(document.getElementById('root')!).render(<App />);
