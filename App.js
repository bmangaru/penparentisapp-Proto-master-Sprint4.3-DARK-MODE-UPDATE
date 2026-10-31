// App.js — five tabs: Home · Calendar · Brainstorm · Eventbrite · Community.
// Brainstorm sits center and raised (components/BottomBar.js draws the bar),
// and is its own small stack (a landing screen, then a full-screen typer). On start: a ~2 s logo
// opening (components/IntroSplash.js), then the app plans salon
// reminders, and tapping a notification opens the right place.

import React, { useEffect, useState } from 'react';
import { StatusBar as RNStatusBar } from 'react-native';
import { View, useColorScheme, Appearance } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme, DarkTheme, createNavigationContainerRef } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import EventbriteScreen from './screens/EventbriteScreen';
import BrainstormHomeScreen from './screens/BrainstormHomeScreen';
import BrainstormWriterScreen from './screens/BrainstormWriterScreen';
import MyWritingScreen from './screens/MyWritingScreen';
import DayScreen from './screens/DayScreen';
import MedalsScreen from './screens/MedalsScreen';
import MedalDetailScreen from './screens/MedalDetailScreen';
import CommunitiesScreen from './screens/CommunitiesScreen';
import BottomBar from './components/BottomBar';
import IntroSplash from './components/IntroSplash';
import TourModal from './components/TourModal';
import { loadEvents, upcoming } from './eventsService';
import { onNotificationTap, syncNotifications } from './notify';
import { openLink } from './components/ui';
import { LINKS } from './links';
import { applyScheme, colors } from './theme';
import { effectiveScheme, useAppearance } from './appearance';

const navRef = createNavigationContainerRef();

const Tabs = createMaterialTopTabNavigator();
const BrainstormStackNav = createNativeStackNavigator();


function BrainstormStack() {
  return (
    <BrainstormStackNav.Navigator screenOptions={{ headerShown: false }}>
      <BrainstormStackNav.Screen name="BrainstormHome" component={BrainstormHomeScreen} />
      <BrainstormStackNav.Screen name="BrainstormWriter" component={BrainstormWriterScreen} />
      <BrainstormStackNav.Screen name="MyWriting" component={MyWritingScreen} />
      <BrainstormStackNav.Screen name="BrainstormDay" component={DayScreen} />
      <BrainstormStackNav.Screen name="Medals" component={MedalsScreen} />
      <BrainstormStackNav.Screen name="MedalDetail" component={MedalDetailScreen} />
    </BrainstormStackNav.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tabs.Navigator
      tabBarPosition="bottom"
      initialRouteName="Home"
      tabBar={(props) => <BottomBar {...props} />}
      screenOptions={{ swipeEnabled: true }}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Calendar" component={CalendarScreen} />
      <Tabs.Screen name="Brainstorm" component={BrainstormStack} />
      <Tabs.Screen name="Eventbrite" component={EventbriteScreen} />
      <Tabs.Screen name="Community" component={CommunitiesScreen} />
    </Tabs.Navigator>
  );
}

export default function App() {
  // The short logo + pen opening, once per launch.
  const [intro, setIntro] = useState(true);

  // Keep salon reminders and the new-episode check current, from app start.
  useEffect(() => {
    loadEvents().then((r) => syncNotifications({ events: upcoming(r.events), podcast: r.podcast })).catch(() => {});
  }, []);

  // Tapping a notification: a salon reminder opens that event; a new episode opens Spotify.
  useEffect(() => onNotificationTap((data) => {
    if (data.kind === 'episode') { openLink(data.url || LINKS.spotify); return; }
    if (data.kind === 'salon') {
      const go = () => navRef.navigate('Eventbrite', { openEventId: data.eventId, at: Date.now() });
      if (navRef.isReady()) go(); else setTimeout(go, 600);
    }
  }), []);

  // Appearance (Settings): System / Light / Dark. The colours are applied
  // before drawing; switching redraws the app (key) but keeps your place
  // (the navigation state is handed back in).
  const choice = useAppearance();
  const phone = useColorScheme();
  const scheme = effectiveScheme(choice, phone);
  applyScheme(scheme);
  const navState = React.useRef(undefined);
  // Tell iOS which style the app is in, so its own parts (status bar, the
  // fade it draws at the top of scrolling pages, the keyboard) match the
  // app. Light or Dark picked in Settings → that style; System → whatever
  // the phone is set to. (Before dark mode the app was always light, set in
  // app.json; now app.json says "automatic", so this line does that job.)
  useEffect(() => {
    if (!choice) return;
    try { Appearance.setColorScheme(choice === 'system' ? 'unspecified' : choice); } catch {}
  }, [choice]);

  // Belt and braces: after a redraw, set the status bar back to white text.
  useEffect(() => { const t = setTimeout(() => RNStatusBar.setBarStyle('light-content', false), 50); return () => clearTimeout(t); }, [scheme]);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = { ...base, colors: { ...base.colors, background: colors.paper, card: colors.paper } };

  return (
    <SafeAreaProvider>
      {/* White status-bar text over the blue banners, in both light and dark.
          It lives outside the part that redraws on an Appearance switch, so
          the switch can't reset it to dark text (which also made iOS paint a
          white fade across the top of every banner). */}
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: colors.paper }}>
        {choice ? (
          <NavigationContainer
            key={scheme}
            ref={navRef}
            theme={navTheme}
            initialState={navState.current}
            onStateChange={(st) => { navState.current = st; }}
          >
            <View style={{ flex: 1 }}>
              <TabNavigator />
            </View>
          </NavigationContainer>
        ) : null}
      </View>
      {/* The app tour (Home's welcome card, Settings → The app tour). Outside
          the part that redraws on an Appearance switch, so it stays open. */}
      {choice ? <TourModal navRef={navRef} /> : null}
      {/* Waits for the saved Appearance (a moment) so it opens in the right colours. */}
      {intro && choice ? <IntroSplash key={scheme} onDone={() => setIntro(false)} /> : null}
    </SafeAreaProvider>
  );
}
