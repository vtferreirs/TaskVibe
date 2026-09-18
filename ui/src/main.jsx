import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Estilos globais (reset, variáveis de tema, base)
import App from './App.jsx' // Componente raiz com todas as rotas

// Ponto de entrada do React: monta o <App /> dentro do <div id="root"> do index.html.
// StrictMode reexecuta efeitos em desenvolvimento para ajudar a encontrar bugs.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
