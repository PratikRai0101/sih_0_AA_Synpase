import axios from 'axios';
import { API_BASE_URL } from './config';
import * as DocumentPicker from 'expo-document-picker';

export const uploadFile = async (file: DocumentPicker.DocumentPickerAsset) => {
  const formData = new FormData();
  
  // React Native's FormData handling requires uri, name, and type
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType || 'application/octet-stream',
  } as any);

  try {
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
