// worker/index.ts
/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

interface PushEvent extends ExtendableEvent {
  data: {
    json(): any;
    text(): string;
  };
}

interface NotificationEvent extends ExtendableEvent {
  action: string;
  notification: Notification;
}

// Ouve o evento de PUSH (Quando a notificação chega do servidor)
self.addEventListener("push", (event: any) => {
  const pushEvent = event as PushEvent;
  if (!pushEvent.data) return;

  try {
    const data = pushEvent.data.json();

    const title = data.title || "Novidade no Zibee!";
    const options: any = {
      body: data.body || "Temos atualizações para você.",
      icon: data.icon || "/icon.png",
      badge: data.badge || "/icon.png",
      data: {
        url: data.url || "/",
      },
      vibrate: [100, 50, 100],
    };

    pushEvent.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("Erro ao ler dados do push:", error);
    pushEvent.waitUntil(
      self.registration.showNotification("Zibee", {
        body: pushEvent.data.text(),
        icon: "/icon.png",
      }),
    );
  }
});

// Ouve o evento de CLIQUE na notificação
self.addEventListener("notificationclick", (event: any) => {
  const notificationEvent = event as NotificationEvent;
  notificationEvent.notification.close();

  const urlToOpen = notificationEvent.notification.data?.url || "/";

  notificationEvent.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList: any) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});

export {}; // Impede que o TS reclame de escopo global
