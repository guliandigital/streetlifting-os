import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";

import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "mantine-datatable/styles.layer.css";

import { App } from "./app/App";
import { store } from "./store";
import "./translations/i18n";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found in index.html");

createRoot(rootEl).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
);
