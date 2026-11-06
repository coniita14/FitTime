import React from 'react';
import { View, StyleSheet } from 'react-native';
import { idDeYoutube, urlEmbed } from './youtube';

// Web: iframe de YouTube que se reproduce solo, sin sonido y en bucle.
export const VideoEjercicio = ({ url, titulo, style }) => {
  const id = idDeYoutube(url);
  if (!id) return null;
  return (
    <View style={[s.caja, style]}>
      <iframe
        src={urlEmbed(id)}
        title={titulo || 'Video del ejercicio'}
        style={{ border: 0, width: '100%', height: '100%' }}
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    </View>
  );
};

const s = StyleSheet.create({ caja: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', overflow: 'hidden' } });
