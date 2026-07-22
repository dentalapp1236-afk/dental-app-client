import { precacheAndRoute } from "workbox-precaching";
import { clientsClaim } from "workbox-core";

// Don't auto-activate. A freshly installed worker waits until the user taps
// "Reload" in the update prompt, which posts SKIP_WAITING (below). This is what
// makes the "new version available" popup possible instead of a silent reload.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
clientsClaim();

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
    data: { url: data.url || "/" },
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

// Focus or open the app when a notification is clicked
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((list) => {
        for (const client of list) {
          if ("focus" in client) return client.focus();
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      })
  );
});
