import { precacheAndRoute } from "workbox-precaching";

// Activate immediately. While the app was live this waited for the user to tap
// "Reload" in the update prompt — but the platform is now retired, and a user
// who taps "Later" would otherwise keep running the old, fully-working build
// and creating data that no longer syncs anywhere. The retirement build has to
// reach every device unconditionally.
self.skipWaiting();

// Marker written at install time when this worker is REPLACING a live one, so
// activate can tell an update from a first-ever visit. It lives in a cache
// rather than a module variable because the browser is free to kill and restart
// the worker between the two events.
const REPLACING = "handover-replacing";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  // During an update registration.active is the OUTGOING worker; on a first
  // install it's null. Only the former leaves a stale page running on screen.
  if (!self.registration.active) return;
  event.waitUntil(
    caches.open(REPLACING).then((c) => c.put("/marker", new Response("1")))
  );
});

// Kept so any OLD worker still running out there can be told to stand down.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      // Claiming only routes FUTURE requests through this worker. The page
      // already on screen carries on running the old bundle it booted from the
      // old precache — index.html is precached, so a returning user gets the
      // whole previous app from cache and the handover screen only appeared on
      // a second, manual refresh. Do that refresh for them instead.
      if (!(await caches.has(REPLACING))) return;
      await caches.delete(REPLACING);
      const windows = await self.clients.matchAll({ type: "window" });
      await Promise.all(
        windows.map(async (client) => {
          try {
            await client.navigate(client.url);
          } catch {
            // Some browsers refuse to navigate a client they didn't open.
            // Nothing else to do — the next load picks up the new build anyway.
          }
        })
      );
    })()
  );
});

// Precache the build assets injected by vite-plugin-pwa
precacheAndRoute(self.__WB_MANIFEST);

// Show an OS notification when a push arrives (works when the app is closed)
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "MyDentalBooking", body: event.data?.text() || "" };
  }
  const title = data.title || "MyDentalBooking";
  const options = {
    body: data.body || "",
    icon: "/pwa-192x192.png", // full-color tooth logo (large image)
    badge: "/badge-96x96.png", // monochrome tooth silhouette (status bar)
    vibrate: [120, 60, 120],
    data: { url: data.url || "/", ack: data.ack || null },
    // When the notification can be acknowledged, add a one-tap "Acknowledge" button.
    ...(data.ack ? { actions: [{ action: "ack", title: "Acknowledge" }] } : {}),
  };
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Let any open app window play the branded MyDentalBooking chime + refresh
      // its list immediately, without waiting for the next poll.
      for (const client of windows) {
        client.postMessage({ type: "push-received", url: options.data.url });
      }
      // If the app is already on screen, skip the OS notification so the user
      // hears our chime rather than a duplicate system sound. (Chrome permits
      // omitting the notification while a same-origin window is visible.)
      const appVisible = windows.some(
        (c) => c.visibilityState === "visible" || c.focused
      );
      if (!appVisible) {
        await self.registration.showNotification(title, options);
      }
    })()
  );
});

// Focus or open the app when a notification (or its Acknowledge action) is clicked
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const ackId = event.notification.data?.ack;
  const isAck = event.action === "ack" && ackId;
  // Acknowledging opens the app to a URL it recognises; otherwise its normal link.
  const url = isAck ? `/client?ack=${ackId}` : event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) {
            client.focus();
            // App already open: tell it which notification to acknowledge.
            if (isAck) client.postMessage({ type: "acknowledge", ack: ackId });
            return;
          }
        }
        // App closed: open it at the deep link so it acknowledges on load.
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
