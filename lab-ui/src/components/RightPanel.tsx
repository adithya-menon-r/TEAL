import React, { useEffect, useState, useRef } from 'react';
import { LabInfo, FileItem } from '../types';
import {
  Folder,
  File,
  FileCode,
  FileText,
  FileArchive,
  FileSpreadsheet,
  FileJson,
  FileTerminal,
  Download,
  RefreshCw,
  Home,
  ChevronRight,
  AlertTriangle,
  Power,
} from 'lucide-react';

interface RightPanelProps {
  labInfo: LabInfo;
  open: boolean;
  isNarrow: boolean;
  onClose: () => void;
  onTriggerEnd: () => void;
}

const getFileIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (
    lower.endsWith('.zip') ||
    lower.endsWith('.tar.gz') ||
    lower.endsWith('.tar') ||
    lower.endsWith('.gz') ||
    lower.endsWith('.sec') ||
    lower.endsWith('.key')
  ) {
    return <FileArchive size={15} style={{ color: 'var(--accent-ink)', flexShrink: 0 }} />;
  }
  if (lower.endsWith('.json')) {
    return <FileJson size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />;
  }
  if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
    return <FileSpreadsheet size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />;
  }
  if (lower.endsWith('.sh') || lower.endsWith('.bash') || lower.endsWith('.zsh')) {
    return <FileTerminal size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />;
  }
  if (
    lower.endsWith('.hs') ||
    lower.endsWith('.py') ||
    lower.endsWith('.js') ||
    lower.endsWith('.ts') ||
    lower.endsWith('.c') ||
    lower.endsWith('.cpp') ||
    lower.endsWith('.rs') ||
    lower.endsWith('.go') ||
    lower === 'makefile'
  ) {
    return <FileCode size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />;
  }
  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    lower.endsWith('.log') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.crt') ||
    lower.endsWith('.pem')
  ) {
    return <FileText size={15} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />;
  }
  return <File size={15} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />;
};

