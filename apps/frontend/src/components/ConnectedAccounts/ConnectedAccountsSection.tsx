import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, ActivityIndicator, Linking} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useAppTheme} from '../../context/ThemeContext';
import {useGlobalStyles} from '../../styles/useGlobalStyles';
import {tokens} from '../../styles/tokens/tokens';
import AppleTouchFeedback from '../AppleTouchFeedback/AppleTouchFeedback';
import {useConnectedAccountsStore, SocialPlatform} from '../../../../../store/connectedAccountsStore';
import {useUUID} from '../../context/UUIDContext';
import {useOAuthConnect} from '../../hooks/useOAuthConnect';

const SOCIAL_PLATFORMS: Array<{platform: SocialPlatform; label: string; icon: string; color: string}> = [
  {platform: 'instagram', label: 'Instagram', icon: 'instagram', color: '#E1306C'},
  {platform: 'tiktok', label: 'TikTok', icon: 'tiktok', color: '#000000'},
  {platform: 'pinterest', label: 'Pinterest', icon: 'pinterest', color: '#E60023'},
  {platform: 'threads', label: 'Threads', icon: 'threads', color: '#000000'},
  {platform: 'twitter', label: 'Twitter', icon: 'twitter', color: '#1DA1F2'},
  {platform: 'facebook', label: 'Facebook', icon: 'facebook', color: '#1877F2'},
  {platform: 'linkedin', label: 'LinkedIn', icon: 'linkedin', color: '#0A66C2'},
];

interface ConnectedAccountsProps {
  onConnect?: (platform: SocialPlatform) => Promise<void>;
  onDisconnect?: (platform: SocialPlatform) => Promise<void>;
}

