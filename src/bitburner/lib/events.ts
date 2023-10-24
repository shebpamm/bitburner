export function sendEvent(event: { uuid: string; data: any }) {
  window.dispatchEvent(new CustomEvent("bitburner", { detail: event }));
}
