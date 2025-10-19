import React from 'react';
import {View, Text, Platform} from 'react-native';
import {useQuery} from '@tanstack/react-query';

const fetchPost = async () => {
  const url =
    Platform.OS === 'android'
      ? 'http://10.0.2.2:3001/api/temp-post'
      : 'http://localhost:3001/api/temp-post';

  const res = await fetch(url);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
};

const TestReactQuery = () => {
  const {data, isLoading, isError, error} = useQuery({
    queryKey: ['test-post'],
    queryFn: fetchPost,
  });

  if (isLoading) return <Text>Loading post...</Text>;
  if (isError) return <Text>Error: {(error as Error).message}</Text>;

  return (
    <View style={{marginTop: 20}}>
      <Text style={{fontWeight: 'bold'}}>✅ React Query Fetched:</Text>
      <Text>{data.title}</Text>
    </View>
  );
};

export default TestReactQuery;
