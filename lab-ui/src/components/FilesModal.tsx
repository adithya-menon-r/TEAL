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
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-card)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '780px',
          height: '620px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          animation: 'fadeIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FolderOpen size={20} style={{ color: '#38bdf8' }} />
            <div>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: '#f8fafc' }}>
                Files & Downloads
              </h2>
              <p style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
                Files in <code>/home/student</code>
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
                color: '#64748b',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Path Bar & Actions */}
        <div
          style={{
            padding: '10px 20px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.825rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
            <button
              onClick={() => fetchFiles('')}
              style={{
                background: 'none',
                border: 'none',
                color: currentPath ? '#38bdf8' : '#f8fafc',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              /home/student
            </button>
            {pathBreadcrumbs.map((crumb, idx) => {
              const fullCrumbPath = pathBreadcrumbs.slice(0, idx + 1).join('/');
              const isLast = idx === pathBreadcrumbs.length - 1;
              return (
                <React.Fragment key={idx}>
                  <ChevronRight size={14} style={{ color: '#475569' }} />
                  <button
                    onClick={() => fetchFiles(fullCrumbPath)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: isLast ? '#f8fafc' : '#38bdf8',
                      cursor: 'pointer',
                      fontWeight: isLast ? 600 : 400,
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
                className="btn btn-secondary"
                onClick={navigateUp}
                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                title="Go up one folder"
              >
                <ArrowUp size={13} />
                <span>Up</span>
              </button>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => fetchFiles(currentPath)}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
              title="Refresh files"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : undefined} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Content list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
          {error && (
            <div style={{ color: '#ef4444', padding: '16px', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {loading && items.length === 0 ? (
            <div style={{ color: '#94a3b8', padding: '40px', textAlign: 'center' }}>
              Loading files...
            </div>
          ) : items.length === 0 ? (
            <div style={{ color: '#64748b', padding: '40px', textAlign: 'center', fontStyle: 'italic' }}>
              This folder is empty.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ color: '#64748b', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <th style={{ padding: '8px 10px', fontWeight: 500 }}>Name</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500, width: '100px' }}>Size</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500, width: '140px' }}>Modified</th>
                  <th style={{ padding: '8px 10px', fontWeight: 500, width: '80px', textAlign: 'right' }}>Action</th>
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
                        borderBottom: '1px solid rgba(30, 41, 59, 0.4)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(30, 41, 59, 0.4)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '10px' }}>
                        {item.isDir ? (
                          <div
                            onClick={() => navigateTo(item.name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              color: '#38bdf8',
                              fontWeight: 500,
                            }}
                          >
                            <Folder size={16} style={{ color: '#38bdf8' }} />
                            <span>{item.name}</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f1f5f9' }}>
                            {item.name.endsWith('.sh') || item.name.endsWith('.py') || item.name.endsWith('.hs') ? (
                              <FileCode size={16} style={{ color: '#10b981' }} />
                            ) : item.name.endsWith('.txt') || item.name.endsWith('.md') ? (
                              <FileText size={16} style={{ color: '#94a3b8' }} />
                            ) : (
                              <File size={16} style={{ color: '#94a3b8' }} />
                            )}
                            <span>{item.name}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px', color: '#94a3b8', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {formatSize(item.size)}
                      </td>
                      <td style={{ padding: '10px', color: '#64748b', fontSize: '0.8rem' }}>
                        {formatDate(item.modified)}
                      </td>
                      <td style={{ padding: '10px', textAlign: 'right' }}>
                        {!item.isDir && (
                          <a
                            href={downloadUrl}
                            download={item.name}
                            className="btn btn-secondary"
                            style={{ padding: '4px 8px', textDecoration: 'none' }}
                            title="Download file"
                          >
                            <Download size={13} />
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
