import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";

import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://19dedecafd5cc504a55324989fdc1b9b@o4509192617787392.ingest.us.sentry.io/4509192619753472",
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
