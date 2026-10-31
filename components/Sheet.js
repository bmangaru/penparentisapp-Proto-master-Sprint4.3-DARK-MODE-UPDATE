// components/Sheet.js — one modal wrapper for the app's bottom sheets.
// footer: pinned under the scrolling part (the number pad). While it's
// showing, the sheet grows upward and its scrolling part gets shorter, so
// the sheet + pad always fit on screen. scrollRef: to scroll the content.
// tourId: names the sheet for the app tour ('settings' → targets
// 'settings.card' and 'settings.close', and tourEvent('sheet-open',
// 'settings') / ('sheet-close', …)). Each open sheet draws its own tour
// layer, since nothing can sit above a Modal.

import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import TourTarget from './TourTarget';
import TourLayer from './TourLayer';
import { colors, lift, radius, space, themed } from '../theme';
import { TourHostContext, TourScrollContext, registerHost, tourEvent } from '../tourRun';

let sheetCount = 0;

export default function Sheet({ visible, onClose, title, subtitle, children, footer, scrollRef, tourId }) {
  const hostId = useRef(null);
  if (!hostId.current) { sheetCount += 1; hostId.current = `sheet${sheetCount}`; }
  useEffect(() => {
    if (!visible) return undefined;
    const off = registerHost(hostId.current);
    if (tourId) tourEvent('sheet-open', tourId);
    return off;
  }, [visible]);
  const close = () => {
    if (tourId) tourEvent('sheet-close', tourId);
    if (onClose) onClose();
  };
  // Tall enough for the end-of-session sheet on small phones; scrolls past that.
  const { height } = useWindowDimensions();
  const [footerH, setFooterH] = useState(0);
  const maxH = footer ? Math.max(180, height * 0.9 - footerH - 110) : Math.max(420, height * 0.72);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <TourHostContext.Provider value={hostId.current}>
      <TourScrollContext.Provider value={null}>
        <View style={s.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} />
          <TourTarget id={tourId ? `${tourId}.card` : null} style={[s.card, lift]}>
            <View style={s.head}>
              <View style={{ flex: 1 }}>
                <Text style={s.title}>{title}</Text>
                {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
              </View>
              <TourTarget id={tourId ? `${tourId}.close` : null}>
                <Pressable onPress={close} style={s.close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
                  <Text style={s.closeText}>×</Text>
                </Pressable>
              </TourTarget>
            </View>
            <ScrollView ref={scrollRef} style={{ maxHeight: maxH }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
            {footer ? (
              <View style={s.footer} onLayout={(e) => setFooterH(Math.round(e.nativeEvent.layout.height))}>
                {footer}
              </View>
            ) : null}
          </TourTarget>
        </View>
        <TourLayer host={hostId.current} />
      </TourScrollContext.Provider>
      </TourHostContext.Provider>
    </Modal>
  );
}

const s = themed(() => ({
  backdrop: { flex: 1, backgroundColor: 'rgba(10,22,51,0.55)', justifyContent: 'flex-end' },
  card: { backgroundColor: colors.paper, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space.lg, paddingBottom: space.xl },
  head: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.md },
  title: { fontSize: 19, fontWeight: '700', color: colors.ink },
  subtitle: { fontSize: 12.5, color: colors.muted, marginTop: 3 },
  close: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.line },
  closeText: { fontSize: 18, color: colors.ink, lineHeight: 18 },
  // Full width, to the bottom edge (cancels the card's padding).
  footer: { marginHorizontal: -space.lg, marginBottom: -space.xl, marginTop: space.sm, paddingBottom: space.lg, backgroundColor: '#F1EDE3' },
}));