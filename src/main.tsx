import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CatPark from './CatPark';
import './base.css';

createRoot(document.getElementById('root')!).render(<StrictMode><CatPark /></StrictMode>);
