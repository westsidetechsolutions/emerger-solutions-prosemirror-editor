import React, { useEffect, useState } from 'react';
import Modal from '../../ui/Modal';
import FileInput from '../../ui/FileInput';
import TextInput from '../../ui/TextInput';
import './AssetManager.css';
import { useAssetStore, Asset, Folder } from '../../stores/assetStore';

interface AssetManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  mode: 'link' | 'image';
}

const DEBUG = true;

const ACCEPTED_FILE_TYPES: Record<'link' | 'image', string> = {
  link: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
  image: 'image/*,video/*'
};

function FilePreview({ type, name }: { type: string; name: string }) {
  function getFileIcon() {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📑';
    if (type.includes('text')) return '📃';
    return '📁';
  }
  function getFileColor() {
    if (type.includes('pdf')) return '#ff4433';
    if (type.includes('word') || type.includes('doc')) return '#2b579a';
    if (type.includes('sheet') || type.includes('excel')) return '#217346';
    if (type.includes('presentation') || type.includes('powerpoint')) return '#b7472a';
    if (type.includes('text')) return '#4a4a4a';
    return '#8f8f8f';
  }
  return (
    <div className="file-preview-container">
      <div className="file-preview-icon" style={{ color: getFileColor() }}>{getFileIcon()}</div>
      <div className="file-preview-name">{name}</div>
      <div className="file-preview-type">{type.split('/')[1]?.toUpperCase() || 'DOC'}</div>
    </div>
  );
}

function AssetGridItem({ item, onSelect, mode }: { item: Asset; onSelect: (asset: Asset) => void; mode: 'link' | 'image' }) {
  const [url, setUrl] = useState<string>('');
  useEffect(() => {
    const storedUrl = sessionStorage.getItem(item.url);
    if (storedUrl) {
      setUrl(storedUrl);
    }
  }, [item.url]);
  const isImage = item.type?.startsWith('image/');
  const isVideo = item.type?.startsWith('video/');
  const isDocument = !isImage && !isVideo;
  const shouldShow = mode === 'link' ? true : isImage || isVideo;
  if (!shouldShow) return null;
  return (
    <div className="asset-item">
      {isImage && url && <img src={url} alt={item.name} />}
      {isVideo && url && <video src={url} controls />}
      {isDocument && <FilePreview type={item.type || ''} name={item.name} />}
      <div className="asset-overlay">
        <div className="asset-overlay-title">{item.name}</div>
        <button className="select-asset-button" onClick={() => onSelect({ ...item, url })}>Select</button>
      </div>
    </div>
  );
}

function FolderTreeItem({
  folder,
  level = 0,
  selectedFolderId,
  onFolderSelect,
  onFolderToggle,
  onFolderRename,
  onFolderDelete
}: {
  folder: Folder;
  level?: number;
  selectedFolderId: string;
  onFolderSelect: (folder: Folder) => void;
  onFolderToggle: (folderId: string) => void;
  onFolderRename: (folderId: string, newName: string) => void;
  onFolderDelete: (folderId: string) => void;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);
  function handleFolderClick(e: React.MouseEvent) {
    e.stopPropagation();
    onFolderSelect(folder);
  }
  function handleToggleClick(e: React.MouseEvent) {
    e.stopPropagation();
    onFolderToggle(folder.id);
  }
  function handleDeleteClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (folder.children.length === 0) {
      onFolderDelete(folder.id);
    }
  }
  return (
    <div style={{ paddingLeft: `${level * 16}px` }}>
      <div
        className={`folder-tree-item-container ${
          selectedFolderId === folder.id ? 'folder-tree-item-selected' : ''
        }`}
        onClick={handleFolderClick}
      >
        <button className="toggle-button" onClick={handleToggleClick} type="button">
          {folder.children.some((child) => 'children' in child)
            ? folder.isExpanded ? '▾' : '▸'
            : ''}
        </button>
        {isRenaming ? (
          <div onClick={(e) => e.stopPropagation()} style={{ flex: 1 }}>
            <TextInput
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={() => {
                onFolderRename(folder.id, newName);
                setIsRenaming(false);
              }}
            />
          </div>
        ) : (
          <div
            style={{ flex: 1 }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsRenaming(true);
            }}
          >
            📁 {folder.name}
          </div>
        )}
        {!isRenaming && folder.id !== 'root' && folder.children.length === 0 && (
          <button onClick={handleDeleteClick} style={{ marginLeft: '0.5rem', cursor: 'pointer' }}>🗑️</button>
        )}
      </div>
      {folder.isExpanded && folder.children.map((childItem) => {
        if ('children' in childItem) {
          return (
            <FolderTreeItem
              key={childItem.id}
              folder={childItem}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onFolderSelect={onFolderSelect}
              onFolderToggle={onFolderToggle}
              onFolderRename={onFolderRename}
              onFolderDelete={onFolderDelete}
            />
          );
        }
        return null;
      })}
    </div>
  );
}

