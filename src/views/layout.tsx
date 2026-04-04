import type { FC } from 'hono/jsx';

type LayoutProps = {
  title: string;
  children: any;
  nav?: any;
  activeRoute?: string;
};

export const Layout: FC<LayoutProps> = ({ title, children, nav, activeRoute }) => {
  const hasNav = !!nav;

  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{title} — HL Service Manager</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          :root {
            --bg: #f8fafc;
            --surface: #ffffff;
            --border: #e2e8f0;
            --border-light: #f1f5f9;
            --text: #0f172a;
            --text-secondary: #64748b;
            --text-muted: #94a3b8;
            --accent: #3b82f6;
            --accent-hover: #2563eb;
            --accent-light: #eff6ff;
            --success: #10b981;
            --success-light: #ecfdf5;
            --warning: #f59e0b;
            --warning-light: #fffbeb;
            --danger: #ef4444;
            --danger-light: #fef2f2;
            --purple: #8b5cf6;
            --purple-light: #f5f3ff;
            --radius: 10px;
            --radius-lg: 14px;
            --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
            --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
            --shadow-md: 0 4px 6px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.03);
            --nav-width: 240px;
          }

          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            min-height: 100vh;
            font-size: 14px;
            -webkit-font-smoothing: antialiased;
          }

          /* ---- Shell layout ---- */
          .shell { display: flex; min-height: 100vh; }
          .shell-nav {
            width: var(--nav-width);
            background: var(--surface);
            border-right: 1px solid var(--border);
            padding: 1.5rem 0;
            position: fixed;
            top: 0; left: 0; bottom: 0;
            overflow-y: auto;
            z-index: 10;
          }
          .shell-main {
            flex: 1;
            margin-left: var(--nav-width);
            padding: 2rem 2.5rem;
            max-width: 1100px;
          }
          .shell-full { padding: 0; }

          /* ---- Nav ---- */
          .nav-brand {
            padding: 0 1.25rem 1.25rem;
            border-bottom: 1px solid var(--border);
            margin-bottom: 0.75rem;
          }
          .nav-brand a {
            font-weight: 700;
            font-size: 1rem;
            color: var(--text);
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .nav-brand-icon {
            width: 28px; height: 28px;
            background: var(--accent);
            border-radius: 7px;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: 13px;
          }
          .nav-section { padding: 0 0.75rem; margin-bottom: 0.25rem; }
          .nav-section-label {
            font-size: 0.7rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-muted);
            padding: 0.5rem 0.5rem 0.25rem;
          }
          .nav-link {
            display: flex; align-items: center; gap: 0.5rem;
            padding: 0.5rem 0.75rem;
            border-radius: 7px;
            color: var(--text-secondary);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.15s;
          }
          .nav-link:hover { background: var(--bg); color: var(--text); }
          .nav-link.active { background: var(--accent-light); color: var(--accent); }
          .nav-link svg { width: 18px; height: 18px; flex-shrink: 0; }
          .nav-footer {
            padding: 0.75rem;
            border-top: 1px solid var(--border);
            margin-top: auto;
            position: absolute;
            bottom: 0; left: 0; right: 0;
            background: var(--surface);
          }
          .nav-footer form { margin: 0; }
          .nav-footer button {
            width: 100%;
            background: none;
            border: 1px solid var(--border);
            padding: 0.5rem;
            border-radius: 7px;
            color: var(--text-secondary);
            font-size: 0.8rem;
            cursor: pointer;
            font-weight: 500;
          }
          .nav-footer button:hover { background: var(--bg); color: var(--text); }

          /* ---- Topbar for no-nav pages ---- */
          .topbar {
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            padding: 1rem 2rem;
            display: flex; align-items: center; justify-content: space-between;
          }
          .topbar-brand { font-weight: 700; font-size: 1rem; color: var(--text); text-decoration: none; display: flex; align-items: center; gap: 0.5rem; }

          /* ---- Typography ---- */
          h1 { font-size: 1.75rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }
          h2 { font-size: 1.375rem; font-weight: 700; line-height: 1.3; margin-bottom: 0.5rem; }
          h3 { font-size: 1.125rem; font-weight: 600; line-height: 1.4; margin-bottom: 0.5rem; }
          h4 { font-size: 1rem; font-weight: 600; margin-bottom: 0.5rem; }
          h5 { font-size: 0.875rem; font-weight: 600; margin-bottom: 0.25rem; }
          p { margin-bottom: 0.75rem; color: var(--text-secondary); }
          a { color: var(--accent); text-decoration: none; }
          a:hover { color: var(--accent-hover); }
          small { font-size: 0.8rem; color: var(--text-muted); }
          code { background: var(--bg); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.85em; }
          hr { border: none; border-top: 1px solid var(--border); margin: 1.5rem 0; }

          /* ---- Page header ---- */
          .page-header { margin-bottom: 1.5rem; }
          .page-header p { margin-bottom: 0; }
          .page-actions { display: flex; gap: 0.5rem; margin-top: 0.75rem; }

          /* ---- Cards ---- */
          .card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            padding: 1.5rem;
            margin-bottom: 1rem;
            box-shadow: var(--shadow-sm);
          }
          .card-header { margin-bottom: 1rem; }
          .card-header h3 { margin-bottom: 0.25rem; }
          .card-header h4 { margin-bottom: 0.25rem; }

          /* ---- Stats ---- */
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem; }
          .stat-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 1rem 1.25rem;
            box-shadow: var(--shadow-sm);
          }
          .stat-card .stat-value { font-size: 1.75rem; font-weight: 700; color: var(--text); line-height: 1; }
          .stat-card .stat-label { font-size: 0.75rem; font-weight: 500; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.25rem; }

          /* ---- Badges ---- */
          .badge {
            display: inline-flex; align-items: center;
            padding: 0.2em 0.6em;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            line-height: 1;
          }
          .badge-open { background: #dbeafe; color: #1d4ed8; }
          .badge-in_progress { background: #fef3c7; color: #92400e; }
          .badge-waiting { background: #f5f3ff; color: #7c3aed; }
          .badge-closed { background: #dcfce7; color: #166534; }
          .badge-low { background: #f1f5f9; color: #475569; }
          .badge-normal { background: #dbeafe; color: #1d4ed8; }
          .badge-high { background: #fee2e2; color: #991b1b; }

          /* ---- Buttons ---- */
          .btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
            padding: 0.55rem 1rem;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            border: none;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.15s;
            line-height: 1.4;
            font-family: inherit;
          }
          .btn-primary { background: var(--accent); color: white; }
          .btn-primary:hover { background: var(--accent-hover); color: white; }
          .btn-outline { background: var(--surface); color: var(--text-secondary); border: 1px solid var(--border); }
          .btn-outline:hover { background: var(--bg); color: var(--text); border-color: var(--text-muted); }
          .btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
          .btn-danger { background: var(--danger-light); color: var(--danger); border: 1px solid #fecaca; }
          .btn-danger:hover { background: #fee2e2; }
          .btn:disabled { opacity: 0.4; cursor: not-allowed; }

          /* ---- Forms ---- */
          label { display: block; margin-bottom: 1rem; font-size: 0.875rem; font-weight: 500; color: var(--text); }
          label small { display: block; margin-top: 0.25rem; font-weight: 400; }
          input[type="text"], input[type="email"], input[type="password"], input[type="url"],
          select, textarea {
            width: 100%;
            padding: 0.6rem 0.75rem;
            border: 1px solid var(--border);
            border-radius: 8px;
            font-size: 0.875rem;
            font-family: inherit;
            color: var(--text);
            background: var(--surface);
            margin-top: 0.35rem;
            transition: border-color 0.15s, box-shadow 0.15s;
            outline: none;
          }
          input:focus, select:focus, textarea:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
          }
          textarea { resize: vertical; min-height: 80px; }
          select { appearance: auto; }

          /* ---- Table ---- */
          .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
          table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
          thead { background: var(--bg); }
          th { text-align: left; padding: 0.65rem 1rem; font-weight: 600; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); border-bottom: 1px solid var(--border); white-space: nowrap; }
          td { padding: 0.7rem 1rem; border-bottom: 1px solid var(--border-light); color: var(--text-secondary); }
          tr:last-child td { border-bottom: none; }
          tr:hover td { background: var(--bg); }
          td a { font-weight: 500; }

          /* ---- Flash ---- */
          .flash {
            padding: 0.7rem 1rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            font-weight: 500;
            display: flex; align-items: center; gap: 0.5rem;
          }
          .flash-success { background: var(--success-light); color: #065f46; border: 1px solid #a7f3d0; }
          .flash-error { background: var(--danger-light); color: #991b1b; border: 1px solid #fecaca; }

          /* ---- Comments ---- */
          .comment {
            padding: 1rem;
            margin-bottom: 0.5rem;
            border-radius: var(--radius);
            background: var(--bg);
            border: 1px solid var(--border-light);
          }
          .comment-meta { font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.4rem; display: flex; align-items: center; gap: 0.5rem; }
          .comment-meta strong { color: var(--text); }
          .comment-admin { background: var(--accent-light); border-color: #bfdbfe; }
          .comment p { margin: 0; color: var(--text); font-size: 0.875rem; }

          /* ---- Hero (login pages) ---- */
          .hero-page {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg);
          }
          .hero-card {
            width: 100%;
            max-width: 400px;
            padding: 2.5rem;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
          }
          .hero-logo {
            display: flex; align-items: center; gap: 0.6rem;
            margin-bottom: 1.75rem; justify-content: center;
          }
          .hero-logo-icon {
            width: 36px; height: 36px;
            background: var(--accent);
            border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            color: white; font-weight: 700; font-size: 16px;
          }
          .hero-logo span { font-weight: 700; font-size: 1.1rem; }

          /* ---- Filter pills ---- */
          .filters { display: flex; gap: 0.35rem; margin-bottom: 1rem; flex-wrap: wrap; }
          .filter-pill {
            padding: 0.35rem 0.85rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            background: var(--surface);
            color: var(--text-secondary);
            border: 1px solid var(--border);
            text-decoration: none;
            transition: all 0.15s;
          }
          .filter-pill:hover { border-color: var(--accent); color: var(--accent); }
          .filter-pill.active { background: var(--accent); color: white; border-color: var(--accent); }

          /* ---- Steps ---- */
          .step {
            padding: 1.25rem;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            margin-bottom: 0.75rem;
            transition: opacity 0.15s;
          }
          .step.done { opacity: 0.55; }
          .step.locked { opacity: 0.35; }
          .step-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
          .step-num {
            width: 24px; height: 24px;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            font-size: 0.75rem; font-weight: 700;
            background: var(--border); color: var(--text-muted);
          }
          .step-num.complete { background: var(--success); color: white; }

          /* ---- Grid helpers ---- */
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
          .flex-row { display: flex; align-items: center; gap: 0.5rem; }
          .flex-wrap { flex-wrap: wrap; }
          .gap-sm { gap: 0.35rem; }
          .mb-0 { margin-bottom: 0; }
          .mb-1 { margin-bottom: 0.75rem; }
          .mt-1 { margin-top: 0.75rem; }

          /* ---- Back link ---- */
          .back-link { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem; }
          .back-link:hover { color: var(--accent); }

          /* ---- Responsive ---- */
          @media (max-width: 768px) {
            .shell-nav { display: none; }
            .shell-main { margin-left: 0; padding: 1rem; }
            .grid-2 { grid-template-columns: 1fr; }
            .stats { grid-template-columns: repeat(2, 1fr); }
          }
        `}</style>
      </head>
      <body>
        {hasNav ? (
          <div class="shell">
            <aside class="shell-nav">
              <div class="nav-brand">
                <a href="/">
                  <span class="nav-brand-icon">HL</span>
                  Service Manager
                </a>
              </div>
              {nav}
            </aside>
            <div class="shell-main">{children}</div>
          </div>
        ) : (
          <>
            {children}
          </>
        )}
      </body>
    </html>
  );
};
