const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export const operator = {
  zoneId: import.meta.env.VITE_ZONE_ID ?? "zone-a",
  operatorId: import.meta.env.VITE_OPERATOR_ID ?? "operator-1"
};

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-zone-id": operator.zoneId,
    "x-operator-id": operator.operatorId
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { headers: headers() });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return (await response.json()) as T;
}

export async function apiPost<T>(path: string, body?: unknown, method = "POST"): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T;
}

export function createEventsStream(onEvent: (event: any) => void): EventSource {
  const query = new URLSearchParams();
  const url = `${API_BASE}/events`;

  // Native EventSource does not support custom headers, so we pass context in query and mirror in proxy setups.
  query.set("zoneId", operator.zoneId);
  query.set("operatorId", operator.operatorId);

  const source = new EventSource(`${url}?${query.toString()}`);
  source.onmessage = (evt) => onEvent(JSON.parse(evt.data));
  return source;
}
