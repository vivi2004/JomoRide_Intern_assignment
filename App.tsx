import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useDutyQueue } from './src/hooks/useDutyQueue';

export default function App() {
  const {
    networkStatus,
    dutyStatus,
    pendingCount,
    message,
    handleStartDuty,
  } = useDutyQueue();

  const isOnline = networkStatus === 'online';
  const isChecking = networkStatus === 'checking';
  const isBusy = dutyStatus === 'syncing';

  const networkTitle = isChecking
    ? 'Checking connection'
    : isOnline
      ? 'Internet connected'
      : 'No internet connection';

  const networkDescription = isChecking
    ? 'Please wait'
    : isOnline
      ? 'You are ready to start'
      : 'Offline mode';

  const dutyTitle =
    dutyStatus === 'success'
      ? 'Duty Started Successfully'
      : dutyStatus === 'queued'
        ? 'Duty start queued'
        : dutyStatus === 'syncing'
          ? 'Syncing duty...'
          : dutyStatus === 'error'
            ? 'Sync needs attention'
            : 'Ready to start duty';

  const statusMessage =
    dutyStatus === 'queued'
      ? 'Saved offline, waiting for network...'
      : message;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>J</Text>
          </View>
          <View style={styles.brandContainer}>
            <Text style={styles.brand}>JomoRide</Text>
            <Text style={styles.subtitle}>DRIVER PARTNER</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.eyebrow}>YOUR SHIFT</Text>
          <Text style={styles.heading}>Ready to hit the road?</Text>
          <Text style={styles.description}>
            Start your duty when you are ready. If your connection drops,
            your action will be saved on this device and queued for syncing.
          </Text>

          <View style={styles.networkBox}>
            <View
              style={[
                styles.networkDot,
                isOnline
                  ? styles.onlineDot
                  : isChecking
                    ? styles.unknownDot
                    : styles.offlineDot,
              ]}
            />
            <View style={styles.networkTextContainer}>
              <Text style={styles.networkTitle}>{networkTitle}</Text>
              <Text style={styles.networkDescription}>
                {networkDescription}
              </Text>
            </View>
            {isChecking && <ActivityIndicator color="#3156D3" />}
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>DUTY STATUS</Text>
            <Text style={styles.statusTitle}>{dutyTitle}</Text>
            <Text style={styles.message}>{statusMessage}</Text>
            <View style={styles.pendingRow}>
              <Text style={styles.pendingLabel}>Pending actions</Text>
              <Text style={styles.pendingValue}>{pendingCount}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              (isChecking || isBusy) && styles.buttonDisabled,
            ]}
            onPress={() => void handleStartDuty()}
            disabled={isChecking || isBusy}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Start Duty"
          >
            {isBusy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Start Duty</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>JomoRide Driver</Text>
          <Text style={styles.footerText}>
            Built for reliable duty management.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    marginBottom: 30,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#172B4D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  brandContainer: {
    flex: 1,
  },
  brand: {
    color: '#172B4D',
    fontSize: 21,
    fontWeight: '800',
  },
  subtitle: {
    color: '#778198',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    shadowColor: '#172B4D',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  eyebrow: {
    color: '#3156D3',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heading: {
    color: '#172B4D',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  description: {
    color: '#737F95',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 24,
  },
  networkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
    padding: 15,
    borderRadius: 16,
    marginBottom: 16,
  },
  networkDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    marginRight: 12,
  },
  onlineDot: {
    backgroundColor: '#16A36A',
  },
  offlineDot: {
    backgroundColor: '#DC4545',
  },
  unknownDot: {
    backgroundColor: '#E0A126',
  },
  networkTextContainer: {
    flex: 1,
  },
  networkTitle: {
    color: '#172B4D',
    fontSize: 14,
    fontWeight: '700',
  },
  networkDescription: {
    color: '#778198',
    fontSize: 12,
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#F8F9FC',
    borderWidth: 1,
    borderColor: '#E9EDF4',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  statusLabel: {
    color: '#778198',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  statusTitle: {
    color: '#172B4D',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
  },
  message: {
    color: '#34415A',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E9EDF4',
    marginTop: 14,
    paddingTop: 12,
  },
  pendingLabel: {
    color: '#778198',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingValue: {
    color: '#172B4D',
    fontSize: 14,
    fontWeight: '800',
  },
  button: {
    backgroundColor: '#172B4D',
    paddingVertical: 17,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 26,
  },
  footerTitle: {
    color: '#34415A',
    fontSize: 12,
    fontWeight: '700',
  },
  footerText: {
    color: '#929BAE',
    fontSize: 11,
    marginTop: 5,
  },
});
