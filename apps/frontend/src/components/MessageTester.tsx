import React, {useEffect, useState} from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';

const MessageTester = () => {
  const [reply, setReply] = useState<string>('Waiting for server...');

  useEffect(() => {
    const sendMessage = async () => {
      const url =
        Platform.OS === 'android'
          ? 'http://10.0.2.2:3001/api/message'
          : 'http://localhost:3001/api/message';

      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({message: 'Hello from React Native 👋'}),
        });

        const data = await res.json();
        setReply(data.reply);
      } catch (err) {
        console.error('❌ Error:', err);
        setReply('⚠️ Could not reach server.');
      }
    };

    sendMessage();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>React Native ↔ Express Connected</Text>
      <Text style={styles.reply}>{reply}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {fontSize: 18, fontWeight: '600'},
  reply: {marginTop: 20, fontSize: 16, color: 'green'},
});

export default MessageTester;
