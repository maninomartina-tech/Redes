import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { tokenEnLaDireccion } from '@/lib/manifiesto';

/*
 * La dirección que abre el ícono del cliente.
 *
 * El manifiesto de su app apunta a /c/<token>/ —una dirección de verdad, sin
 * #, que es la única forma de que el navegador la acepte— y el router de la
 * app trabaja con el #. Acá se traduce una en la otra, antes de que el router
 * arranque: si no, la primera pantalla que vería sería la de la creadora.
 *
 * La dirección no se toca, solo se le agrega el #: es la que el navegador
 * guardó como inicio de la app instalada, y cambiarla lo dejaría afuera de su
 * propio alcance.
 */
const token = tokenEnLaDireccion(window.location.pathname);
if (token && !window.location.hash) {
  window.history.replaceState(null, '', `${window.location.pathname}#/c/${token}`);
}

// HashRouter: permite publicar la app en cualquier hosting estático
// (las rutas viven en el # y no dependen de configuración del servidor).
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
