export const PLATFORM_PLANS = {
  essential: {
    id: "essential",
    name: "Essencial",
    fixedCents: 0,
    ratePercent: 2.5,
    cycleDays: 7,
  },
  growth: {
    id: "growth",
    name: "Crescimento",
    fixedCents: 6790,
    ratePercent: 1,
    cycleDays: 7,
  },
  scale: {
    id: "scale",
    name: "Escala",
    fixedCents: 12790,
    ratePercent: 0,
    cycleDays: 7,
  },
};

export function platformPlan(planId) {
  return PLATFORM_PLANS[planId] || PLATFORM_PLANS.essential;
}

export function platformFeeCents(planId, paidVolumeCents = 0) {
  const plan = platformPlan(planId);
  return plan.fixedCents + Math.round(Number(paidVolumeCents || 0) * plan.ratePercent / 100);
}

export function sevenDayCycle(anchorValue, nowValue = new Date()) {
  const now = new Date(nowValue);
  const fallback = new Date(now);
  fallback.setUTCHours(0, 0, 0, 0);
  const anchor = anchorValue ? new Date(anchorValue) : fallback;
  const safeAnchor = Number.isNaN(anchor.getTime()) ? fallback : anchor;
  const cycleMs = 7 * 24 * 60 * 60 * 1000;
  const elapsed = Math.max(0, now.getTime() - safeAnchor.getTime());
  const completedCycles = Math.floor(elapsed / cycleMs);
  const start = new Date(safeAnchor.getTime() + completedCycles * cycleMs);
  const end = new Date(start.getTime() + cycleMs);
  return { start, end };
}
