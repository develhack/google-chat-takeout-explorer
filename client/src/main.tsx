import camelcaseKeys from "camelcase-keys";
import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./App.tsx";
import { fetchJson, fetchText } from "./fetch.ts";
import type { RawGroup } from "./types.ts";
import { TooltipProvider } from "@/components/ui/tooltip.tsx";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rawGroupConverter(json: { string: any }) {
  const coverted: Record<string, RawGroup> = {};
  Object.entries(json).forEach(([id, rawGroup]) => {
    coverted[id] = camelcaseKeys(rawGroup, { deep: true });
  });
  return coverted;
}

const accountPromise = fetchText("/data/account.txt");
const rawUsersPromise = fetchJson<Record<string, string>>("/data/users.json");
const rawGroupsPromise = fetchJson<Record<string, RawGroup>>(
  "/data/groups.json",
  rawGroupConverter,
);
const promises = Promise.all([accountPromise, rawUsersPromise, rawGroupsPromise]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TooltipProvider>
      <BrowserRouter>
        <Suspense>
          <Routes>
            <Route path="/:groupId?/:threadId?/:messageId?" element={<App promises={promises} />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </StrictMode>,
);
