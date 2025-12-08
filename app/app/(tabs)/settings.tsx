import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white items-center justify-center">
      <Text className="text-xl font-semibold">Settings</Text>
      <Text className="text-gray-500">App Version 1.0.0</Text>
    </SafeAreaView>
  );
}
