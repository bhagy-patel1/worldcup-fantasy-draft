import { flagUrl, NATION_FLAGS } from '../constants/formations';

/**
 * Renders a nation flag as an <img> from flagcdn.com.
 * Falls back to the emoji character if image fails to load.
 */
export default function FlagImg({ nation, size = 24, className = '', style = {} }) {
  const src = flagUrl(nation, size <= 20 ? 20 : size <= 32 ? 32 : 48);
  const emoji = NATION_FLAGS[nation] || '🌍';

  if (!src) {
    return <span style={{ fontSize: size * 0.75, lineHeight: 1, ...style }} className={className}>{emoji}</span>;
  }

  return (
    <img
      src={src}
      alt={nation}
      width={size}
      height={Math.round(size * 0.75)}
      style={{
        display: 'inline-block',
        objectFit: 'cover',
        borderRadius: '2px',
        flexShrink: 0,
        ...style,
      }}
      className={className}
      onError={(e) => {
        // fallback: hide img and show emoji via a sibling span trick
        e.currentTarget.style.display = 'none';
        const span = document.createElement('span');
        span.textContent = emoji;
        span.style.fontSize = `${size * 0.75}px`;
        e.currentTarget.parentNode?.insertBefore(span, e.currentTarget.nextSibling);
      }}
    />
  );
}
