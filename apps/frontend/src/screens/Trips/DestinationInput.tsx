import React, {useCallback} from 'react';
import {
  View,
  TextInput,
  FlatList,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {tokens} from '../../styles/tokens/tokens';
import {GeocodeSuggestion, useGeocodeSearch} from './useGeocodeSearch';

type Props = {
  value: GeocodeSuggestion | null;
  onSelect: (suggestion: GeocodeSuggestion) => void;
  onClear: () => void;
};

const DestinationInput = ({value, onSelect, onClear}: Props) => {
  const {theme} = useAppTheme();
  const {query, setQuery, suggestions, isSearching, clear} =
    useGeocodeSearch();

  const handleSelect = useCallback(
    (suggestion: GeocodeSuggestion) => {
      onSelect(suggestion);
      clear();
    },
    [onSelect, clear],
  );

  const handleClear = useCallback(() => {
    onClear();
    clear();
  }, [onClear, clear]);

  const showDropdown = !value && suggestions.length > 0;

  const styles = StyleSheet.create({
    wrapper: {
      zIndex: 10,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.lg,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      paddingHorizontal: 16,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.colors.foreground,
      fontWeight: '500',
    },
    clearBtn: {
      padding: 4,
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: theme.colors.surface,
      borderRadius: tokens.borderRadius.lg,
      borderWidth: tokens.borderWidth.hairline,
      borderColor: theme.colors.surfaceBorder,
      marginTop: 4,
      maxHeight: 220,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
    },
    suggestionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: tokens.borderWidth.hairline,
      borderBottomColor: theme.colors.surfaceBorder,
    },
    suggestionText: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.foreground,
      flex: 1,
    },
  });

  return (
    <View style={styles.wrapper}>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={value ? value.displayName : query}
          onChangeText={value ? undefined : setQuery}
          editable={!value}
          placeholder="Where are you going?"
          placeholderTextColor={theme.colors.foreground2}
          autoCapitalize="words"
          returnKeyType="done"
        />
        {isSearching && <ActivityIndicator size="small" color={theme.colors.foreground2} />}
        {value && (
          <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
            <Icon name="close" size={18} color={theme.colors.foreground2} />
          </Pressable>
        )}
      </View>

      {showDropdown && (
        <View style={styles.dropdown}>
          <FlatList
            data={suggestions}
            keyExtractor={item => item.placeKey}
            keyboardShouldPersistTaps="handled"
            renderItem={({item}) => (
              <Pressable
                style={styles.suggestionRow}
                onPress={() => handleSelect(item)}>
                <Icon
                  name="location-on"
                  size={18}
                  color={theme.colors.foreground2}
                />
                <Text style={styles.suggestionText}>{item.displayName}</Text>
              </Pressable>
            )}
          />
        </View>
      )}
    </View>
  );
};

export default DestinationInput;
