import type { FC } from 'hono/jsx';

type LayoutProps = {
  title: string;
  children: any;
  nav?: any;
};

export const Layout: FC<LayoutProps> = ({ title, children, nav }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} — HL Service Manager</title>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css"
        />
        <style>{`
          :root {
            --pico-font-size: 16px;
          }
          body { min-height: 100vh; display: flex; flex-direction: column; }
          main { flex: 1; }
          .badge {
            display: inline-block;
            padding: 0.15em 0.5em;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
          }
          .badge-open { background: #dbeafe; color: #1d4ed8; }
          .badge-in_progress { background: #fef3c7; color: #92400e; }
          .badge-waiting { background: #f3e8ff; color: #7c3aed; }
          .badge-closed { background: #d1fae5; color: #065f46; }
          .badge-low { background: #f1f5f9; color: #475569; }
          .badge-normal { background: #dbeafe; color: #1d4ed8; }
          .badge-high { background: #fee2e2; color: #991b1b; }
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
          .stat-card { text-align: center; padding: 1rem; border-radius: 8px; background: var(--pico-card-background-color); border: 1px solid var(--pico-muted-border-color); }
          .stat-card h2 { margin: 0; font-size: 2rem; }
          .stat-card p { margin: 0; color: var(--pico-muted-color); }
          .comment { padding: 1rem; margin-bottom: 0.5rem; border-radius: 8px; background: var(--pico-card-background-color); border: 1px solid var(--pico-muted-border-color); }
          .comment-meta { font-size: 0.85em; color: var(--pico-muted-color); margin-bottom: 0.5rem; }
          .comment-admin { border-left: 3px solid var(--pico-primary); }
          .flash { padding: 0.75rem 1rem; border-radius: 6px; margin-bottom: 1rem; }
          .flash-success { background: #d1fae5; color: #065f46; }
          .flash-error { background: #fee2e2; color: #991b1b; }
          .hero { text-align: center; padding: 3rem 1rem; }
          .hero h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
          .hero p { font-size: 1.2rem; color: var(--pico-muted-color); }
          nav .brand { font-weight: 700; font-size: 1.1rem; text-decoration: none; }
        `}</style>
      </head>
      <body>
        <nav class="container-fluid">
          <ul>
            <li>
              <a href="/" class="brand">HL Service Manager</a>
            </li>
          </ul>
          {nav && <ul>{nav}</ul>}
        </nav>
        <main class="container">{children}</main>
        <footer class="container">
          <small style="color: var(--pico-muted-color);">
            HL Service Manager
          </small>
        </footer>
      </body>
    </html>
  );
};
