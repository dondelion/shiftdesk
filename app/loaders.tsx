"use client";

/**
 * Shared SVG filter defs — render once at the top of <body>.
 * Required by LavaLoader (uses #goo2 + #vialClip).
 */
export function LoaderDefs() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="ol-goo2">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 24 -12" />
        </filter>
        <clipPath id="ol-vialClip">
          <rect x="60" y="20" width="80" height="160" rx="40" />
        </clipPath>
      </defs>
    </svg>
  );
}

/**
 * Loader 04 — Lava Lamp
 * Three blobs rise through a pill-shaped vial, fused by a gooey SVG filter.
 * Color inherits from the current CSS `--ink` token via `currentColor`.
 * Default size 96 px; pass `size` to override.
 */
export function LavaLoader({ size = 96, label = "Loading" }: { size?: number; label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="lava-loader-wrap"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        aria-hidden="true"
      >
        <g filter="url(#ol-goo2)" clipPath="url(#ol-vialClip)">
          {/* blob 1 */}
          <circle cx="100" cy="180" r="18" fill="currentColor">
            <animate attributeName="cy" values="180;20;180" dur="5.5s" repeatCount="indefinite" />
            <animate attributeName="cx" values="100;112;92;100" dur="5.5s" repeatCount="indefinite" />
            <animate attributeName="r"  values="18;22;14;18"   dur="5.5s" repeatCount="indefinite" />
          </circle>
          {/* blob 2 */}
          <circle cx="100" cy="180" r="14" fill="currentColor">
            <animate attributeName="cy" values="180;20;180" dur="5.5s" begin="-2s" repeatCount="indefinite" />
            <animate attributeName="cx" values="100;88;108;100" dur="5.5s" begin="-2s" repeatCount="indefinite" />
            <animate attributeName="r"  values="14;20;16;14"   dur="5.5s" begin="-2s" repeatCount="indefinite" />
          </circle>
          {/* blob 3 */}
          <circle cx="100" cy="180" r="16" fill="currentColor">
            <animate attributeName="cy" values="180;20;180" dur="5.5s" begin="-3.6s" repeatCount="indefinite" />
            <animate attributeName="cx" values="100;104;96;100" dur="5.5s" begin="-3.6s" repeatCount="indefinite" />
            <animate attributeName="r"  values="16;22;12;16"   dur="5.5s" begin="-3.6s" repeatCount="indefinite" />
          </circle>
          {/* base pool */}
          <ellipse cx="100" cy="186" rx="36" ry="10" fill="currentColor" />
        </g>
      </svg>
    </div>
  );
}
