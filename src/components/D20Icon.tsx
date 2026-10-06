import React from 'react';

interface D20IconProps {
  size?: number;
  className?: string;
}

export const D20Icon: React.FC<D20IconProps> = ({
  size = 22,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer Icosahedron Hexagon */}
      <polygon
        points="32,4 57,18 57,46 32,60 7,46 7,18"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      {/* Center Triangle Face */}
      <polygon
        points="32,15 48,43 16,43"
        fill="currentColor"
        fillOpacity="0.2"
        stroke="currentColor"
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      {/* Facet Edges */}
      <line x1="32" y1="4" x2="32" y2="15" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="32" y1="15" x2="57" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="32" y1="15" x2="7" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="48" y1="43" x2="57" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="48" y1="43" x2="57" y2="46" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="48" y1="43" x2="32" y2="60" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="16" y1="43" x2="7" y2="18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="16" y1="43" x2="7" y2="46" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <line x1="16" y1="43" x2="32" y2="60" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      {/* Center 20 */}
      <text
        x="32"
        y="38.5"
        textAnchor="middle"
        fill="currentColor"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontWeight="800"
        fontSize="12.5"
        letterSpacing="-0.5"
      >
        20
      </text>
    </svg>
  );
};
