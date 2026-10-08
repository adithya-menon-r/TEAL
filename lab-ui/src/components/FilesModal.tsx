import React, { useEffect, useState } from 'react';
import { FileItem } from '../types';
import {
  X,
  Folder,
  File,
  Download,
  Archive,
  RefreshCw,
  FolderOpen,
  ChevronRight,
  ArrowUp,
  FileCode,
  FileText,
} from 'lucide-react';

interface FilesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FilesModal: React.FC<FilesModalProps> = ({ isOpen, onClose }) => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles(currentPath);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const navigateTo = (folderName: string) => {
    const next = currentPath ? `${currentPath}/${folderName}` : folderName;
    fetchFiles(next);
  };

  const navigateUp = () => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    fetchFiles(parts.join('/'));
  };

  const formatSize = (bytes: number | null): string => {
    if (bytes === null) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const pathBreadcrumbs = currentPath ? currentPath.split('/') : [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(23, 43, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="files-modal-title"
        style={{
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '780px',
          height: '600px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.18s ease-out',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--card)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderOpen size={20} style={{ color: 'var(--primary)' }} />
            <div>
              <h2
                id="files-modal-title"
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: 'var(--foreground)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                Files & Downloads
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>
                Files in{' '}
                <code style={{ fontFamily: 'var(--font-mono)' }}>/home/student</code>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <a
              href="/__teal/files?archive=1"
              download="home.tar.gz"
              className="btn btn-primary"
              title="Download entire home directory as a compressed archive"
              style={{ textDecoration: 'none' }}
              id="btn-download-tar"
            >
              <Archive size={14} />
              <span>Download home.tar.gz</span>
            </a>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted-foreground)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                borderRadius: '4px',
              }}
              aria-label="Close files modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Path Bar & Actions */}
        <div
          style={{
            padding: '10px 20px',
            background: 'var(--background)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
            <button
              onClick={() => fetchFiles('')}
              style={{
                background: 'none',
                border: 'none',
                color: currentPath ? 'var(--primary-ink)' : 'var(--foreground)',
                cursor: 'pointer',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
              }}
            >
              /home/student
            </button>
            {pathBreadcrumbs.map((crumb, idx) => {
              const fullCrumbPath = pathBreadcrumbs.slice(0, idx + 1).join('/');
              const isLast = idx === pathBreadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  <ChevronRight size={13} style={{ color: 'var(--muted-foreground)' }} />
                  <button
                    onClick={() => fetchFiles(fullCrumbPath)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isLast ? 'var(--foreground)' : 'var(--primary-ink)',
                      cursor: 'pointer',
                      fontWeight: isLast ? 600 : 400,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {crumb}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {currentPath && (
              <button
                className="btn btn-outline"
                onClick={navigateUp}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                title="Go up one folder"
              >
                <ArrowUp size={12} />
                <span>Up</span>
              </button>
            )}
            <button
              className="btn btn-outline"
              onClick={() => fetchFiles(currentPath)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              title="Refresh files"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : undefined} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px', background: 'var(--card)' }}>
          {error && (
            <div style={{ color: 'var(--danger)', padding: '20px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {loading && items.length === 0 ? (
            <div style={{ color: 'var(--muted-foreground)', padding: '40px', textAlign: 'center' }}>
              Loading files...
            </div>
          ) : items.length === 0 ? (
            <div style={{ color: 'var(--muted-foreground)', padding: '40px', textAlign: 'center', fontStyle: 'italic' }}>
              This folder is empty.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th className="mono-label" style={{ padding: '8px 10px' }}>Name</th>
                  <th className="mono-label" style={{ padding: '8px 10px', width: '100px' }}>Size</th>
                  <th className="mono-label" style={{ padding: '8px 10px', width: '140px' }}>Modified</th>
                  <th className="mono-label" style={{ padding: '8px 10px', width: '70px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;
                  const downloadUrl = `/__teal/files/${itemPath}`;

                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--primary) 4%, transparent)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '9px 10px' }}>
                        {item.isDir ? (
                          <div
                            onClick={() => navigateTo(item.name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              color: 'var(--primary-ink)',
                              fontWeight: 600,
                            }}
                          >
                            <Folder size={15} style={{ color: 'var(--primary)' }} />
                            <span>{item.name}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--foreground)' }}>
                            {item.name.endsWith('.sh') || item.name.endsWith('.py') || item.name.endsWith('.hs') ? (
                              <FileCode size={15} style={{ color: 'var(--primary)' }} />
                            ) : item.name.endsWith('.txt') || item.name.endsWith('.md') ? (
                              <FileText size={15} style={{ color: 'var(--muted-foreground)' }} />
                            ) : (
                              <File size={15} style={{ color: 'var(--muted-foreground)' }} />
                            )}
                            <span>{item.name}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '9px 10px', color: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {formatSize(item.size)}
                      </td>
                      <td style={{ padding: '9px 10px', color: 'var(--muted-foreground)', fontSize: '0.75rem' }}>
                        {formatDate(item.modified)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                        {!item.isDir && (
                          <a
                            href={downloadUrl}
                            download={item.name}
                            className="btn btn-outline"
                            style={{ padding: '3px 7px', textDecoration: 'none' }}
                            title="Download file"
                          >
                            <Download size={12} />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
