import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function LineageDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Stack.Screen options={{ 
        headerShown: true,
        title: 'Lineage Details',
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
        <Text className="text-3xl font-bold text-white mb-4">{id || 'ASV-12345'}</Text>

        {/* Novelty Banner */}
        <View className="bg-red-900/20 border border-red-900/50 p-3 rounded-lg flex-row items-center mb-6">
          <MaterialCommunityIcons name="flask" size={20} color="#FCA5A5" />
          <Text className="text-red-200 ml-2 font-medium">Novelty Score: 98.7%</Text>
        </View>

        <Text className="text-white font-bold text-lg mb-4">Summary</Text>

        <View className="bg-card rounded-xl border border-gray-800 mb-8">
          <View className="flex-row justify-between p-4 border-b border-gray-800">
            <Text className="text-gray-400">Closest Match</Text>
            <Text className="text-white font-medium">Acantharea</Text>
          </View>
          <View className="flex-row justify-between p-4 border-b border-gray-800">
            <Text className="text-gray-400">Confidence Score</Text>
            <Text className="text-white font-medium">92%</Text>
          </View>
          <View className="flex-row justify-between p-4 border-b border-gray-800">
            <Text className="text-gray-400">Geographic Origin</Text>
            <Text className="text-white font-medium">Mariana Trench</Text>
          </View>
          <View className="flex-row justify-between p-4">
            <Text className="text-gray-400">Date First Detected</Text>
            <Text className="text-white font-medium">2023-10-26</Text>
          </View>
        </View>

        <Text className="text-white font-bold text-lg mb-2">Taxon Passport NFT</Text>
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-gray-400">Token ID</Text>
          <Text className="text-blue-400">Not minted yet</Text>
        </View>

        <TouchableOpacity className="bg-primary p-4 rounded-xl flex-row justify-center items-center mb-8">
          <MaterialCommunityIcons name="shield-check" size={20} color="white" style={{ marginRight: 8 }} />
          <Text className="text-white font-bold text-lg">Mint Taxon Passport</Text>
        </TouchableOpacity>

        <Text className="text-white font-bold text-lg mb-4">Linked Samples & Analyses</Text>

        {['SAMPLE-001', 'SAMPLE-007', 'SAMPLE-019'].map((s, i) => (
          <TouchableOpacity key={i} className="bg-card p-4 rounded-xl border border-gray-800 mb-3 flex-row justify-between items-center">
            <View>
              <Text className="text-white font-bold mb-1">{s}</Text>
              <Text className="text-gray-400 text-xs">2024-05-10 - Positive Detection</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}
