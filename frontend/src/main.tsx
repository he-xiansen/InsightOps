import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

const globalStyles = `
  :root {
    color-scheme: dark;
    font-family: Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
    background: #09090b;
    color: #f4f4f5;
  }

  * {
    box-sizing: border-box;
  }

  html, body, #root {
    min-height: 100%;
  }

  body {
    margin: 0;
    background:
      radial-gradient(circle at top, rgba(37, 99, 235, 0.22), transparent 36%),
      linear-gradient(180deg, #09090b 0%, #111827 100%);
    color: #f4f4f5;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
`;

const style = document.createElement("style");
style.textContent = globalStyles;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
