import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.movimientofuncional.oraculo',
  appName: 'Oráculo',
  webDir: 'dist',
  server: {
    allowNavigation: ['fonts.googleapis.com', 'fonts.gstatic.com', 'accounts.google.com'],
    androidScheme: 'https'
  },
  android: {
    appendUserAgent: 'OráculoApp'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#06b6d4',
      showSpinner: false,
      launchAutoHide: true,
      splashImmersive: true
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_oraculo',
      iconColor: '#06b6d4',
      sound: 'alert.mp3'
    },
    GoogleAuth: {
      scopes: ['https://www.googleapis.com/auth/drive.appdata'],
      serverClientId: '113523103085-jdtnfi537aa6contu7h5142h2mbchnqa.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
