// components/TourTarget.js — marks a spot the app tour can point at.
//   <TourTarget id="home.settings"><Pressable …/></TourTarget>
// It's a plain View (style passes through); with no id it's just a View.

import React, { useContext, useEffect, useRef } from 'react';
import { View } from 'react-native';
import { TourHostContext, TourScrollContext, registerTarget } from '../tourRun';

export default function TourTarget({ id, style, children, ...rest }) {
  const ref = useRef(null);
  const host = useContext(TourHostContext);
  const scroll = useContext(TourScrollContext);
  useEffect(() => (id ? registerTarget(id, { ref, host, scroll }) : undefined), [id, host, scroll]);
  return (
    <View ref={ref} collapsable={false} style={style} {...rest}>
      {children}
    </View>
  );
}
