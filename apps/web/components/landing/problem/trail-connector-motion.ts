import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export type ConnectorElements = {
  root: SVGSVGElement;
  origin: string;
  feederPaths: SVGPathElement[];
  outputPath: SVGPathElement;
  node: SVGGElement;
  outputMarkers: SVGGElement[];
  flowLayers: SVGElement[];
  flowPaths: SVGPathElement[];
  logo: SVGGElement;
};

export type ConnectorEntranceTiming = {
  feederDuration: number;
  feederStagger: number;
  nodeDelay: number;
  nodeFadeDuration: number;
  nodeSettleDuration: number;
  outputDelay: number;
  outputDuration: number;
  markerDelay: number;
  markerDuration: number;
  markerStagger: number;
  flowDelay: number;
  flowDuration: number;
};

export const DESKTOP_CONNECTOR_TIMING: ConnectorEntranceTiming = {
  feederDuration: 0.42,
  feederStagger: 0.035,
  nodeDelay: 0.34,
  nodeFadeDuration: 0.12,
  nodeSettleDuration: 0.3,
  outputDelay: 0.5,
  outputDuration: 0.34,
  markerDelay: 0.66,
  markerDuration: 0.22,
  markerStagger: 0.035,
  flowDelay: 0.9,
  flowDuration: 0.14,
};

export const MOBILE_CONNECTOR_TIMING: ConnectorEntranceTiming = {
  feederDuration: 0.42,
  feederStagger: 0.035,
  nodeDelay: 0.34,
  nodeFadeDuration: 0.14,
  nodeSettleDuration: 0.3,
  outputDelay: 0.52,
  outputDuration: 0.36,
  markerDelay: 0.68,
  markerDuration: 0.24,
  markerStagger: 0.035,
  flowDelay: 0.96,
  flowDuration: 0.14,
};

export function getConnector(
  section: HTMLElement,
  key: string,
): ConnectorElements | null {
  const root = section.querySelector<SVGSVGElement>(
    `[data-connector="${key}"]`,
  );
  if (!root) {
    return null;
  }

  const feederPaths = Array.from(
    root.querySelectorAll<SVGPathElement>("[data-connector-feeder]"),
  );
  const outputPath = root.querySelector<SVGPathElement>(
    "[data-connector-output]",
  );
  const node = root.querySelector<SVGGElement>("[data-connector-node]");
  const outputMarkers = Array.from(
    root.querySelectorAll<SVGGElement>("[data-connector-output-marker]"),
  );
  const flowLayers = Array.from(
    root.querySelectorAll<SVGElement>("[data-connector-flow-layer]"),
  );
  const flowPaths = Array.from(
    root.querySelectorAll<SVGPathElement>("[data-connector-flow]"),
  );
  const logo = root.querySelector<SVGGElement>("[data-connector-logo]");

  if (
    feederPaths.length === 0 ||
    !outputPath ||
    !node ||
    outputMarkers.length === 0 ||
    flowLayers.length === 0 ||
    flowPaths.length === 0 ||
    !logo
  ) {
    return null;
  }

  return {
    root,
    origin: root.dataset.nodeOrigin ?? "0 0",
    feederPaths,
    outputPath,
    node,
    outputMarkers,
    flowLayers,
    flowPaths,
    logo,
  };
}

export function createAmbientController(
  connector: ConnectorElements,
  duration: number,
  logoDuration = 0.6,
) {
  const loop = gsap.timeline({ paused: true, repeat: -1 });
  loop
    .fromTo(
      connector.flowPaths,
      { strokeDashoffset: 0 },
      { strokeDashoffset: -66, duration, ease: "none" },
      0,
    )
    .fromTo(
      connector.logo,
      { rotation: 0 },
      {
        rotation: 360,
        svgOrigin: connector.origin,
        duration: logoDuration,
        ease: "power1.inOut",
      },
      Math.max(0, duration - logoDuration - 0.2),
    );

  let isVisible = false;
  let isReady = false;
  const sync = () => {
    if (isVisible && isReady) {
      loop.play();
    } else {
      loop.pause();
    }
  };

  const visibility = ScrollTrigger.create({
    trigger: connector.root,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      isVisible = self.isActive;
      sync();
    },
  });
  isVisible = visibility.isActive;

  return {
    ready() {
      isReady = true;
      sync();
    },
  };
}

export function setConnectorStart(connector: ConnectorElements) {
  gsap.set(connector.feederPaths, {
    strokeDasharray: "1 1",
    strokeDashoffset: 1,
  });
  gsap.set(connector.node, {
    opacity: 0,
    scale: 0.86,
    svgOrigin: connector.origin,
  });
  gsap.set(connector.outputPath, {
    strokeDasharray: "1 1",
    strokeDashoffset: 1,
  });
  gsap.set(connector.outputMarkers, {
    opacity: 0,
    scale: 0.72,
    transformOrigin: "50% 50%",
  });
  gsap.set(connector.flowLayers, { opacity: 0 });
}

export function addConnectorEntrance(
  timeline: gsap.core.Timeline,
  connector: ConnectorElements,
  timing: ConnectorEntranceTiming,
  at = 0,
) {
  timeline
    .to(
      connector.feederPaths,
      {
        strokeDashoffset: 0,
        duration: timing.feederDuration,
        stagger: timing.feederStagger,
        ease: "power1.inOut",
      },
      at,
    )
    .to(
      connector.node,
      { opacity: 1, duration: timing.nodeFadeDuration, ease: "power2.out" },
      at + timing.nodeDelay,
    )
    .to(
      connector.node,
      { scale: 1, duration: timing.nodeSettleDuration, ease: "back.out(1.15)" },
      at + timing.nodeDelay,
    )
    .to(
      connector.outputPath,
      {
        strokeDashoffset: 0,
        duration: timing.outputDuration,
        ease: "power1.inOut",
      },
      at + timing.outputDelay,
    )
    .to(
      connector.outputMarkers,
      {
        opacity: 1,
        scale: 1,
        duration: timing.markerDuration,
        stagger: timing.markerStagger,
        ease: "back.out(1.15)",
      },
      at + timing.markerDelay,
    )
    .to(
      connector.flowLayers,
      { opacity: 0.85, duration: timing.flowDuration, ease: "power2.out" },
      at + timing.flowDelay,
    );
}
