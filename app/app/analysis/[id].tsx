import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function AnalysisDetailScreen() {
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

  const analysis = sample.latestAnalysis || {};
  let clusters = analysis.cluster_summary || [];

  // Fallback for new backend structure if cluster_summary is missing but top_groups exists
  if (clusters.length === 0 && analysis.top_groups) {
    clusters = analysis.top_groups.map((group: any) => {
      const update = sample.verificationUpdates?.find((u: any) => u.cluster_id === group.group_id);
      
      let novelty_score = 0;
      let name = `Cluster ${group.group_id}`;
      
      if (update) {
        if (update.match_percentage !== undefined) {
          novelty_score = 1 - (update.match_percentage / 100);
        }
        if (update.description) {
          name = update.description.split('(')[0].trim();
        }
      }
      
      return {
        cluster_id: name,
        size: group.count,
        novelty_score: novelty_score
      };
    });
  }

  const totalSequences = analysis.total_sequences || analysis.total_reads || analysis.count || 0;

  // Calculate Analytics
  const analytics = useMemo(() => {
    if (!clusters.length) return null;

    let novelCount = 0;
    let knownCount = 0;
    let totalClusters = clusters.length;

    clusters.forEach((c: any) => {
      if (c.novelty_score > 0.7) novelCount++;
      else knownCount++;
    });

    return {
      novelCount,
      knownCount,
      totalClusters,
      novelPercentage: (novelCount / totalClusters) * 100,
      knownPercentage: (knownCount / totalClusters) * 100
    };
  }, [clusters]);

  const renderClusterItem = ({ item, index }: { item: any, index: number }) => {
    const isNovel = item.novelty_score > 0.7;
    
    return (
      <View className={`bg-card p-4 rounded-xl border mb-3 ${isNovel ? 'border-purple-500/50' : 'border-gray-800'}`}>
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-row items-center">
            <Text className="text-white font-bold text-lg mr-2">{item.cluster_id}</Text>
            {isNovel && (
              <View className="bg-purple-900/50 px-2 py-0.5 rounded border border-purple-500/30">
                <Text className="text-purple-300 text-[10px] font-bold">NOVEL</Text>
              </View>
            )}
          </View>
          <View className={`${isNovel ? 'bg-purple-900/30' : 'bg-green-900/30'} px-2 py-1 rounded-md`}>
            <Text className={`${isNovel ? 'text-purple-400' : 'text-green-400'} text-xs font-bold`}>
              {(item.novelty_score * 100).toFixed(1)}% Novelty
            </Text>
          </View>
        </View>
        
        <View className="flex-row justify-between mb-2">
          <View>
            <Text className="text-gray-500 text-xs">Size</Text>
            <Text className="text-accent font-medium">{item.size} Sequences</Text>
          </View>
          <View>
            <Text className="text-gray-500 text-xs">Status</Text>
            <Text className="text-white font-medium">{isNovel ? 'Unidentified' : 'Known'}</Text>
          </View>
        </View>

        <View className="mt-2 pt-2 border-t border-gray-800">
           <View className="h-2 bg-gray-800 rounded-full overflow-hidden">
             <View 
               className={`h-full ${isNovel ? 'bg-purple-500' : 'bg-green-500'}`} 
               style={{ width: `${item.novelty_score * 100}%` }} 
             />
           </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
      <Stack.Screen options={{ 
        headerShown: true,
        title: 'Analysis Results',
        headerStyle: { backgroundColor: '#0B1121' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
        ),
      }} />
      
      <FlatList
        data={clusters}
        renderItem={renderClusterItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="mb-6">
            <View className="flex-row justify-between items-center mb-6">
              <View>
                <Text className="text-3xl font-bold text-white">Clusters</Text>
                <Text className="text-gray-500">DNA Clustering Analysis</Text>
              </View>
              <View className="bg-card px-4 py-2 rounded-xl border border-gray-800 items-center">
                <Text className="text-gray-400 text-xs">Total Sequences</Text>
                <Text className="text-white font-bold text-xl">{totalSequences}</Text>
              </View>
            </View>

            {analytics && (
              <>
                {/* Novelty Alert */}
                {analytics.novelCount > 0 && (
                  <View className="bg-purple-900/20 border border-purple-500/50 p-4 rounded-xl mb-4 flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <View className="w-10 h-10 rounded-full bg-purple-500/20 items-center justify-center mr-3">
                        <MaterialCommunityIcons name="dna" size={24} color="#D8B4FE" />
                      </View>
                      <View>
                        <Text className="text-white font-bold text-lg">Novel Lineages Found</Text>
                        <Text className="text-purple-200 text-xs">
                          {analytics.novelCount} clusters identified as potential novel species.
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Distribution Chart */}
                <View className="bg-card p-4 rounded-xl border border-gray-800 mb-4">
                  <Text className="text-white font-bold mb-4">Cluster Distribution</Text>
                  <View className="flex-row h-4 rounded-full overflow-hidden mb-2">
                    <View className="bg-purple-500 h-full" style={{ width: `${analytics.novelPercentage}%` }} />
                    <View className="bg-green-500 h-full" style={{ width: `${analytics.knownPercentage}%` }} />
                  </View>
                  <View className="flex-row justify-between">
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 rounded-full bg-purple-500 mr-1" />
                      <Text className="text-gray-400 text-xs">Novel ({analytics.novelCount})</Text>
                    </View>
                    <View className="flex-row items-center">
                      <View className="w-2 h-2 rounded-full bg-green-500 mr-1" />
                      <Text className="text-gray-400 text-xs">Known ({analytics.knownCount})</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
            
            <Text className="text-white font-bold text-lg mt-2 mb-2">Detailed Clusters</Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center justify-center mt-10">
            <Text className="text-gray-500">No clusters found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
