// Saca el ID de un link de YouTube (watch, youtu.be, shorts o embed)
export const idDeYoutube = (url = '') => {
  const m = String(url).match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

// Reproductor embebido: arranca solo, sin sonido y en bucle (de fondo).
// Tocándolo se activa el sonido o se pasa a pantalla completa.
export const urlEmbed = (id) =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&rel=0&modestbranding=1&controls=1`;
