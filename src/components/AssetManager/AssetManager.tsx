/* eslint-disable */
// @ts-nocheck

import React, {useEffect, useState} from 'react';
//import Button from '../../ui/Button';
import Modal from '../../ui/Modal';
import FileInput from '../../ui/FileInput';
import TextInput from '../../ui/TextInput';
import './AssetManager.css';
import { useAssetStore, Asset, Folder } from '../../stores/assetStore'

interface AssetManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  mode: 'link' | 'image';
}

const DEBUG = true;

const FolderTreeItem = ({
  folder,
  level = 0,
  selectedFolderId,
  onFolderSelect,
  onFolderToggle,
  onFolderRename,
  onFolderDelete,
}: {
  folder: Folder;
  level?: number;
  selectedFolderId: string;
  onFolderSelect: (folder: Folder) => void;
  onFolderToggle: (folderId: string) => void;
  onFolderRename: (folderId: string, newName: string) => void;
  onFolderDelete: (folderId: string) => void;
}) => {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(folder.name);

  const handleFolderClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFolderSelect(folder);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFolderToggle(folder.id);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (folder.children.length === 0) {
      onFolderDelete(folder.id);
    }
  };

  return (
    <div style={{ paddingLeft: `${level * 16}px` }}>
      <div
        className={`flex items-center p-2 my-1 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-100 border-l-4
          ${selectedFolderId === folder.id ? 'bg-blue-50 border-blue-500' : 
           level === 0 ? 'border-transparent' :
           level === 1 ? 'border-purple-300' :
           level === 2 ? 'border-pink-300' : 'border-gray-300'}`}
        onClick={handleFolderClick}
      >
        <div className="ml-2 flex items-center flex-1">
          <button
            className="text-purple-600 mr-2 text-base cursor-pointer p-1 hover:bg-purple-100 rounded"
            onClick={handleToggleClick}
            type="button"
          >
            {folder.children.some((child) => 'children' in child)
              ? folder.isExpanded
                ? '▾'
                : '▸'
              : ''}
          </button>

          {isRenaming ? (
            <div className="flex items-center flex-1" onClick={e => e.stopPropagation()}>
              <TextInput
                value={newName}
                onChange={(value) => setNewName(value)}
                onBlur={() => {
                  onFolderRename(folder.id, newName);
                  setIsRenaming(false);
                }}
                className="flex-1"
              />
              <button 
                className="ml-2 p-1 min-w-[32px] bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg"
                onClick={() => {
                  onFolderRename(folder.id, newName);
                  setIsRenaming(false);
                }}
              >
                ✓
              </button>
            </div>
          ) : (
            <div
              className="flex items-center flex-1"
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
              }}
            >
              <span className="mr-2">📁</span>
              {folder.name}
            </div>
          )}

          {!isRenaming && folder.id !== 'root' && folder.children.length === 0 && (
            <button
              onClick={handleDeleteClick}
              className="ml-2 p-1 text-red-500 hover:text-red-700 transition-colors duration-200"
              title="Delete folder"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {folder.isExpanded &&
        folder.children.map((childItem) => {
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
};

const AssetGridItem: React.FC<{
  item: Asset;
  onSelect: (asset: Asset) => void;
  mode: 'link' | 'image';
}> = ({ item, onSelect, mode }) => {
  console.log('AssetGridItem:', item);
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
    <div className="relative group overflow-hidden rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow duration-200 h-40">
      {isImage && url && <img src={url} alt={item.name} className="w-full h-40 object-cover" />}
      {isVideo && url && <video src={url} className="w-full h-40 object-cover" controls />}
      {isDocument && (
        <div className="w-full h-40 flex items-center justify-center">
          <FilePreview type={item.type || ''} name={item.name} />
        </div>
      )}
      
      <div className="absolute inset-0 p-2 bg-white/95 backdrop-blur-sm transform translate-y-full group-hover:translate-y-0 transition-transform duration-200 rounded-lg flex flex-col items-center justify-center">
        <div className="font-medium text-sm mb-4 text-gray-800 text-center break-words w-full">
          {item.name}
        </div>
        <button 
          className="w-2/3 py-1.5 px-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:from-purple-700 hover:to-pink-600 transition-colors duration-200"
          onClick={() => onSelect({...item, url})}
        >
          Select
        </button>
      </div>
    </div>
  );
};

const ACCEPTED_FILE_TYPES: Record<'link' | 'image', string> = {
  link: '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt',
  image: 'image/*,video/*'
};

const FilePreview = ({ type, name }: { type: string; name: string }) => {
  const getFileIcon = () => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('doc')) return '📝';
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return '📊';
    if (type.includes('presentation') || type.includes('powerpoint')) return '📑';
    if (type.includes('text')) return '📃';
    return '📁';
  };

  const getFileColor = () => {
    if (type.includes('pdf')) return '#ff4433';
    if (type.includes('word') || type.includes('doc')) return '#2b579a';
    if (type.includes('sheet') || type.includes('excel')) return '#217346';
    if (type.includes('presentation') || type.includes('powerpoint')) return '#b7472a';
    if (type.includes('text')) return '#4a4a4a';
    return '#8f8f8f';
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-br from-gray-50 to-white rounded-lg">
      <div className="text-5xl mb-4 transform transition-transform duration-200 hover:scale-110" style={{ color: getFileColor() }}>
        {getFileIcon()}
      </div>
      <div className="text-center">
        <div className="font-medium text-sm text-gray-800 mb-1 line-clamp-2">{name}</div>
        <div className="text-xs text-gray-500 uppercase">{type.split('/')[1]?.toUpperCase() || 'DOCUMENT'}</div>
      </div>
    </div>
  );
};

const debugStore = () => {
  if (!DEBUG) return;
  
  const state = useAssetStore.getState();
  console.log('Current Store State:', {
    tree: state.tree,
    currentFolder: state.currentFolder,
  });
  
  // Also log sessionStorage contents
  console.log('SessionStorage Contents:', {
    keys: Object.keys(sessionStorage),
    values: Object.keys(sessionStorage).map(key => ({
      key,
      value: sessionStorage.getItem(key)
    }))
  });
};

export default function AssetManager({
  isOpen,
  onClose,
  onSelect,
  mode,
}: AssetManagerProps): JSX.Element {
  const { 
    tree, 
    currentFolder, 
    setCurrentFolder, 
    addFolder: addFolderToStore, 
    addAsset,
    deleteFolder,
    toggleFolder, 
    renameFolder 
  } = useAssetStore();
  const [newFolderName, setNewFolderName] = useState('');
  const [updateKey, setUpdateKey] = useState(0);

  useEffect(() => {
    setUpdateKey(prev => prev + 1);
  }, [currentFolder.children]);

  const handleAddFolder = () => {
    if (newFolderName.trim() === '') return;

    const newFolder: Folder = {
      id: Date.now().toString(),
      name: newFolderName.trim(),
      children: [],
      isExpanded: false,
    };

    addFolderToStore(currentFolder.id, newFolder);
    setNewFolderName('');
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;

    console.log('Files received for upload:', files);

    try {
      const processFile = async (file: File): Promise<Asset> => {
        const id = `asset-${Date.now()}-${file.name}`;
        const reader = new FileReader();
        
        return new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const url = reader.result as string;
            sessionStorage.setItem(id, url);
            console.log(`File uploaded: ${file.name}, stored at ${id}`);
            resolve({
              id,
              name: file.name,
              url: id,
              type: file.type
            });
          };
          reader.onerror = () => {
            console.error(`Error reading file: ${file.name}`);
            reject(new Error('File reading failed'));
          };
          reader.readAsDataURL(file);
        });
      };

      const newAssets = await Promise.all(Array.from(files).map(processFile));
      console.log('New assets to add:', newAssets);
      newAssets.forEach(asset => {
        addAsset(currentFolder.id, asset);
        console.log(`Asset added to folder ${currentFolder.name}:`, asset);
      });

      alert('Files uploaded successfully!');
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('There was an error uploading your files. Please try again.');
    }
  };

  const handleClearStorage = () => {
    sessionStorage.clear();
    // Force a re-render of all asset items
    setCurrentFolder({ ...currentFolder });
  };

  console.log('Current Folder:', currentFolder);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Asset Manager"
      className="asset-manager-modal"
      closeOnClickOutside={false}
    >
      <div className="asset-manager-container">
        {/* Folder Tree */}
        <div className="folder-tree">
          <div className="p-6">
            <div className="space-y-4">
              {/* Folder Creation Section */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-base font-semibold text-gray-700 mb-3">
                  Create New Folder
                </h3>
                <div className="space-y-3">
                  <TextInput
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Enter folder name..."
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all duration-200 text-left"
                    style={{ textAlign: 'left' }}
                  />
                  <button 
                    onClick={handleAddFolder}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <span className="text-lg">+</span>
                    <span>Create Folder</span>
                  </button>
                </div>
              </div>

              {/* Asset Management Actions */}
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <h3 className="text-base font-semibold text-gray-700 mb-3">
                  Manage Assets
                </h3>
                <div className="flex flex-col space-y-3">
                  {DEBUG && (
                    <button
                      onClick={debugStore}
                      className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded"
                    >
                      Debug Store
                    </button>
                  )}
                  {/*<Button onClick={handleClearStorage} className="bg-red-500 hover:bg-red-600">
                    Clear All Assets
                  </Button>*/}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Display */}
        <div className="asset-content">
          <div className="p-6 border-b border-gray-100">
            <div className="space-y-4">
              {/* Upload Section */}
              <div className="upload-section">
                <h3 className="text-base font-semibold text-gray-700 mb-3">
                  Upload Files
                </h3>
                <div className="space-y-3">
                  <FileInput
                    className="upload-button"
                    label={
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <span>Upload Files</span>
                      </div>
                    }
                    onChange={handleFileUpload}
                    accept={ACCEPTED_FILE_TYPES[mode]}
                    multiple
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <div className="w-full">
              <div className="asset-grid">
                {currentFolder.children.map((item) => {
                  if ('children' in item) {
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col items-center justify-center p-4 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 h-40"
                        onClick={() => setCurrentFolder(item)}
                      >
                        <span className="text-2xl">📁</span>
                        <span className="mt-2 text-sm font-medium text-gray-700">{item.name}</span>
                      </div>
                    );
                  } else {
                    // This is an asset, not a folder
                    return (
                      <AssetGridItem
                        key={item.id}
                        item={item}
                        onSelect={onSelect}
                        mode={mode}
                      />
                    );
                  }
                })}
                {currentFolder.children.length === 0 && (
                  <div className="col-span-full h-[450px] flex items-center justify-center text-gray-500">
                    No assets in this folder
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
