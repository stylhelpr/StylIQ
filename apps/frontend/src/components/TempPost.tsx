import React, {useEffect, useState} from 'react';
import {View, Text, Platform} from 'react-native';
import {useAppTheme} from '../context/ThemeContext';

const TempPost = () => {
  const {theme} = useAppTheme();
  const [post, setPost] = useState<{title: string; body: string} | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      const url =
        Platform.OS === 'android'
          ? 'http://10.0.2.2:3001/api/temp-post'
          : 'http://localhost:3001/api/temp-post';

      try {
        const res = await fetch(url);
        const data = await res.json();
        setPost({title: data.title, body: data.body});
      } catch (err) {
        console.error('❌ Error fetching post:', err);
        setPost(null);
      }
    };

    fetchPost();
  }, []);

  if (!post) {
    return <Text style={{color: theme.colors.error}}>Loading post...</Text>;
  }

  return (
    <View style={{marginVertical: theme.spacing.lg}}>
      <Text
        style={{
          fontSize: theme.fontSize.lg,
          fontWeight: theme.fontWeight.bold,
          color: theme.colors.primary,
        }}>
        {post.title}
      </Text>
      <Text
        style={{marginTop: theme.spacing.sm, color: theme.colors.secondary}}>
        {post.body}
      </Text>
    </View>
  );
};

export default TempPost;
