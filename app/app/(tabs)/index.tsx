import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function OverviewScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background p-4">
      <View className="flex-row justify-between items-center mb-2">
        <TouchableOpacity>
          <Ionicons name="menu" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <Text className="text-3xl font-bold text-white mb-1">Overview</Text>
      <Text className="text-gray-400 mb-6">Real-time eDNA Network Analysis.</Text>

      <View className="flex-row justify-between mb-4">
        <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800">
          <Text className="text-white font-medium mb-2">Network</Text>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            <Text className="text-green-500 font-bold">Connected</Text>
          </View>
        </View>
        <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800">
          <Text className="text-white font-medium mb-2">Wallet</Text>
          <View className="flex-row items-center">
            <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            <Text className="text-green-500 font-bold">Connected</Text>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between mb-4">
        <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800 h-32 justify-between">
          <MaterialCommunityIcons name="dna" size={24} color="#fff" />
          <View>
            <Text className="text-3xl font-bold text-white">3,402</Text>
            <Text className="text-gray-400 text-xs">Active Samples</Text>
          </View>
        </View>
        <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800 h-32 justify-between">
          <MaterialCommunityIcons name="virus-outline" size={24} color="#fff" />
          <View>
            <Text className="text-3xl font-bold text-white">182</Text>
            <Text className="text-gray-400 text-xs">Novel Lineages</Text>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between mb-6">
        <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800 h-32 justify-between">
          <MaterialCommunityIcons name="leaf" size={24} color="#fff" />
          <View>
            <Text className="text-3xl font-bold text-white">2,150</Text>
            <Text className="text-gray-400 text-xs">Biodiversity Credits</Text>
          </View>
        </View>
        <View className="w-[48%] bg-card p-4 rounded-xl border border-gray-800 h-32 justify-between">
          <MaterialCommunityIcons name="shield-check" size={24} color="#fff" />
          <View>
            <Text className="text-3xl font-bold text-white">Verified</Text>
            <Text className="text-gray-400 text-xs">ZK Status</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity 
        className="bg-card border border-gray-700 p-4 rounded-xl flex-row justify-center items-center mb-4"
        onPress={() => router.push('/(tabs)/samples')}
      >
        <Text className="text-white font-bold text-lg mr-2">Explore Data</Text>
        <Ionicons name="arrow-forward" size={20} color="#fff" />
      </TouchableOpacity>

      <Text className="text-gray-500 text-center text-xs">Last updated: 2 mins ago</Text>
    </SafeAreaView>
  );
}
