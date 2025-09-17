import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'

import './styles.css'

const rootElement = document.getElementById('app')
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <h1>Hello World!</h1>
    </StrictMode>,
  )
}
