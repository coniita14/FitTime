import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { idDeYoutube, urlEmbed } from './youtube';

// Android / iOS: el mismo reproductor de YouTube dentro de un WebView.
// Se carga como HTML con un dominio base para que YouTube acepte el reproductor.
export const VideoEjercicio = ({ url, titulo, style }) => {
  const id = idDeYoutube(url);
  if (!id) return null;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>html,body{margin:0;height:100%;background:#000}iframe{border:0;width:100%;height:100%}</style></head>
<body><iframe src="${urlEmbed(id)}" title="${(titulo || 'Video').replace(/"/g, '')}"
allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></body></html>`;
  return (
    <View style={[s.caja, style]}>
      <WebView
        source={{ html, baseUrl: 'https://fittime.app' }}
        style={{ backgroundColor: '#000' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        javaScriptEnabled
        scrollEnabled={false}
        originWhitelist={['*']}
      />
    </View>
  );
};

const s = StyleSheet.create({ caja: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', overflow: 'hidden' } });
