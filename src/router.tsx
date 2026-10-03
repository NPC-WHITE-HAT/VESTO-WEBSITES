import { useEffect, useState } from 'react';

export interface Route {
  path: string;
  params: Record<string, string>;
}

function parseHash(): Route {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [path, query = ''] = raw.split('?');
  const params: Record<string, string> = {};
  new URLSearchParams(query).forEach((v, k) => {
    params[k] = v;
  });
  return { path, params };
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(parseHash);

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash());
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

export function navigate(path: string) {
  window.location.hash = path;
}

export function Link({
  to,
  children,
  className,
  style,
  onClick,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}) {
  return (
    <a
      href={`#${to}`}
      className={className}
      style={style}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
        onClick?.();
      }}
    >
      {children}
    </a>
  );
}
