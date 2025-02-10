import { create } from 'zustand';
import { persist, PersistOptions } from 'zustand/middleware';

export interface Asset {
  id: string;
  name: string;
  url: string;
  type?: string;
}

export interface Folder {
  id: string;
  name: string;
  children: (Folder | Asset)[];
  isExpanded: boolean;
}

interface AssetStore {
  tree: Folder;
  currentFolder: Folder;
  setCurrentFolder: (folder: Folder) => void;
  addFolder: (parentId: string, newFolder: Folder) => void;
  addAsset: (parentId: string, asset: Asset) => void;
  deleteFolder: (folderId: string) => void;
  toggleFolder: (folderId: string) => void;
  renameFolder: (folderId: string, newName: string) => void;
  cleanupOrphanedAssets: () => void;
}

type AssetStorePersist = Pick<AssetStore, 'tree' | 'currentFolder'>;

const initialTree: Folder = {
  id: 'root',
  name: 'Root',
  children: [],
  isExpanded: true
};

const persistOptions: PersistOptions<AssetStore, AssetStorePersist> = {
  name: 'asset-store',
  partialize: (state) => ({ 
    tree: state.tree,
    currentFolder: state.tree
  }),
};

export const useAssetStore = create<AssetStore>()(
  persist(
    (set) => ({
      tree: initialTree,
      currentFolder: initialTree,

      setCurrentFolder: (folder) => {
        set({ currentFolder: folder });
      },

      addFolder: (parentId, newFolder) => {
        const updateChildren = (folder: Folder): Folder => {
          if (folder.id === parentId) {
            return {
              ...folder,
              children: [...folder.children, newFolder]
            };
          }
          return {
            ...folder,
            children: folder.children.map((child) => {
              if ('children' in child) {
                return updateChildren(child);
              }
              return child;
            })
          };
        };

        set((state) => ({
          tree: updateChildren(state.tree)
        }));
      },

      addAsset: (parentId, asset) => {
        const updateChildren = (folder: Folder): Folder => {
          if (folder.id === parentId) {
            return {
              ...folder,
              children: [...folder.children, asset]
            };
          }
          return {
            ...folder,
            children: folder.children.map((child) => {
              if ('children' in child) {
                return updateChildren(child);
              }
              return child;
            })
          };
        };

        set((state) => {
          const newTree = updateChildren(state.tree);
          return {
            tree: newTree,
            currentFolder: newTree
          };
        });
      },

      deleteFolder: (folderId) => {
        const deleteFromChildren = (folder: Folder): Folder => {
          return {
            ...folder,
            children: folder.children
              .filter((child) => !('children' in child && child.id === folderId))
              .map((child) => {
                if ('children' in child) {
                  return deleteFromChildren(child);
                }
                return child;
              })
          };
        };

        set((state) => ({
          tree: deleteFromChildren(state.tree),
          currentFolder: state.currentFolder.id === folderId ? state.tree : state.currentFolder,
        }));
      },

      toggleFolder: (folderId) => {
        const toggleInChildren = (folder: Folder): Folder => {
          if (folder.id === folderId) {
            return {
              ...folder,
              isExpanded: !folder.isExpanded
            };
          }
          return {
            ...folder,
            children: folder.children.map((child) => {
              if ('children' in child) {
                return toggleInChildren(child);
              }
              return child;
            })
          };
        };

        set((state) => ({
          tree: toggleInChildren(state.tree)
        }));
      },

      renameFolder: (folderId, newName) => {
        const renameInChildren = (folder: Folder): Folder => {
          if (folder.id === folderId) {
            return {
              ...folder,
              name: newName
            };
          }
          return {
            ...folder,
            children: folder.children.map((child) => {
              if ('children' in child) {
                return renameInChildren(child);
              }
              return child;
            })
          };
        };

        set((state) => ({
          tree: renameInChildren(state.tree)
        }));
      },

      cleanupOrphanedAssets: () => {
        const cleanupFolder = (folder: Folder): Folder => {
          return {
            ...folder,
            children: folder.children
              .filter((child) => {
                if (!('children' in child)) {
                  return sessionStorage.getItem(child.url) !== null;
                }
                return true;
              })
              .map((child) => {
                if ('children' in child) {
                  return cleanupFolder(child);
                }
                return child;
              })
          };
        };

        set((state) => ({
          tree: cleanupFolder(state.tree)
        }));
      }
    }),
    persistOptions
  )
); 