export const RightPanel: React.FC<RightPanelProps> = ({ labInfo, open, isNarrow, onClose, onTriggerEnd }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const breadcrumbRef = useRef<HTMLDivElement>(null);

  const fetchFiles = async (path: string = '') => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = path ? `/__teal/files/${path}` : '/__teal/files';
      const res = await fetch(endpoint);
      if (!res.ok) {
        throw new Error(`Failed to load directory (HTTP ${res.status})`);
      }
      const data = await res.json();
      setCurrentPath(data.path || '');
      setItems(data.items || []);
    } catch (err: any) {
      setError(err.message || 'Error fetching files');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles('');
  }, []);

  // Auto-scroll breadcrumbs container to active folder on navigation
  useEffect(() => {
    if (breadcrumbRef.current) {
      breadcrumbRef.current.scrollLeft = breadcrumbRef.current.scrollWidth;
    }
  }, [currentPath]);

  const navigateTo = (folderName: string) => {
    const next = currentPath ? `${currentPath}/${folderName}` : folderName;
    fetchFiles(next);
  };

  const formatSize = (bytes: number | null): string => {
    if (bytes === null) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pathParts = currentPath ? currentPath.split('/') : [];

  const asideClass = [
    'lab-sidebar',
    isNarrow ? 'lab-sidebar--drawer' : 'lab-sidebar--inline',
    isNarrow && open ? 'is-open' : '',
  ].join(' ');

  return (
    <>
    {isNarrow && (
      <div
        className={`lab-backdrop${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
    )}
    <aside
      id="lab-sidebar"
      className={asideClass}
      aria-label="Lab sidebar"
      {...(isNarrow && !open ? { 'aria-hidden': true, inert: '' as any } : {})}
      style={{
        background: 'var(--card)',
        boxShadow: '-1px 0 0 0 rgb(23 43 42 / 0.02)',
        ...(isNarrow ? {} : { height: 'calc(100vh - var(--topbar-height))', zIndex: 40 }),
      }}
    >
      {/* 1. Lab Name Header (with line below it, no subtext) */}
      <div
        style={{
          padding: '16px 18px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--card)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <h2
          style={{
            fontSize: '0.95rem',
            fontWeight: 700,
            color: 'var(--foreground)',
            letterSpacing: '-0.01em',
            margin: 0,
            lineHeight: 1.35,
            fontFamily: 'var(--font-heading)',
            minWidth: 0,
            overflowWrap: 'anywhere',
          }}
        >
          {labInfo.name || 'Your course lab'}
        </h2>
        {isNarrow && (
          <button
            className="btn btn-destructive-outline"
            onClick={onTriggerEnd}
            title="End this lab session"
            id="btn-end-lab-sidebar"
            style={{ height: '32px', padding: '0 12px', flexShrink: 0 }}
          >
            <Power size={14} />
            <span>End Lab</span>
          </button>
        )}
      </div>

      {/* 2. File Explorer Toolbar & Breadcrumb */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--popover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          gap: '8px',
        }}
      >
        {/* Breadcrumb Trail with pinned Home button and scrollable subpath */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '0.75rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--muted-foreground)',
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
          }}
          title={currentPath ? `/home/student/${currentPath}` : '/home/student'}
        >
          {/* Always-visible Home button */}
          <button
            onClick={() => currentPath && fetchFiles('')}
            title="/home/student (Home)"
            style={{
              background: 'none',
              border: 'none',
              padding: '2px',
              display: 'inline-flex',
              alignItems: 'center',
              cursor: currentPath ? 'pointer' : 'default',
              color: currentPath ? 'var(--primary)' : 'var(--foreground)',
              flexShrink: 0,
            }}
          >
            <Home size={13} />
          </button>

          {/* Scrollable subpath segments */}
          {pathParts.length > 0 && (
            <div
              ref={breadcrumbRef}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                scrollbarWidth: 'none',
                minWidth: 0,
              }}
            >
              {pathParts.map((part, idx) => (
                <React.Fragment key={idx}>
                  <ChevronRight size={10} style={{ opacity: 0.5, flexShrink: 0 }} />
                  <span
                    onClick={() => {
                      if (idx < pathParts.length - 1) {
                        fetchFiles(pathParts.slice(0, idx + 1).join('/'));
                      }
                    }}
                    style={{
                      cursor: idx < pathParts.length - 1 ? 'pointer' : 'default',
                      color: idx === pathParts.length - 1 ? 'var(--foreground)' : 'var(--primary-ink)',
                      fontWeight: idx === pathParts.length - 1 ? 600 : 500,
                      flexShrink: 0,
                    }}
                  >
                    {part}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Action icons: Refresh, Download Archive (ZIP & Download icon) - UP button removed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
          <button
            onClick={() => fetchFiles(currentPath)}
            title="Refresh directory"
            className="btn btn-outline"
            style={{
              padding: '4px 6px',
              height: '24px',
              fontSize: '0.7rem',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : undefined} />
          </button>

          <a
            href="/__teal/files?archive=1"
            download="home.tar.gz"
            title="Download all files as archive (.tar.gz / ZIP)"
            className="btn btn-outline"
            style={{
              padding: '3px 6px',
              height: '24px',
              fontSize: '0.7rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              textDecoration: 'none',
              color: 'var(--primary-ink)',
            }}
          >
            <FileArchive size={12} />
            <Download size={11} />
          </a>
        </div>
      </div>

      {/* 3. Files List (Fills all remaining sidebar space) */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px 6px',
        }}
      >
        {error && (
          <div
            style={{
              color: 'var(--danger)',
              padding: '16px 12px',
              textAlign: 'center',
              fontSize: '0.8rem',
            }}
          >
            {error}
          </div>
        )}

        {loading && items.length === 0 ? (
          <div
            style={{
              color: 'var(--muted-foreground)',
              padding: '30px 16px',
              textAlign: 'center',
              fontSize: '0.8rem',
            }}
          >
            Loading files...
          </div>
        ) : error ? null : items.length === 0 ? (
          <div
            style={{
              color: 'var(--muted-foreground)',
              padding: '30px 16px',
              textAlign: 'center',
              fontSize: '0.8rem',
              fontStyle: 'italic',
            }}
          >
            Folder is empty
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {items.map((item, idx) => {
              const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
              const downloadUrl = `/__teal/files/${itemPath}`;

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.8125rem',
                    transition: 'background 0.12s ease',
                    cursor: item.isDir ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                  className="file-item-row"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 7%, transparent)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                  onClick={() => {
                    if (item.isDir) navigateTo(item.name);
                  }}
                >
                  {/* Left: Icon & Name */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      overflow: 'hidden',
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {item.isDir ? (
                      <Folder size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    ) : (
                      getFileIcon(item.name)
                    )}

                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontWeight: item.isDir ? 600 : 400,
                        color: item.isDir ? 'var(--primary-ink)' : 'var(--foreground)',
                      }}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                  </div>

                  {/* Right: File Size & Download Action */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexShrink: 0,
                      marginLeft: '8px',
                    }}
                  >
                    {!item.isDir && item.size !== null && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--muted-foreground)',
                        }}
                      >
                        {formatSize(item.size)}
                      </span>
                    )}

                    {!item.isDir && (
                      <a
                        href={downloadUrl}
                        download={item.name}
                        onClick={(e) => e.stopPropagation()}
                        title={`Download ${item.name}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '22px',
                          height: '22px',
                          borderRadius: '4px',
                          color: 'var(--muted-foreground)',
                          transition: 'color 0.15s, background 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--primary-ink)';
                          e.currentTarget.style.background = 'var(--primary-soft)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--muted-foreground)';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Download size={13} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* 4. Bottom Warning Notice (lowkey & centered) */}
      <div
        style={{
          marginTop: 'auto',
          borderTop: '1px solid var(--border)',
          background: 'var(--popover)',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          fontSize: '0.74rem',
          color: 'var(--muted-foreground)',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        <AlertTriangle size={13} style={{ color: 'var(--warning)', flexShrink: 0 }} />
        <span>Files deleted when lab ends</span>
      </div>
    </aside>
    </>
  );
};
