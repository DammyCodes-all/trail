import { TRAIL_LOGO_PATH } from "@/components/trail-logo";

export type ConnectorOrientation = "horizontal" | "vertical";
export type ConnectorVariant = "problem" | "report";

type Point = {
  x: number;
  y: number;
};

type ConnectorGeometry = {
  viewBox: string;
  className: string;
  node: Point;
  feederPaths: readonly string[];
  outputPath: string;
  outputMarkers: readonly Point[];
  feederGradient: Point & { x2: number; y2: number };
  outputGradient: Point & { x2: number; y2: number };
};

const PROBLEM_GEOMETRY: Record<ConnectorOrientation, ConnectorGeometry> = {
  horizontal: {
    viewBox: "0 0 260 140",
    className:
      "pointer-events-none absolute left-1/2 top-[58%] z-0 hidden h-auto w-[290px] -translate-x-1/2 -translate-y-1/2 lg:block",
    node: { x: 126, y: 70 },
    feederPaths: [
      "M 1 21 C 52 21, 75 51, 111 60",
      "M 1 51 C 54 51, 79 61, 111 66",
      "M 1 88 C 54 88, 80 79, 111 74",
      "M 1 116 C 56 116, 78 88, 111 80",
    ],
    outputPath: "M 141 70 C 176 70, 216 70, 259 70",
    outputMarkers: [
      { x: 158, y: 70 },
      { x: 174, y: 70 },
      { x: 190, y: 70 },
    ],
    feederGradient: { x: 20, y: 0, x2: 112, y2: 0 },
    outputGradient: { x: 140, y: 70, x2: 260, y2: 70 },
  },
  vertical: {
    viewBox: "0 0 140 180",
    className:
      "pointer-events-none absolute left-1/2 top-1/2 z-0 block h-[180px] w-[140px] -translate-x-1/2 -translate-y-1/2 lg:hidden",
    node: { x: 70, y: 80 },
    feederPaths: [
      "M 18 1 C 18 31, 49 43, 62 65",
      "M 47 1 C 47 34, 58 49, 66 64",
      "M 93 1 C 93 34, 82 49, 74 64",
      "M 122 1 C 122 31, 91 43, 78 65",
    ],
    outputPath: "M 70 100 C 70 124, 70 151, 70 179",
    outputMarkers: [
      { x: 70, y: 121 },
      { x: 70, y: 138 },
      { x: 70, y: 155 },
    ],
    feederGradient: { x: 70, y: 0, x2: 70, y2: 66 },
    outputGradient: { x: 70, y: 100, x2: 70, y2: 180 },
  },
};

const REPORT_GEOMETRY: Record<ConnectorOrientation, ConnectorGeometry> = {
  horizontal: {
    viewBox: "0 0 1000 400",
    className:
      "pointer-events-none absolute inset-0 z-0 hidden size-full lg:block",
    node: { x: 430, y: 200 },
    feederPaths: [
      "M 310 48 C 356 48, 378 144, 410 184",
      "M 310 109 C 354 109, 382 162, 410 190",
      "M 310 170 C 356 170, 384 184, 410 196",
      "M 310 230 C 356 230, 384 216, 410 204",
      "M 310 291 C 354 291, 382 238, 410 210",
      "M 310 352 C 356 352, 378 256, 410 216",
    ],
    outputPath: "M 450 200 C 476 200, 504 200, 530 200",
    outputMarkers: [
      { x: 468, y: 200 },
      { x: 486, y: 200 },
      { x: 504, y: 200 },
    ],
    feederGradient: { x: 310, y: 200, x2: 410, y2: 200 },
    outputGradient: { x: 450, y: 200, x2: 530, y2: 200 },
  },
  vertical: {
    viewBox: "0 0 220 220",
    className:
      "pointer-events-none absolute left-1/2 top-1/2 z-0 block size-[220px] -translate-x-1/2 -translate-y-1/2 lg:hidden",
    node: { x: 110, y: 103 },
    feederPaths: [
      "M 12 1 C 12 42, 78 54, 98 85",
      "M 48 1 C 48 46, 86 61, 102 84",
      "M 82 1 C 82 49, 98 66, 106 83",
      "M 138 1 C 138 49, 122 66, 114 83",
      "M 172 1 C 172 46, 134 61, 118 84",
      "M 208 1 C 208 42, 142 54, 122 85",
    ],
    outputPath: "M 110 123 C 110 157, 110 188, 110 219",
    outputMarkers: [
      { x: 110, y: 145 },
      { x: 110, y: 165 },
      { x: 110, y: 185 },
    ],
    feederGradient: { x: 110, y: 1, x2: 110, y2: 85 },
    outputGradient: { x: 110, y: 123, x2: 110, y2: 220 },
  },
};