export default function ConnectedAccountsSection({onConnect, onDisconnect}: ConnectedAccountsProps) {
  const {theme} = useAppTheme();
  const globalStyles = useGlobalStyles();
  const userId = useUUID();
  const [localLoading, setLocalLoading] = useState<SocialPlatform | null>(null);

  const {accounts, loading, fetchConnectedAccounts, disconnectAccount} = useConnectedAccountsStore();
  const {initiateOAuthFlow, error: oauthError, loading: oauthLoading} = useOAuthConnect();

  // Fetch connected accounts on mount
  useEffect(() => {
    if (userId) {
      fetchConnectedAccounts(userId);
    }
  }, [userId, fetchConnectedAccounts]);

  // Listen for OAuth callback via deep linking
  // When user authorizes and returns to app, automatically refresh accounts
  useEffect(() => {
    const handleDeepLink = ({url}: {url: string}) => {
      const route = url.replace(/.*?:\/\//g, '');
      const parts = route.split('/');

      if (parts[0] === 'oauth' && parts[1] === 'callback') {
        const platform = parts[2];
        console.log(`[ConnectedAccounts] OAuth callback received for ${platform}`);

        // Refresh accounts list to show the newly connected account
        if (userId) {
          setTimeout(() => {
            fetchConnectedAccounts(userId);
          }, 500);
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    return () => {
      subscription.remove();
    };
  }, [userId, fetchConnectedAccounts]);

  const handleConnect = async (platform: SocialPlatform) => {
    try {
      setLocalLoading(platform);

      // Use custom onConnect handler if provided
      if (onConnect) {
        await onConnect(platform);
        setLocalLoading(null);
        return;
      }

      // Otherwise, use direct OAuth flow
      if (!userId) {
        throw new Error('User ID not found');
      }

      const success = await initiateOAuthFlow(platform, userId);

      if (success) {
        // OAuth flow initiated successfully
        // After user authenticates with the social platform:
        // 1. They're redirected to your backend's OAuth callback endpoint
        // 2. Backend exchanges the auth code for an access token
        // 3. Backend fetches the user's account info from the social platform API
        // 4. Backend stores the connected account in the database
        // 5. User can use deep linking or manual refresh to see updated accounts
        console.log(`[ConnectedAccounts] OAuth flow initiated for ${platform}`);
      }
    } catch (error) {
      console.error(`Failed to connect ${platform}:`, error);
    } finally {
      setLocalLoading(null);
    }
  };

  const handleDisconnect = async (platform: SocialPlatform) => {
    try {
      setLocalLoading(platform);
      if (onDisconnect) {
        await onDisconnect(platform);
      } else if (userId) {
        await disconnectAccount(userId, platform);
      }
    } catch (error) {
      console.error(`Failed to disconnect ${platform}:`, error);
    } finally {
      setLocalLoading(null);
    }
  };

  return (
    <Animatable.View animation="fadeInUp" delay={2100} style={globalStyles.sectionScroll}>
      <Text style={globalStyles.sectionTitle}>Connected Accounts</Text>
      <Text
        style={[
          globalStyles.subLabel,
          {
            marginBottom: 16,
            color: theme.colors.foreground,
            fontSize: 13,
          },
        ]}>
        Connect your social accounts to share looks and stay in sync
      </Text>
      {oauthError && (
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 8,
            padding: 12,
            marginBottom: 16,
            borderLeftWidth: 4,
            borderLeftColor: '#FF6B6B',
          }}>
          <Text
            style={{
              color: theme.colors.foreground,
              fontSize: 12,
              lineHeight: 16,
            }}>
            ⚠️ {oauthError}
          </Text>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.button1} />
        </View>
      ) : (
        <View style={styles.gridContainer}>
          {SOCIAL_PLATFORMS.map((socialPlatform, index) => {
            const account = accounts[socialPlatform.platform];
            const isConnected = account?.isConnected || false;
            const isLoading = localLoading === socialPlatform.platform;

            return (
              <Animatable.View
                key={socialPlatform.platform}
                animation="bounceInUp"
                delay={2200 + index * 100}
                useNativeDriver
                style={styles.cardWrapper}>
                <AppleTouchFeedback
                  onPress={() =>
                    isConnected
                      ? handleDisconnect(socialPlatform.platform)
                      : handleConnect(socialPlatform.platform)
                  }
                  disabled={isLoading}
                  hapticStyle="impactLight"
                  style={[
                    styles.accountCard,
                    {
                      backgroundColor: isConnected ? theme.colors.surface : theme.colors.background,
                      borderColor: isConnected ? socialPlatform.color : theme.colors.muted,
                      borderWidth: 1.5,
                    },
                  ]}>
                  {isLoading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="small" color={theme.colors.button1} />
                    </View>
                  )}

                  <Icon
                    name={socialPlatform.icon}
                    color={socialPlatform.color}
                    size={28}
                    style={{marginBottom: 8}}
                  />

                  <Text
                    style={[
                      styles.platformLabel,
                      {
                        color: theme.colors.foreground,
                        fontWeight: isConnected ? tokens.fontWeight.bold : tokens.fontWeight.medium,
                      },
                    ]}>
                    {socialPlatform.label}
                  </Text>

                  <View style={styles.statusContainer}>
                    {isConnected ? (
                      <>
                        <Icon name="check-circle" size={16} color={socialPlatform.color} />
                        <Text
                          style={[
                            styles.statusText,
                            {color: socialPlatform.color, fontWeight: tokens.fontWeight.medium},
                          ]}>
                          Connected
                        </Text>
                      </>
                    ) : (
                      <>
                        <Icon name="add-circle-outline" size={16} color={theme.colors.foreground} />
                        <Text
                          style={[
                            styles.statusText,
                            {color: theme.colors.foreground, opacity: 0.6},
                          ]}>
                          Connect
                        </Text>
                      </>
                    )}
                  </View>
                </AppleTouchFeedback>
              </Animatable.View>
            );
          })}
        </View>
      )}
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardWrapper: {
    width: '48%',
  },
  accountCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  platformLabel: {
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
  },
});
