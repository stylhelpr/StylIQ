export type HandoffPayload = {
  seedPrompt: string;
  autogenerate?: boolean;
  ts?: number;
};

type Listener = (p: HandoffPayload) => void;

type Bus = {
  payload: HandoffPayload | null;
  listeners: Set<Listener>;
};

const BUS_KEY = '__OutfitHandoffBus__';

function getBus(): Bus {
  const g = globalThis as any;
  if (!g[BUS_KEY]) g[BUS_KEY] = {payload: null, listeners: new Set<Listener>()};
  return g[BUS_KEY];
}

export function sendHandoff(p: HandoffPayload) {
  const bus = getBus();
  bus.payload = p;
  bus.listeners.forEach(l => l(p));
}

export function consumeHandoff(): HandoffPayload | null {
  const bus = getBus();
  const p = bus.payload;
  bus.payload = null; // one-shot
  return p;
}

export function subscribeHandoff(listener: Listener) {
  const bus = getBus();
  bus.listeners.add(listener);
  return () => bus.listeners.delete(listener);
}
