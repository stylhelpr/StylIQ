import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import {useAppTheme} from '../../context/ThemeContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type Props = {
  visible: boolean;
  onClose: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onRemove: () => void;
  position?: {x: number; y: number};
};

export default function ItemContextMenu({
  visible,
  onClose,
  onBringToFront,
  onSendToBack,
  onRemove,
  position,
}: Props) {
  const {theme} = useAppTheme();

  const haptic = () => {
    ReactNativeHapticFeedback.trigger('selection', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
  };

  const handleBringToFront = () => {
    haptic();
    onBringToFront();
    onClose();
  };

  const handleSendToBack = () => {
    haptic();
    onSendToBack();
    onClose();
  };

  const handleRemove = () => {
    ReactNativeHapticFeedback.trigger('notificationWarning', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    onRemove();
    onClose();
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    menu: {
      backgroundColor: theme.colors.surface,
      borderRadius: 14,
      minWidth: 200,
      shadowColor: '#000',
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      overflow: 'hidden',
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.surfaceBorder || 'rgba(0,0,0,0.1)',
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemDanger: {
      backgroundColor: 'rgba(255, 59, 48, 0.08)',
    },
    menuIcon: {
      marginRight: 12,
    },
    menuText: {
      fontSize: 16,
      color: theme.colors.foreground,
      fontWeight: '500',
    },
    menuTextDanger: {
      color: '#FF3B30',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.menu}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleBringToFront}
                activeOpacity={0.7}>
                <MaterialIcons
                  name="flip-to-front"
                  size={22}
                  color={theme.colors.foreground}
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>Bring to Front</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleSendToBack}
                activeOpacity={0.7}>
                <MaterialIcons
                  name="flip-to-back"
                  size={22}
                  color={theme.colors.foreground}
                  style={styles.menuIcon}
                />
                <Text style={styles.menuText}>Send to Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.menuItemLast, styles.menuItemDanger]}
                onPress={handleRemove}
                activeOpacity={0.7}>
                <MaterialIcons
                  name="delete-outline"
                  size={22}
                  color="#FF3B30"
                  style={styles.menuIcon}
                />
                <Text style={[styles.menuText, styles.menuTextDanger]}>
                  Remove
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
