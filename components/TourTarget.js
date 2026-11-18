// components/TourTarget.js — marks a spot the app tour can point at.
//   <TourTarget id="home.settings"><Pressable …/></TourTarget>
// It's a plain View (style passes through); with no id it's just a View.
//
// It also remembers which page it's on, so the tour can tell when that page
// is covered (e.g. Medals opened on top of Brainstorm, or another tab is
// showing) and bring the page back instead of outlining whatever is on top.

import React, { useContext, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { NavigationContext, NavigationRouteContext } from '@react-navigation/native';
import { TourHostContext, TourScrollContext, registerTarget } from '../tourRun';

export default function TourTarget({ id, style, children, ...rest }) {
  const ref = useRef(null);
  const host = useContext(TourHostContext);
  const scroll = useContext(TourScrollContext);
  // The page this spot is on (none for the tab bar: it's always showing).
  const nav = useContext(NavigationContext);
  const route = useContext(NavigationRouteContext);
  const navNow = useRef(nav);
  navNow.current = nav;
  const routeKey = route?.key || null;
  useEffect(() => (id
    ? registerTarget(id, {
      ref, host, scroll, routeKey,
      // Is its page the one showing right now?
      onScreen: () => {
        const n = navNow.current;
        return !n || typeof n.isFocused !== 'function' || n.isFocused();
      },
    })
    : undefined), [id, host, scroll, routeKey]);
  return (
    <View ref={ref} collapsable={false} style={style} {...rest}>
      {children}
    </View>
  );
}
