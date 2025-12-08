import React, { useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAnalysisWebSocket } from '../../hooks/useAnalysisWebSocket';
import { useStore } from '../../store/useStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function AnalysisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { 
    logs, 
    progress, 
    clusteringResult, 
    verificationUpdates, 
    status, 
    errorMessage,
    sampleStatus
  } = useAnalysisWebSocket(id);

  const { getSample } = useStore();
  const sample = getSample(id);

  if (!sample) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-white">Sample not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Stack.Screen options={{ 
        headerShown: true,
        title: 'Analysis Details',
        headerStyle: { backgroundColor: '#0B1121' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={24} color="white" />
          </TouchableOpacity>
        )
      }} />
      
      <ScrollView className="flex-1 p-4">
        <Text className="text-3xl font-bold text-white mb-1">Analysis #{sample.sampleId || 'PENDING'}</Text>
        <Text className="text-gray-500 mb-6">Completed on {new Date().toLocaleDateString()}</Text>

        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between mb-4">
          <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800 mb-4">
            <Text className="text-gray-400 mb-2">Sequences</Text>
            <Text className="text-white font-bold text-2xl">
              {clusteringResult?.total_sequences?.toLocaleString() || '...'}
            </Text>
          </View>
          <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800 mb-4">
            <Text className="text-gray-400 mb-2">Clusters</Text>
            <Text className="text-white font-bold text-2xl">
              {clusteringResult?.num_clusters?.toLocaleString() || '...'}
            </Text>
          </View>
          <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800">
            <Text className="text-gray-400 mb-2">Novel Clusters</Text>
            <Text className="text-white font-bold text-2xl">
              {clusteringResult?.num_novel_clusters?.toLocaleString() || '...'}
            </Text>
          </View>
          <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800">
            <Text className="text-gray-400 mb-2">Alpha Diversity</Text>
            <Text className="text-white font-bold text-2xl">0.89</Text>
          </View>
        </View>

        {/* Cluster Visualization */}
        <View className="bg-card p-4 rounded-xl border border-gray-800 mb-4">
          <Text className="text-white font-bold text-lg mb-4">Cluster Visualization</Text>
          <View className="h-64 bg-black rounded-lg items-center justify-center overflow-hidden">
             {/* Placeholder for 3D blob - using a simple view or icon for now */}
             <View className="w-32 h-32 bg-blue-500/20 rounded-full blur-3xl absolute top-10 left-10" />
             <View className="w-32 h-32 bg-red-500/20 rounded-full blur-3xl absolute bottom-10 right-10" />
             <MaterialCommunityIcons name="molecule" size={80} color="#4ADE80" />
             {status === 'running' && <ActivityIndicator size="large" color="#4ADE80" className="absolute" />}
          </View>
        </View>

        {/* On-Chain Details */}
        <View className="bg-card p-4 rounded-xl border border-gray-800 mb-6">
          <Text className="text-white font-bold text-lg mb-4">On-Chain Details</Text>
          
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-gray-400 text-xs mb-1">Analysis Hash</Text>
              <Text className="text-white font-mono">0x1a2b...c3d4</Text>
            </View>
            <Ionicons name="copy-outline" size={20} color="#4ADE80" />
          </View>

          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-gray-400 text-xs mb-1">AI Model Hash</Text>
              <Text className="text-white font-mono">0x5e6f...g7h8</Text>
            </View>
            <Ionicons name="copy-outline" size={20} color="#4ADE80" />
          </View>

          <View>
            <Text className="text-gray-400 text-xs mb-1">ZK Verification</Text>
            <View className="flex-row items-center">
              <Ionicons name="checkmark-circle" size={16} color="#4ADE80" style={{ marginRight: 4 }} />
              <Text className="text-green-400 font-bold">Verified</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity className="bg-accent p-4 rounded-xl items-center mb-8">
          <Text className="text-background font-bold text-lg">View Full Report</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
