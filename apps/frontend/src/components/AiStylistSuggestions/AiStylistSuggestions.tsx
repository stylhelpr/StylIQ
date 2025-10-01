// src/components/AiStylistSuggestions/AiStylistSuggestions.tsx
import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Animatable from 'react-native-animatable';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';

type Props = {
  theme: any;
  weather: any;
  globalStyles: any;
  navigate: (screen: string, params?: any) => void;
};

const AiStylistSuggestions: React.FC<Props> = ({
  theme,
  weather,
  globalStyles,
  navigate,
}) => {
  // 🧠 AI Suggestion Text logic
  const getSuggestionText = () => {
    if (!weather?.fahrenheit?.main?.temp)
      return 'Loading your style suggestions...';

    const temp = weather.fahrenheit.main.temp;

    if (temp < 60) {
      return 'Cool out — layer a knit under a trench with your loafers.';
    } else if (temp > 85) {
      return 'Warm day — go linen trousers and a Cuban shirt.';
    } else {
      return 'Perfect weather — chinos, polo, and monk straps.';
    }
  };

  return (
    <Animatable.View
      animation="fadeInUp"
      delay={200}
      duration={700}
      useNativeDriver
      style={{
        marginHorizontal: 16,
        marginBottom: 20,
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        padding: 16,
      }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: 10,
        }}>
        <Icon
          name="stars"
          size={22}
          color={theme.colors.button1}
          style={{marginRight: 8}}
        />
        <Text
          style={{
            fontSize: 17,
            fontWeight: '700',
            color: theme.colors.foreground,
          }}>
          AI Stylist Suggests
        </Text>
      </View>

      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: theme.colors.foreground2,
          lineHeight: 20,
          marginBottom: 12,
        }}>
        {getSuggestionText()}
      </Text>

      <AppleTouchFeedback
        hapticStyle="impactHeavy"
        style={[
          globalStyles.buttonPrimary,
          {paddingVertical: 10, borderRadius: 12},
        ]}
        onPress={() => navigate('Outfit')}>
        <Text style={globalStyles.buttonPrimaryText}>Get Styled</Text>
      </AppleTouchFeedback>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 12,
        }}>
        <TouchableOpacity onPress={() => navigate('Wardrobe')}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.button1,
              textDecorationLine: 'underline',
            }}>
            View Missing Pieces
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigate('AiStylistChatScreen')}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.button1,
              textDecorationLine: 'underline',
            }}>
            Ask a Question →
          </Text>
        </TouchableOpacity>
      </View>
    </Animatable.View>
  );
};

export default AiStylistSuggestions;
