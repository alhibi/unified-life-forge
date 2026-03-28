const DB_NAME = 'audio-player-db';
const STORE_NAME = 'audio-files';
const META_KEY = 'audio-meta';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface StoredAudioFile {
  name: string;
  blob: Blob;
  type: string;
}

export interface AudioMeta {
  currentIndex: number;
  fileNames: string[];
}

export async function saveAudioFiles(files: File[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  // Clear old files
  store.clear();
  
  // Save each file as blob
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    store.put({ name: file.name, blob: file, type: file.type } as StoredAudioFile, `file-${i}`);
  }
  
  // Save metadata
  const meta: AudioMeta = {
    currentIndex: 0,
    fileNames: files.map(f => f.name),
  };
  store.put(meta, META_KEY);
  
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function saveCurrentIndex(index: number): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  const metaReq = store.get(META_KEY);
  metaReq.onsuccess = () => {
    const meta = metaReq.result as AudioMeta | undefined;
    if (meta) {
      meta.currentIndex = index;
      store.put(meta, META_KEY);
    }
  };
}

export async function loadAudioFiles(): Promise<{ files: { name: string; url: string }[]; currentIndex: number } | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const metaReq = store.get(META_KEY);
    
    return new Promise((resolve, reject) => {
      metaReq.onsuccess = async () => {
        const meta = metaReq.result as AudioMeta | undefined;
        if (!meta || meta.fileNames.length === 0) {
          resolve(null);
          return;
        }
        
        const files: { name: string; url: string }[] = [];
        for (let i = 0; i < meta.fileNames.length; i++) {
          const fileReq = store.get(`file-${i}`);
          await new Promise<void>((res) => {
            fileReq.onsuccess = () => {
              const stored = fileReq.result as StoredAudioFile | undefined;
              if (stored) {
                files.push({
                  name: stored.name.replace(/\.[^/.]+$/, ''),
                  url: URL.createObjectURL(stored.blob),
                });
              }
              res();
            };
            fileReq.onerror = () => res();
          });
        }
        
        resolve({ files, currentIndex: meta.currentIndex });
      };
      metaReq.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearAudioFiles(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
}
