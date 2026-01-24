'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Folder, FolderOpen, ChevronRight, ChevronLeft, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink?: string;
}

interface WatchedFolder {
  id: string;
  folderId: string;
  folderName: string;
  purpose: string | null;
  enabled: boolean;
}

interface DriveFolderPickerProps {
  onFolderAdded?: () => void;
}

export function DriveFolderPicker({ onFolderAdded }: DriveFolderPickerProps) {
  const [folders, setFolders] = useState<DriveFile[]>([]);
  const [watchedFolders, setWatchedFolders] = useState<WatchedFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingWatched, setLoadingWatched] = useState(true);
  const [currentPath, setCurrentPath] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'My Drive' },
  ]);
  const [adding, setAdding] = useState<string | null>(null);

  // Fetch available folders for browsing
  const fetchFolders = async (parentId?: string) => {
    setLoading(true);
    try {
      const url = parentId
        ? `/api/drive/browse?parentId=${parentId}`
        : '/api/drive/browse';

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }

      const data = await response.json();
      setFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch currently watched folders
  const fetchWatchedFolders = async () => {
    setLoadingWatched(true);
    try {
      const response = await fetch('/api/drive/folders');
      if (!response.ok) {
        throw new Error('Failed to fetch watched folders');
      }

      const data = await response.json();
      setWatchedFolders(data.folders || []);
    } catch (error) {
      console.error('Error fetching watched folders:', error);
    } finally {
      setLoadingWatched(false);
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchWatchedFolders();
  }, []);

  const navigateToFolder = (folder: DriveFile) => {
    setCurrentPath([...currentPath, { id: folder.id, name: folder.name }]);
    fetchFolders(folder.id);
  };

  const navigateBack = () => {
    if (currentPath.length > 1) {
      const newPath = currentPath.slice(0, -1);
      setCurrentPath(newPath);
      const parentId = newPath[newPath.length - 1].id;
      fetchFolders(parentId || undefined);
    }
  };

  const addFolder = async (folder: DriveFile) => {
    setAdding(folder.id);
    try {
      const response = await fetch('/api/drive/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: folder.id,
          folderName: folder.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add folder');
      }

      await fetchWatchedFolders();
      toast.success(`Added folder: ${folder.name}`);
      onFolderAdded?.();
    } catch (error) {
      console.error('Error adding folder:', error);
      toast.error('Failed to add folder');
    } finally {
      setAdding(null);
    }
  };

  const removeFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/drive/folders?folderId=${folderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove folder');
      }

      await fetchWatchedFolders();
      toast.success('Folder removed');
    } catch (error) {
      console.error('Error removing folder:', error);
      toast.error('Failed to remove folder');
    }
  };

  const isWatched = (folderId: string) => {
    return watchedFolders.some(f => f.folderId === folderId);
  };

  return (
    <div className="space-y-4">
      {/* Watched Folders */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold font-mono uppercase text-muted-foreground">
          Watched Folders
        </h4>
        {loadingWatched ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : watchedFolders.length === 0 ? (
          <p className="text-xs text-muted-foreground font-mono p-2 bg-muted/30 rounded border border-border">
            No folders selected. Browse and add folders below.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {watchedFolders.map(folder => (
              <Badge
                key={folder.id}
                variant="outline"
                className="flex items-center gap-1 py-1 px-2 bg-primary/10 border-primary/30"
              >
                <FolderOpen className="w-3 h-3" />
                <span className="text-xs">{folder.folderName}</span>
                <button
                  onClick={() => removeFolder(folder.folderId)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Folder Browser */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold font-mono uppercase text-muted-foreground">
            Browse Folders
          </h4>
          {currentPath.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={navigateBack}
              className="h-6 px-2 text-xs"
            >
              <ChevronLeft className="w-3 h-3 mr-1" />
              Back
            </Button>
          )}
        </div>

        {/* Current Path */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono overflow-x-auto">
          {currentPath.map((segment, index) => (
            <span key={index} className="flex items-center">
              {index > 0 && <ChevronRight className="w-3 h-3 mx-1" />}
              <span className={index === currentPath.length - 1 ? 'text-foreground' : ''}>
                {segment.name}
              </span>
            </span>
          ))}
        </div>

        {/* Folder List */}
        <div className="max-h-48 overflow-y-auto border border-border rounded bg-muted/20">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : folders.length === 0 ? (
            <p className="text-xs text-muted-foreground font-mono p-3 text-center">
              No folders found
            </p>
          ) : (
            <div className="divide-y divide-border">
              {folders.map(folder => (
                <div
                  key={folder.id}
                  className={cn(
                    "flex items-center justify-between p-2 hover:bg-muted/40 transition-colors",
                    isWatched(folder.id) && "bg-primary/5"
                  )}
                >
                  <button
                    onClick={() => navigateToFolder(folder)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Folder className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs font-mono truncate">{folder.name}</span>
                  </button>

                  {isWatched(folder.id) ? (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30">
                      Watching
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addFolder(folder)}
                      disabled={adding === folder.id}
                      className="h-6 px-2"
                    >
                      {adding === folder.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