function TrailNode({ x, y, glowId }: Point & { glowId: string }) {
  return (
    <g data-connector-node>
      <rect
        data-connector-node-rect
        x={x - 20}
        y={y - 20}
        width="40"
        height="40"
        rx="12"
        fill="#0d0e10"
        stroke="#ff6a00"
        strokeOpacity="0.35"
        filter={`url(#${glowId})`}
      />
      <g data-connector-logo>
        <svg
          x={x - 13}
          y={y - 11.65}
          width="26"
          height="23.3"
          viewBox="50.5 42.8 1044.4 936.4"
          aria-hidden="true"
        >
          <path d={TRAIL_LOGO_PATH} fill="#ff6a00" />
        </svg>
      </g>
    </g>
  );
}

type TrailConnectorProps = {
  orientation: ConnectorOrientation;
  variant?: ConnectorVariant;
};

export function TrailConnector({
  orientation,
  variant = "problem",
}: TrailConnectorProps) {
  const geometry =
    variant === "report"
      ? REPORT_GEOMETRY[orientation]
      : PROBLEM_GEOMETRY[orientation];
  const connectorKey =
    variant === "problem" ? orientation : `${variant}-${orientation}`;
  const feederGradientId = `trail-feeder-gradient-${connectorKey}`;
  const outputGradientId = `trail-output-gradient-${connectorKey}`;

  const glowId = `trail-glow-${connectorKey}`;

  return (
    <svg
      data-connector={connectorKey}
      data-node-origin={`${geometry.node.x} ${geometry.node.y}`}
      aria-hidden="true"
      focusable="false"
      viewBox={geometry.viewBox}
      className={geometry.className}
    >
      <defs>
        <linearGradient
          id={feederGradientId}
          x1={geometry.feederGradient.x}
          y1={geometry.feederGradient.y}
          x2={geometry.feederGradient.x2}
          y2={geometry.feederGradient.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#626973" stopOpacity="0.42" />
          <stop offset="0.72" stopColor="#8b929c" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0.72" />
        </linearGradient>
        <linearGradient
          id={outputGradientId}
          x1={geometry.outputGradient.x}
          y1={geometry.outputGradient.y}
          x2={geometry.outputGradient.x2}
          y2={geometry.outputGradient.y2}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ff6a00" stopOpacity="0.72" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0.22" />
        </linearGradient>
        <filter
          id={glowId}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 0.42 0 0 0  0 0 0 0 0  0 0 0 0.45 0"
            result="coloredBlur"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g
        fill="none"
        stroke={`url(#${feederGradientId})`}
        strokeLinecap="round"
        strokeWidth="1.2"
      >
        {geometry.feederPaths.map((path) => (
          <path
            key={path}
            data-connector-feeder
            d={path}
            pathLength="1"
          />
        ))}
      </g>

      <g
        data-connector-flow-layer
        fill="none"
        stroke={`url(#${feederGradientId})`}
        strokeDasharray="6 16"
        strokeLinecap="round"
        strokeWidth="1.7"
        className="opacity-80 motion-reduce:opacity-0"
      >
        {geometry.feederPaths.map((path) => (
          <path key={`flow-${path}`} data-connector-flow d={path} />
        ))}
      </g>

      <path
        data-connector-output
        d={geometry.outputPath}
        fill="none"
        pathLength="1"
        stroke={`url(#${outputGradientId})`}
        strokeLinecap="round"
        strokeWidth="1.2"
      />
      <path
        data-connector-flow-layer
        data-connector-flow
        d={geometry.outputPath}
        fill="none"
        stroke={`url(#${outputGradientId})`}
        strokeDasharray="6 16"
        strokeLinecap="round"
        strokeWidth="1.7"
        className="opacity-90 motion-reduce:opacity-0"
      />

      {geometry.outputMarkers.map((marker, index) => (
        <g
          key={`${marker.x}-${marker.y}`}
          data-connector-output-marker
        >
          <rect
            x={marker.x - 1.6}
            y={marker.y - 1.6}
            width="3.2"
            height="3.2"
            rx="0.35"
            fill="#ff6a00"
            opacity={0.38 + index * 0.14}
            transform={`rotate(45 ${marker.x} ${marker.y})`}
          />
        </g>
      ))}

      <TrailNode {...geometry.node} glowId={glowId} />
    </svg>
  );
}
