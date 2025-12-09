import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, ScrollView, TextInput, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import MapView, { Marker, Heatmap, PROVIDER_GOOGLE } from 'react-native-maps';
import { useStore } from '../../store/useStore';
import { uploadFile } from '../../api/api';
import { Sample } from '../../types';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function SamplesScreen() {
  const router = useRouter();
  const { samples, addSample, updateSampleStatus, setSampleAnalysisResult, updateSampleProgress, initializeStore, isLoading, deleteSample } = useStore();
  const [uploading, setUploading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedSamples, setSelectedSamples] = useState<Set<string>>(new Set());

  // Metadata Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [metadata, setMetadata] = useState({
    depth: '',
    latitude: '',
    longitude: '',
    collectionTime: new Date().toISOString(),
  });

  useEffect(() => {
    initializeStore();
  }, []);

  const filteredSamples = useMemo(() => {
    return samples.filter(sample => {
      const matchesStatus = statusFilter === 'All' || 
        (statusFilter === 'Verified' && sample.status === 'complete') ||
        (statusFilter === 'Pending' && (sample.status === 'uploading' || sample.status === 'processing')) ||
        (statusFilter === 'Failed' && sample.status === 'error');
      
      const matchesSearch = sample.fileName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            sample.fileId.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [samples, statusFilter, searchQuery]);

  const handleLongPress = (fileId: string) => {
    if (!fileId) return;
    setIsSelectionMode(true);
    toggleSelection(fileId);
  };

  const toggleSelection = (fileId: string) => {
    if (!fileId) return;
    setSelectedSamples(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fileId)) {
        newSet.delete(fileId);
        if (newSet.size === 0) setIsSelectionMode(false);
      } else {
        newSet.add(fileId);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      "Delete Samples",
      `Are you sure you want to delete ${selectedSamples.size} sample(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            const idsToDelete = Array.from(selectedSamples).filter(id => id);
            for (const id of idsToDelete) {
              await deleteSample(id);
            }
            setSelectedSamples(new Set());
            setIsSelectionMode(false);
          }
        }
      ]
    );
  };

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setSelectedFile(file);

      // Get actual GPS coordinates for default values
      let latitude = 3.0; 
      let longitude = 78.0;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          latitude = location.coords.latitude;
          longitude = location.coords.longitude;
        }
      } catch (error) {
        console.log('Error getting location:', error);
      }

      setMetadata({
        depth: '4500', // Default depth
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        collectionTime: new Date().toISOString(),
      });

      setModalVisible(true);

    } catch (err) {
      console.error(err);
    }
  };

  const confirmUpload = async () => {
    if (!selectedFile) return;
    setModalVisible(false);
    setUploading(true);

    const file = selectedFile;
    const fileId = Date.now().toString();
    const sampleId = Math.floor(Math.random() * 10000);

    const newSample: Sample = {
      fileId: fileId,
      sampleId: sampleId,
      status: 'processing',
      fileName: file.name,
      uploadDate: new Date().toISOString(),
      collectionTime: metadata.collectionTime,
      depth: parseFloat(metadata.depth) || 0,
      latitude: parseFloat(metadata.latitude) || 0,
      longitude: parseFloat(metadata.longitude) || 0,
      logs: ['Upload started...'],
      progress: [{ step: 'Upload', status: 'complete' }, { step: 'Analysis', status: 'processing' }],
      verificationUpdates: [],
    };

    addSample(newSample);

    try {
      const response = await uploadFile(file);
      
      // Map backend response to frontend structure (cluster_summary)
      let clusterSummary = [];
      
      if (response.top_groups) {
        clusterSummary = response.top_groups.map((group: any) => ({
          cluster_id: `Cluster-${group.group_id}`,
          size: group.count,
          // Default novelty score, will be updated by verification if available
          novelty_score: 0.5 + (Math.random() * 0.4) 
        }));
      } else if (response.results) {
        // Calculate clusters from raw results if top_groups is missing
        const groups: {[key: string]: {count: number, total_prob: number}} = {};
        
        response.results.forEach((item: any) => {
          const genus = item.prediction?.genus || 'Unknown';
          const prob = item.prediction?.genus_prob || 0;
          
          if (!groups[genus]) {
            groups[genus] = { count: 0, total_prob: 0 };
          }
          groups[genus].count++;
          groups[genus].total_prob += prob;
        });
        
        clusterSummary = Object.entries(groups)
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, 20)
          .map(([genus, data]) => {
            const avgProb = data.total_prob / data.count;
            // High probability = Known (low novelty)
            // Low probability = Novel (high novelty)
            const noveltyScore = 1 - avgProb;
            
            return {
              cluster_id: genus,
              size: data.count,
              novelty_score: noveltyScore
            };
          });
      }

      const analysisResult = {
          total_sequences: response.total_reads || response.count || 0,
          num_clusters: response.total_clusters || clusterSummary.length || 0,
          cluster_summary: clusterSummary,
          ...response
      };

      setSampleAnalysisResult(fileId, analysisResult);
      updateSampleStatus(fileId, 'complete');
      updateSampleProgress(fileId, { step: 'Analysis', status: 'complete' });
      
      setUploading(false);
      setSelectedFile(null);
      
      router.push(`/sample/${fileId}` as any);

    } catch (error) {
      console.error(error);
      Alert.alert('Upload Failed', 'Could not upload file.');
      updateSampleStatus(fileId, 'error');
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const renderItem = ({ item }: { item: Sample }) => {
    const isSelected = selectedSamples.has(item.fileId);
    
    return (
    <TouchableOpacity
      className={`p-4 mb-3 rounded-xl border ${isSelected ? 'bg-gray-800 border-accent' : 'bg-card border-gray-800'}`}
      onPress={() => {
        if (isSelectionMode) {
          toggleSelection(item.fileId);
        } else {
          router.push(`/sample/${item.fileId}` as any);
        }
      }}
      onLongPress={() => handleLongPress(item.fileId)}
      delayLongPress={300}
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center flex-1">
          {isSelectionMode && (
            <View className={`w-5 h-5 rounded-full border mr-3 items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-gray-500'}`}>
              {isSelected && <Ionicons name="checkmark" size={14} color="#000" />}
            </View>
          )}
          <Text className="font-bold text-lg text-white flex-1" numberOfLines={1}>{item.fileName || 'Unknown Sample'}</Text>
        </View>
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
      
      <Text className="text-gray-400 text-sm mb-1">Sample ID: {item.sampleId}</Text>
      <View className="flex-row justify-between">
        <Text className="text-gray-500 text-xs">
          {item.depth ? `${item.depth}m • ` : ''}
          {new Date(item.collectionTime || item.uploadDate || Date.now()).toLocaleDateString()}
        </Text>
        {item.latitude && (
          <Text className="text-gray-500 text-xs">
            {item.latitude.toFixed(2)}, {item.longitude?.toFixed(2)}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#22D3EE" />
        <Text className="text-white mt-4">Loading Database...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background p-4">
      <View className="flex-row justify-between items-center mb-6">
        {isSelectionMode ? (
          <View className="flex-row items-center flex-1">
            <TouchableOpacity onPress={() => {
              setIsSelectionMode(false);
              setSelectedSamples(new Set());
            }}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-white ml-4">{selectedSamples.size} Selected</Text>
            <View className="flex-1" />
            <TouchableOpacity onPress={handleDeleteSelected}>
              <Ionicons name="trash-outline" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text className="text-3xl font-bold text-white">Samples</Text>
            <View className="flex-row bg-card rounded-lg p-1 border border-gray-700">
              <TouchableOpacity 
                onPress={() => setViewMode('list')}
                className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-700' : ''}`}
              >
                <Ionicons name="list" size={20} color={viewMode === 'list' ? '#fff' : '#94A3B8'} />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setViewMode('map')}
                className={`p-2 rounded-md ${viewMode === 'map' ? 'bg-gray-700' : ''}`}
              >
                <Ionicons name="map" size={20} color={viewMode === 'map' ? '#fff' : '#94A3B8'} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Search Bar */}
      <View className="bg-card border border-gray-800 rounded-xl flex-row items-center px-4 py-3 mb-4">
        <Ionicons name="search" size={20} color="#94A3B8" />
        <TextInput 
          placeholder="Search samples..." 
          placeholderTextColor="#64748B"
          className="flex-1 ml-3 text-white font-medium"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 max-h-10">
        {['All', 'Verified', 'Pending', 'Failed'].map((f, i) => (
          <TouchableOpacity 
            key={i} 
            onPress={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-full mr-2 ${statusFilter === f ? 'bg-accent' : 'bg-card border border-gray-700'}`}
          >
            <Text className={`text-sm font-medium ${statusFilter === f ? 'text-background' : 'text-gray-300'}`}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {viewMode === 'list' ? (
        <FlatList
          data={filteredSamples}
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
      ) : (
        <View className="flex-1 rounded-xl overflow-hidden border border-gray-800">
          {Platform.OS === 'web' ? (
             <View className="flex-1 items-center justify-center bg-card">
               <Text className="text-white">Map view not supported on web</Text>
             </View>
          ) : (
            <MapView
              style={{ flex: 1 }}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: 3.0,
                longitude: 78.0,
                latitudeDelta: 15,
                longitudeDelta: 15,
              }}
              customMapStyle={[
                {
                  "elementType": "geometry",
                  "stylers": [{ "color": "#242f3e" }]
                },
                {
                  "elementType": "labels.text.fill",
                  "stylers": [{ "color": "#746855" }]
                },
                {
                  "elementType": "labels.text.stroke",
                  "stylers": [{ "color": "#242f3e" }]
                },
                {
                  "featureType": "administrative.locality",
                  "elementType": "labels.text.fill",
                  "stylers": [{ "color": "#d59563" }]
                },
                {
                  "featureType": "poi",
                  "elementType": "labels.text.fill",
                  "stylers": [{ "color": "#d59563" }]
                },
                {
                  "featureType": "poi.park",
                  "elementType": "geometry",
                  "stylers": [{ "color": "#263c3f" }]
                },
                {
                  "featureType": "poi.park",
                  "elementType": "labels.text.fill",
                  "stylers": [{ "color": "#6b9a76" }]
                },
                {
                  "featureType": "road",
                  "elementType": "geometry",
                  "stylers": [{ "color": "#38414e" }]
                },
                {
                  "featureType": "road",
                  "elementType": "geometry.stroke",
                  "stylers": [{ "color": "#212a37" }]
                },
                {
                  "featureType": "road",
                  "elementType": "labels.text.fill",
                  "stylers": [{ "color": "#9ca5b3" }]
                },
                {
                  "featureType": "road.highway",
                  "elementType": "geometry",
                  "stylers": [{ "color": "#746855" }]
                },
                {
                  "featureType": "road.highway",
                  "elementType": "geometry.stroke",
                  "stylers": [{ "color": "#1f2835" }]
                },
                {
                  "featureType": "road.highway",
                  "elementType": "labels.text.fill",
                  "stylers": [{ "color": "#f3d19c" }]
                },
                {
                  "featureType": "transit",
                  "elementType": "geometry",
                  "stylers": [{ "color": "#2f3948" }]
                },
                {
                  "featureType": "transit.station",
                  "elementType": "labels.text.fill",
                  "stylers": [{ "color": "#d59563" }]
                },
                {
                  "featureType": "water",
                  "elementType": "geometry",
                  "stylers": [{ "color": "#17263c" }]
                },
                {
                  "featureType": "water",
                  "elementType": "labels.text.fill",
                  "stylers": [{ "color": "#515c6d" }]
                },
                {
                  "featureType": "water",
                  "elementType": "labels.text.stroke",
                  "stylers": [{ "color": "#17263c" }]
                }
              ]}
            >
              <Heatmap 
                points={filteredSamples
                  .filter(s => s.latitude && s.longitude)
                  .map(s => ({
                    latitude: s.latitude!,
                    longitude: s.longitude!,
                    weight: 1
                  }))
                }
                radius={50}
                opacity={0.8}
                gradient={{
                  colors: ["#79BC6A", "#BBCF4C", "#EEC20B", "#F29305", "#E50000"],
                  startPoints: [0.01, 0.25, 0.5, 0.75, 1],
                  colorMapSize: 256
                }}
              />
              {filteredSamples.map((sample) => (
                sample.latitude && sample.longitude ? (
                  <Marker
                    key={sample.fileId}
                    coordinate={{ latitude: sample.latitude, longitude: sample.longitude }}
                    title={sample.fileName}
                    description={sample.status}
                    pinColor={sample.status === 'complete' ? 'green' : 'red'}
                    onCalloutPress={() => router.push(`/sample/${sample.fileId}` as any)}
                  />
                ) : null
              ))}
            </MapView>
          )}
        </View>
      )}

      {/* Floating Upload Button */}
      <TouchableOpacity
        onPress={handleFilePick}
        disabled={uploading}
        className="absolute bottom-6 right-6 bg-accent w-14 h-14 rounded-xl items-center justify-center shadow-lg"
      >
        {uploading ? (
          <ActivityIndicator color="#0B1121" />
        ) : (
          <Ionicons name="cloud-upload-outline" size={28} color="#0B1121" />
        )}
      </TouchableOpacity>

      {/* Metadata Input Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-card rounded-t-3xl p-6 border-t border-gray-800">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-white">Sample Metadata</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-96">
              <View className="mb-4">
                <Text className="text-gray-400 mb-2 text-sm">Depth (meters)</Text>
                <TextInput
                  className="bg-background border border-gray-700 rounded-lg p-3 text-white"
                  placeholder="e.g. 4500"
                  placeholderTextColor="#64748B"
                  keyboardType="numeric"
                  value={metadata.depth}
                  onChangeText={(text) => setMetadata({...metadata, depth: text})}
                />
              </View>

              <View className="flex-row space-x-4 mb-4">
                <View className="flex-1 mr-2">
                  <Text className="text-gray-400 mb-2 text-sm">Latitude</Text>
                  <TextInput
                    className="bg-background border border-gray-700 rounded-lg p-3 text-white"
                    placeholder="Lat"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={metadata.latitude}
                    onChangeText={(text) => setMetadata({...metadata, latitude: text})}
                  />
                </View>
                <View className="flex-1 ml-2">
                  <Text className="text-gray-400 mb-2 text-sm">Longitude</Text>
                  <TextInput
                    className="bg-background border border-gray-700 rounded-lg p-3 text-white"
                    placeholder="Lng"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={metadata.longitude}
                    onChangeText={(text) => setMetadata({...metadata, longitude: text})}
                  />
                </View>
              </View>

              <View className="mb-6">
                <Text className="text-gray-400 mb-2 text-sm">Collection Date (ISO)</Text>
                <TextInput
                  className="bg-background border border-gray-700 rounded-lg p-3 text-white"
                  value={metadata.collectionTime}
                  editable={false} // For now just read-only, could add date picker
                />
              </View>

              <TouchableOpacity
                onPress={confirmUpload}
                className="bg-accent p-4 rounded-xl items-center mb-4"
              >
                <Text className="text-background font-bold text-lg">Submit & Upload</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
