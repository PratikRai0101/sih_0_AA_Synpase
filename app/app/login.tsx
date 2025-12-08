import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center p-6">
      <View className="items-center mb-20">
        <View className="w-24 h-24 bg-card rounded-3xl items-center justify-center mb-6 shadow-lg border border-gray-800">
          <MaterialCommunityIcons name="waves" size={48} color="#fff" />
        </View>
        <Text className="text-4xl font-bold text-white mb-2">SamudraSetu</Text>
        <Text className="text-gray-400 text-lg">Explore eDNA with AI & Blockchain</Text>
      </View>

      <View className="w-full mb-8">
        <TouchableOpacity 
          className="bg-blue-600 p-4 rounded-xl flex-row justify-center items-center mb-6"
          onPress={() => router.replace('/(tabs)')}
        >
          <Ionicons name="wallet-outline" size={24} color="white" style={{ marginRight: 10 }} />
          <Text className="text-white font-bold text-lg">Connect Wallet with Thirdweb</Text>
        </TouchableOpacity>

        <TouchableOpacity className="items-center">
          <Text className="text-gray-500 underline">Learn more about wallets</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-center w-full absolute bottom-10">
        <TouchableOpacity className="mr-6">
          <Text className="text-gray-600 text-xs underline">Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text className="text-gray-600 text-xs underline">Privacy Policy</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
