import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { useStore } from '../../store/useStore';
import { uploadFile } from '../../api/api';
import { Sample } from '../../types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function SamplesScreen() {
  const router = useRouter();
  const { samples, addSample } = useStore();
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('All');

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      try {
        const response = await uploadFile(file);
        const { file_id, sample_id } = response;

        const newSample: Sample = {
          fileId: file_id,
          sampleId: sample_id,
          status: 'uploading',
          fileName: file.name,
          uploadDate: new Date().toISOString(),
          logs: [],
          progress: [],
          verificationUpdates: [],
        };

        addSample(newSample);
        setUploading(false);
        
        // Navigate to sample detail
        router.push(`/sample/${file_id}` as any);

      } catch (error) {
        console.error(error);
        Alert.alert('Upload Failed', 'Could not upload file.');
        setUploading(false);
      }

    } catch (err) {
      console.error(err);
      setUploading(false);
    }
  };

  const renderItem = ({ item }: { item: Sample }) => (
    <TouchableOpacity
      className="bg-card p-4 mb-3 rounded-xl border border-gray-800"
      onPress={() => router.push(`/sample/${item.fileId}` as any)}
    >
      <View className="flex-row justify-between items-start mb-2">
        <Text className="font-bold text-lg text-white">{item.fileName || 'Unknown Sample'}</Text>
        <View className={`px-2 py-1 rounded-full flex-row items-center ${
          item.status === 'complete' ? 'bg-green-900/30' :
          item.status === 'error' ? 'bg-red-900/30' :
          'bg-yellow-900/30'
        }`}>
          <Ionicons 
            name={item.status === 'complete' ? "checkmark-circle" : item.status === 'error' ? "alert-circle" : "time"} 
            size={12} 
            color={item.status === 'complete' ? "#4ADE80" : item.status === 'error' ? "#F87171" : "#FBBF24"} 
            style={{ marginRight: 4 }}
          />
          <Text className={`text-xs font-medium ${
            item.status === 'complete' ? 'text-green-400' :
            item.status === 'error' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {item.status === 'complete' ? 'Verified' : item.status === 'error' ? 'Failed' : 'Pending'}
          </Text>
        </View>
      </View>
      
      <Text className="text-gray-400 text-sm mb-1">OCEANX-05B</Text>
      <Text className="text-gray-500 text-xs">4500m • {new Date(item.uploadDate || Date.now()).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background p-4">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-3xl font-bold text-white">Samples</Text>
        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="search" size={24} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 max-h-10">
        {['Status: All', 'Cruise ID', 'Date'].map((f, i) => (
          <TouchableOpacity 
            key={i} 
            className={`px-4 py-2 rounded-full mr-2 ${i === 0 ? 'bg-green-100' : 'bg-card border border-gray-700'}`}
          >
            <Text className={`text-sm font-medium ${i === 0 ? 'text-green-800' : 'text-gray-300'}`}>
              {f} {i === 0 && '▼'} {i !== 0 && '▼'}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={samples}
        renderItem={renderItem}
        keyExtractor={(item) => item.fileId}
        ListEmptyComponent={
          <View className="items-center justify-center mt-20">
            <View className="w-16 h-16 bg-card rounded-full items-center justify-center mb-4">
              <MaterialCommunityIcons name="flask-empty-outline" size={32} color="#64748B" />
            </View>
            <Text className="text-white font-bold text-lg">No Samples Found</Text>
            <Text className="text-gray-500 text-center mt-2 px-10">
              Try adjusting your filters or upload a new sample.
            </Text>
          </View>
        }
      />

      {/* Floating Upload Button */}
      <TouchableOpacity
        onPress={handleUpload}
        disabled={uploading}
        className="absolute bottom-6 right-6 bg-accent w-14 h-14 rounded-xl items-center justify-center shadow-lg"
      >
        {uploading ? (
          <ActivityIndicator color="#0B1121" />
        ) : (
          <Ionicons name="cloud-upload-outline" size={28} color="#0B1121" />
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}
