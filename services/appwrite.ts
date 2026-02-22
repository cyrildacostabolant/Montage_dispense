
import { Client, Storage, ID } from 'appwrite';

// Helper pour récupérer les variables d'env de façon robuste
const getEnv = (key: string) => {
  return import.meta.env[key] || (window as any).process?.env?.[key] || '';
};

const rawEndpoint = getEnv('VITE_APPWRITE_ENDPOINT') || 'https://cloud.appwrite.io/v1';
// Correction automatique si l'utilisateur oublie le 'h' ou met un espace
const endpoint = rawEndpoint.trim().startsWith('ttp') ? `h${rawEndpoint.trim().replace(/^h?ttp/, 'ttp')}` : rawEndpoint.trim();
const projectId = getEnv('VITE_APPWRITE_PROJECT_ID');
const bucketId = getEnv('VITE_APPWRITE_BUCKET_ID');

const client = new Client();

if (projectId) {
  client
    .setEndpoint(endpoint)
    .setProject(projectId);
}

export const storage = new Storage(client);

/**
 * Vérifie si la configuration est complète
 */
export const isAppwriteConfigured = () => {
  return !!projectId && !!bucketId;
};

/**
 * Convertit un DataURL en File object pour Appwrite
 */
const dataURLtoFile = (dataurl: string, filename: string): File => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};

/**
 * Sauvegarde une image (DataURL) dans le bucket Appwrite
 */
export const saveToCloud = async (dataUrl: string, name: string) => {
  const missing = [];
  if (!projectId) missing.push('VITE_APPWRITE_PROJECT_ID');
  if (!bucketId) missing.push('VITE_APPWRITE_BUCKET_ID');
  
  if (missing.length > 0) {
    throw new Error(`Configuration Appwrite incomplète. Variables manquantes : ${missing.join(', ')}`);
  }

  const file = dataURLtoFile(dataUrl, `planche_${name}_${Date.now()}.jpg`);
  
  try {
    const response = await storage.createFile(
      bucketId,
      ID.unique(),
      file
    );
    return response;
  } catch (error) {
    console.error('Appwrite upload error:', error);
    throw error;
  }
};

/**
 * Liste les fichiers du bucket
 */
export const listCloudFiles = async () => {
  if (!projectId || !bucketId) {
    throw new Error('Appwrite non configuré.');
  }

  try {
    const response = await storage.listFiles(bucketId);
    return response.files;
  } catch (error) {
    console.error('Appwrite list error:', error);
    throw error;
  }
};

/**
 * Supprime un fichier du bucket
 */
export const deleteCloudFile = async (fileId: string) => {
  if (!projectId || !bucketId) {
    throw new Error('Appwrite non configuré.');
  }

  try {
    await storage.deleteFile(bucketId, fileId);
  } catch (error) {
    console.error('Appwrite delete error:', error);
    throw error;
  }
};

/**
 * Récupère l'URL de prévisualisation d'un fichier
 */
export const getFilePreview = (fileId: string) => {
  if (!projectId || !bucketId) return '';
  return storage.getFilePreview(bucketId, fileId).toString();
};

/**
 * Récupère l'URL de téléchargement d'un fichier
 */
export const getFileDownload = (fileId: string) => {
  if (!projectId || !bucketId) return '';
  return storage.getFileDownload(bucketId, fileId).toString();
};
