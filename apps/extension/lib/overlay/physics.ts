// Pure placement math for the draggable recording overlay. No DOM or storage
// access — the component feeds it sizes and pointer data, it returns positions.
export type Edge = "left" | "right" | "top" | "bottom";
export type Placement = { edge: Edge; offset: number };
export type Size = { width: number; height: number };
export type Point = { x: number; y: number; t: number };

export const MARGIN = 12;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const project = (velocity: number, decelerationRate = 0.998) =>
  ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);

export const rubberband = (overshoot: number, dimension: number, constant = 0.55) =>
  (overshoot * dimension * constant) /
  (dimension + constant * Math.abs(overshoot));

export const bounded = (
  value: number,
  min: number,
  max: number,
  dimension: number,
) => {
  if (value < min) return min + rubberband(value - min, dimension);
  if (value > max) return max + rubberband(value - max, dimension);
  return value;
};

export const usableBounds = (size: Size) => {
  const maxX = Math.max(MARGIN, window.innerWidth - size.width - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - size.height - MARGIN);
  return { minX: MARGIN, minY: MARGIN, maxX, maxY };
};

export const coordsForPlacement = (placement: Placement, size: Size) => {
  const { minX, minY, maxX, maxY } = usableBounds(size);
  if (placement.edge === "left") {
    return { x: minX, y: clamp(placement.offset, minY, maxY) };
  }
  if (placement.edge === "right") {
    return { x: maxX, y: clamp(placement.offset, minY, maxY) };
  }
  if (placement.edge === "top") {
    return { x: clamp(placement.offset, minX, maxX), y: minY };
  }
  return { x: clamp(placement.offset, minX, maxX), y: maxY };
};

export const nearestPlacement = (
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
  size: Size,
): Placement => {
  const projectedX = x + project(velocityX);
  const projectedY = y + project(velocityY);
  const { minX, minY, maxX, maxY } = usableBounds(size);
  const distances: Array<{ edge: Edge; distance: number }> = [
    { edge: "left", distance: Math.abs(projectedX - minX) },
    { edge: "right", distance: Math.abs(projectedX - maxX) },
    { edge: "top", distance: Math.abs(projectedY - minY) },
    { edge: "bottom", distance: Math.abs(projectedY - maxY) },
  ];
  const edge =
    distances.sort((a, b) => a.distance - b.distance)[0]?.edge ?? "right";

  return {
    edge,
    offset:
      edge === "left" || edge === "right"
        ? clamp(projectedY, minY, maxY)
        : clamp(projectedX, minX, maxX),
  };
};