function debugStore() {
  if (!DEBUG) return;
  const state = useAssetStore.getState();
  console.log('Store State:', { tree: state.tree, currentFolder: state.currentFolder });
  console.log('SessionStorage:', Object.keys(sessionStorage).map((key) => ({ key, value: sessionStorage.getItem(key) })));
}

export default function AssetManager({ isOpen, onClose, onSelect, mode }: AssetManagerProps) {
  const { tree, currentFolder, setCurrentFolder, addFolder, addAsset, deleteFolder, toggleFolder, renameFolder } = useAssetStore();
  const [newFolderName, setNewFolderName] = useState('');

  function handleAddFolder() {
    if (newFolderName.trim() === '') return;
    const folder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      children: [],
      isExpanded: false
    };
    addFolder(currentFolder.id, folder);
    setNewFolderName('');
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files) return;
    try {
      const processFile = async (file: File) => {
        const id = `asset-${Date.now()}-${file.name}`;
        const reader = new FileReader();
        return new Promise<Asset>((resolve, reject) => {
          reader.onloadend = () => {
            const url = reader.result as string;
            sessionStorage.setItem(id, url);
            resolve({ id, name: file.name, url: id, type: file.type });
          };
          reader.onerror = () => {
            reject(new Error('File reading failed'));
          };
          reader.readAsDataURL(file);
        });
      };
      const newAssets = await Promise.all(Array.from(files).map(processFile));
      newAssets.forEach((asset) => {
        addAsset(currentFolder.id, asset);
      });
      alert('Files uploaded successfully!');
    } catch (error) {
      alert('There was an error uploading your files.' + error);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Asset Manager" className="asset-manager-modal">
      <div className="asset-manager-container">
        <div className="asset-manager-sidebar">
          <div className="asset-manager-sidebar-section">
            <div className="sidebar-heading">Create New Folder</div>
            <div className="folder-create-container">
              <TextInput
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                className="folder-input"
              />
              <button onClick={handleAddFolder} className="create-folder-button">Create Folder</button>
            </div>
          </div>
          <div className="asset-manager-sidebar-section">
            <div className="sidebar-heading">Manage Assets</div>
            <div className="asset-manager-actions">
              {DEBUG && <button onClick={debugStore} className="debug-button">Debug Store</button>}
            </div>
          </div>
          <div className="folder-tree">
            <FolderTreeItem
              folder={tree}
              selectedFolderId={currentFolder.id}
              onFolderSelect={setCurrentFolder}
              onFolderToggle={toggleFolder}
              onFolderRename={renameFolder}
              onFolderDelete={deleteFolder}
            />
          </div>
        </div>
        <div className="asset-manager-main">
          <div className="upload-section">
            <div className="upload-card">
              <div>Upload Files</div>
              <FileInput
                className="upload-button"
                label={<div>Upload Files</div>}
                onChange={handleFileUpload}
                accept={ACCEPTED_FILE_TYPES[mode]}
                multiple
              />
            </div>
          </div>
          <div className="asset-list">
            <div className="asset-grid">
              {currentFolder.children.map((child) => {
                if ('children' in child) {
                  return (
                    <div
                      key={child.id}
                      className="asset-grid-folder"
                      onClick={() => setCurrentFolder(child)}
                    >
                      <div className="asset-grid-folder-icon">📁</div>
                      <div className="asset-grid-folder-name">{child.name}</div>
                    </div>
                  );
                }
                return <AssetGridItem key={child.id} item={child} onSelect={onSelect} mode={mode} />;
              })}
              {currentFolder.children.length === 0 && (
                <div className="empty-state">
                  <div>No assets in this folder</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
