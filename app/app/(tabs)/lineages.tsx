import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const MOCK_LINEAGES = [
  { id: 'CL_2023_A4B8', date: '2023-10-26', score: 0.92, status: 'NOVEL', label: 'Extremely High' },
  { id: 'CL_2023_B2C1', date: '2023-09-15', score: 0.35, status: 'KNOWN', label: 'Low' },
  { id: 'CL_2022_D9E5', date: '2022-11-02', score: 0.82, status: 'NOVEL', label: 'High' },
];

export default function LineagesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState('All');

  const renderItem = ({ item }: { item: typeof MOCK_LINEAGES[0] }) => (
    <TouchableOpacity 
      className="bg-card p-4 mb-3 rounded-xl border border-gray-800"
      onPress={() => router.push(`/lineage/${item.id}` as any)}
    >
      <View className="flex-row justify-between items-start mb-4">
        <View>
          <Text className="font-bold text-lg text-white">{item.id}</Text>
          <Text className="text-gray-500 text-xs">Discovered: {item.date}</Text>
        </View>
        <View className="flex-row items-center">
          <View className={`px-2 py-1 rounded-md mr-2 ${
            item.status === 'NOVEL' ? 'bg-purple-900/30' : 'bg-green-900/30'
          }`}>
            <Text className={`text-xs font-bold ${
              item.status === 'NOVEL' ? 'text-purple-400' : 'text-green-400'
            }`}>{item.status}</Text>
          </View>
          <MaterialCommunityIcons name="star-circle" size={20} color="#FBBF24" />
        </View>
      </View>

      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full border-4 border-accent items-center justify-center mr-3">
          <Text className="text-white text-xs font-bold">{item.score}</Text>
        </View>
        <View>
          <Text className="text-gray-400 text-xs">Novelty Score</Text>
          <Text className="text-white font-bold">{item.label}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-background p-4">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Lineages</Text>
        <TouchableOpacity>
          <Ionicons name="person-circle-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="bg-card flex-row items-center p-3 rounded-xl border border-gray-800 mb-4">
        <Ionicons name="search" size={20} color="#64748B" style={{ marginRight: 8 }} />
        <TextInput 
          placeholder="Search by Cluster ID..." 
          placeholderTextColor="#64748B"
          className="flex-1 text-white"
        />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 max-h-10">
        {['All', 'Novel', 'Known', 'Minted'].map((f, i) => (
          <TouchableOpacity 
            key={i} 
            onPress={() => setFilter(f)}
            className={`px-6 py-2 rounded-full mr-2 ${filter === f ? 'bg-accent' : 'bg-card border border-gray-800'}`}
          >
            <Text className={`text-sm font-medium ${filter === f ? 'text-background' : 'text-gray-400'}`}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Slider (Visual Only) */}
      <View className="mb-6">
        <View className="flex-row justify-between mb-2">
          <Text className="text-white font-medium">Novelty Score Threshold</Text>
          <Text className="text-accent font-bold">0.75</Text>
        </View>
        <View className="h-1 bg-gray-800 rounded-full relative">
          <View className="absolute left-0 top-0 bottom-0 w-[75%] bg-accent rounded-full" />
          <View className="absolute left-[75%] top-[-6] w-4 h-4 bg-accent rounded-full shadow-lg" />
        </View>
      </View>

      <FlatList
        data={MOCK_LINEAGES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </SafeAreaView>
  );
}
