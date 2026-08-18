import { TRAIL_LOGO_PATH } from "@/components/trail-logo";

const FEEDER_PATHS = [
  "M 1 21 C 52 21, 75 51, 111 60",
  "M 1 51 C 54 51, 79 61, 111 66",
  "M 1 88 C 54 88, 80 79, 111 74",
  "M 1 116 C 56 116, 78 88, 111 80",
] as const;

const OUTPUT_MARKERS = [158, 174, 190] as const;

function TrailNode() {
  return (
    <g data-connector-node>
      <rect
        x="106"
        y="50"
        width="40"
        height="40"
        rx="12"
        fill="#0d0e10"
        stroke="#ff6a00"
        strokeOpacity="0.35"
      />
      <g data-connector-logo>
        <svg
          x="113"
          y="58.35"
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

export function TrailConnector() {
  return (
    <svg
      data-connector
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 260 140"
      className="pointer-events-none absolute left-1/2 top-[58%] z-0 hidden h-auto w-[290px] -translate-x-1/2 -translate-y-1/2 lg:block"
    >
      <defs>
        <linearGradient
          id="trail-feeder-gradient"
          x1="20"
          y1="0"
          x2="112"
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#626973" stopOpacity="0.42" />
          <stop offset="0.72" stopColor="#8b929c" stopOpacity="0.3" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0.72" />
        </linearGradient>
        <linearGradient
          id="trail-output-gradient"
          x1="140"
          y1="70"
          x2="260"
          y2="70"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#ff6a00" stopOpacity="0.72" />
          <stop offset="1" stopColor="#ff6a00" stopOpacity="0.22" />
        </linearGradient>
      </defs>

      <g
        fill="none"
        stroke="url(#trail-feeder-gradient)"
        strokeLinecap="round"
        strokeWidth="1.2"
      >
        {FEEDER_PATHS.map((path) => (
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
        stroke="url(#trail-feeder-gradient)"
        strokeDasharray="6 16"
        strokeLinecap="round"
        strokeWidth="1.6"
        className="opacity-80 motion-reduce:opacity-0"
      >
        {FEEDER_PATHS.map((path) => (
          <path key={`flow-${path}`} data-connector-flow d={path} />
        ))}
      </g>

      <path
        data-connector-output
        d="M 141 70 C 176 70, 216 70, 259 70"
        fill="none"
        pathLength="1"
        stroke="url(#trail-output-gradient)"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
      <path
        data-connector-flow-layer
        data-connector-flow
        d="M 141 70 C 176 70, 216 70, 259 70"
        fill="none"
        stroke="url(#trail-output-gradient)"
        strokeDasharray="6 16"
        strokeLinecap="round"
        strokeWidth="1.6"
        className="opacity-90 motion-reduce:opacity-0"
      />

      {OUTPUT_MARKERS.map((x, index) => (
        <rect
          key={x}
          data-connector-output-marker
          x={x - 1.6}
          y="68.4"
          width="3.2"
          height="3.2"
          rx="0.35"
          fill="#ff6a00"
          opacity={0.38 + index * 0.14}
          transform={`rotate(45 ${x} 70)`}
        />
      ))}

      <TrailNode />
    </svg>
  );
}
