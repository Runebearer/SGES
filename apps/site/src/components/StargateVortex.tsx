import { useId } from 'react';
import type { CSSProperties } from 'react';

type StargateVortexProps = {
  /** Taille en pixels. Par défaut, le SVG remplit son conteneur (100%). */
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Faux vortex 3D façon TRON : grilles filaires en contre-rotation et
 * anneaux de pulse partant du centre, façon effet « tunnel » de fausse 3D
 * années 90 / début 2000.
 *
 * Composant autonome, indépendant de StargateRing : il se suffit à
 * lui-même (son propre SVG, defs et animations) et peut être superposé
 * n'importe où, par exemple au centre de l'anneau Stargate.
 */
export default function StargateVortex({ size, className, style }: StargateVortexProps) {
  const dimension = size != null ? `${size}px` : '100%';
  const uid = useId();
  const clipId = `vortex-clip-${uid}`;
  const coreId = `vortex-core-${uid}`;

  return (
    <>
      <svg
        className={['stargate-vortex', className].filter(Boolean).join(' ')}
        viewBox="-15 -15 430 430"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ width: dimension, height: dimension, ...style }}
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="200" cy="200" r="200" />
          </clipPath>
          <radialGradient id={coreId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#eafcff" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#00d2ff" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#00d2ff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          <circle className="vortex-bg" cx="200" cy="200" r="200" />

          <g className="vortex-grid">
            {Array.from({ length: 16 }).map((_, i) => (
              <line
                key={i}
                x1="200"
                y1="200"
                x2="200"
                y2="0"
                transform={`rotate(${i * 22.5} 200 200)`}
              />
            ))}
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 200 200"
              to="360 200 200"
              dur="50s"
              repeatCount="indefinite"
            />
          </g>

          <g className="vortex-grid vortex-grid--alt">
            {Array.from({ length: 10 }).map((_, i) => (
              <line
                key={i}
                x1="200"
                y1="200"
                x2="200"
                y2="24"
                transform={`rotate(${i * 36} 200 200)`}
              />
            ))}
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="360 200 200"
              to="0 200 200"
              dur="70s"
              repeatCount="indefinite"
            />
          </g>

          {Array.from({ length: 5 }).map((_, i) => (
            <circle key={i} className="vortex-ring" cx="200" cy="200" r="0">
              <animate
                attributeName="r"
                values="0;200"
                dur="3s"
                begin={`${i * 0.6}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0;0.7;0"
                keyTimes="0;0.1;1"
                dur="3s"
                begin={`${i * 0.6}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-width"
                values="5;0.5"
                dur="3s"
                begin={`${i * 0.6}s`}
                repeatCount="indefinite"
              />
            </circle>
          ))}

          <circle className="vortex-core" cx="200" cy="200" r="200" fill={`url(#${coreId})`} />
        </g>
      </svg>

      <style jsx>{`
        .stargate-vortex {
          overflow: visible;
        }

        .vortex-bg {
          fill: #020814;
        }

        .vortex-grid line {
          stroke: var(--cyan, #00d2ff);
          stroke-width: 1;
          opacity: 0.2;
        }

        .vortex-grid--alt line {
          stroke: var(--violet, #a855f7);
          stroke-width: 1;
          opacity: 0.14;
        }

        .vortex-ring {
          fill: none;
          stroke: var(--cyan, #00d2ff);
          filter: drop-shadow(0 0 6px var(--cyan, #00d2ff));
        }

        .vortex-core {
          animation: vortexCorePulse 4s ease-in-out infinite;
        }

        @keyframes vortexCorePulse {
          0%,
          100% {
            opacity: 0.5;
          }
          50% {
            opacity: 0.9;
          }
        }
      `}</style>
    </>
  );
}
