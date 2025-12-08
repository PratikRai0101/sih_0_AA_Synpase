import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function SampleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
        title: 'Sample Details',
        headerStyle: { backgroundColor: '#0B1121' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        )
      }} />
      
      <ScrollView className="flex-1 p-4">
        <Text className="text-3xl font-bold text-white mb-6">{sample.fileName}</Text>

        {/* Info Cards */}
        <View className="flex-row justify-between mb-4">
          <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800">
            <View className="flex-row items-center mb-2">
              <MaterialCommunityIcons name="ferry" size={20} color="#64748B" />
              <Text className="text-gray-400 ml-2">Cruise</Text>
            </View>
            <Text className="text-white font-bold text-lg">RV Atlantis</Text>
          </View>
          <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800">
            <View className="flex-row items-center mb-2">
              <MaterialCommunityIcons name="waves" size={20} color="#64748B" />
              <Text className="text-gray-400 ml-2">Water Depth</Text>
            </View>
            <Text className="text-white font-bold text-lg">2500m</Text>
          </View>
        </View>

        <View className="bg-card p-4 rounded-xl border border-gray-800 mb-4">
          <View className="flex-row items-center mb-2">
            <MaterialCommunityIcons name="calendar" size={20} color="#64748B" />
            <Text className="text-gray-400 ml-2">Date</Text>
          </View>
          <Text className="text-white font-bold text-lg">2024-07-22</Text>
        </View>

        {/* Accordions */}
        <View className="bg-card rounded-xl border border-gray-800 mb-4 overflow-hidden">
          <TouchableOpacity className="flex-row justify-between items-center p-4">
            <Text className="text-white font-medium">Metadata</Text>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View className="bg-card rounded-xl border border-gray-800 mb-4 overflow-hidden">
          <TouchableOpacity className="flex-row justify-between items-center p-4">
            <Text className="text-white font-medium">On-Chain Provenance</Text>
            <Ionicons name="chevron-down" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Analyses List */}
        <View className="bg-card rounded-xl border border-gray-800 mb-8 p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white font-medium text-lg">Analyses</Text>
            <Ionicons name="chevron-up" size={20} color="#64748B" />
          </View>

          <TouchableOpacity 
            className="mb-6"
            onPress={() => router.push(`/analysis/${sample.fileId}`)}
          >
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-white font-medium">Metabarcoding Analysis</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </View>
            <View className="flex-row items-center">
              <View className={`w-2 h-2 rounded-full mr-2 ${
                sample.status === 'complete' ? 'bg-green-500' : 
                sample.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
              }`} />
              <Text className={`${
                sample.status === 'complete' ? 'text-green-500' : 
                sample.status === 'error' ? 'text-red-500' : 'text-blue-500'
              } text-sm`}>
                {sample.status === 'complete' ? 'Completed' : 
                 sample.status === 'error' ? 'Failed' : 'In Progress'}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="mb-6 opacity-50">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-white font-medium">Genomic Sequencing</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
              <Text className="text-blue-500 text-sm">In Progress</Text>
            </View>
          </View>

          <View className="opacity-50">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-white font-medium">AI Species Prediction</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748B" />
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full bg-orange-500 mr-2" />
              <Text className="text-orange-500 text-sm">Pending</Text>
            </View>
          </View>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
