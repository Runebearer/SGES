import type { CSSProperties } from 'react';

type StargateRingProps = {
  /** Taille en pixels. Par défaut, le SVG remplit son conteneur (100%). */
  size?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Anneau « Stargate » : deux cercles (anneau extérieur en arcs + cercle
 * intérieur) ornés de chevrons triangulaires, en rotation infinie.
 *
 * Les couleurs s'appuient sur les variables CSS globales (--cyan, --deep-blue)
 * avec des valeurs de repli pour un usage autonome.
 */
export default function StargateRing({ size, className, style }: StargateRingProps) {
  const dimension = size != null ? `${size}px` : '100%';

  return (
    <>
      <svg
        className={['stargate-ring', className].filter(Boolean).join(' ')}
        viewBox="-20 -20 540 540"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ width: dimension, height: dimension, ...style }}
      >
        <circle className="inner-circle" cx="250" cy="250" r="220" />

        <path d="M 250.00 -2.00 A 252 252 0 0 1 376.00 31.76" />
        <path d="M 411.98 56.96 A 252 252 0 0 1 486.80 163.81" />
        <path d="M 498.17 206.24 A 252 252 0 0 1 486.80 336.19" />
        <path d="M 468.24 376.00 A 252 252 0 0 1 376.00 468.24" />
        <path d="M 336.19 486.80 A 252 252 0 0 1 206.24 498.17" />
        <path d="M 163.81 486.80 A 252 252 0 0 1 56.96 411.98" />
        <path d="M 31.76 376.00 A 252 252 0 0 1 -2.00 250.00" />
        <path d="M 1.83 206.24 A 252 252 0 0 1 56.96 88.02" />
        <path d="M 88.02 56.96 A 252 252 0 0 1 206.24 1.83" />

        <polygon points="379.63,64.87 407.32,52.52 381.76,34.63" />
        <polygon points="468.30,191.51 497.45,199.85 489.38,169.71" />
        <polygon points="454.83,345.51 471.80,370.64 484.98,342.36" />
        <polygon points="345.51,454.83 342.36,484.98 370.64,471.80" />
        <polygon points="191.51,468.30 169.71,489.38 199.85,497.45" />
        <polygon points="64.87,379.63 34.63,381.76 52.52,407.32" />
        <polygon points="24.86,230.30 0.32,212.50 -2.40,243.58" />
        <polygon points="90.19,90.19 82.84,60.78 60.78,82.84" />
        <polygon points="230.30,24.86 243.58,-2.40 212.50,0.32" />

        <polygon className="glow-tri" points="387.08,54.22 400.93,48.05 388.15,39.10" />
        <polygon className="glow-tri" points="480.86,188.14 495.43,192.31 491.39,177.24" />
        <polygon className="glow-tri" points="466.61,351.01 475.09,363.57 481.69,349.43" />
        <polygon className="glow-tri" points="351.01,466.61 349.43,481.69 363.57,475.09" />
        <polygon className="glow-tri" points="188.14,480.86 177.24,491.39 192.31,495.43" />
        <polygon className="glow-tri" points="54.22,387.08 39.10,388.15 48.05,400.93" />
        <polygon className="glow-tri" points="11.91,229.17 -0.36,220.27 -1.72,235.81" />
        <polygon className="glow-tri" points="81.00,81.00 77.32,66.29 66.29,77.32" />
        <polygon className="glow-tri" points="229.17,11.91 235.81,-1.72 220.27,-0.36" />
      </svg>

      <style jsx>{`
        .stargate-ring {
          transform-origin: 50% 50%;
          overflow: visible;
          animation: rotateGate 180s linear infinite;
        }

        .stargate-ring path {
          fill: none;
          stroke: var(--cyan, #00d2ff);
          stroke-width: 6;
          stroke-linecap: round;
          opacity: 0.18;
        }

        .stargate-ring .inner-circle {
          fill: none;
          stroke: var(--cyan, #00d2ff);
          stroke-width: 2;
          opacity: 0.12;
        }

        .stargate-ring polygon {
          fill: var(--deep-blue, #1e3a8a);
          opacity: 0.35;
        }

        .stargate-ring .glow-tri {
          fill: #5b8aed;
          opacity: 0.8;
          filter: drop-shadow(0 0 4px #5b8aed);
        }

        @keyframes rotateGate {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .stargate-ring {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}
