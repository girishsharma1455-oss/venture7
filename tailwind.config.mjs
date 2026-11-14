/** Composited pulse waves; cadence is independent of recording playback. */
export default {
  theme: {
    extend: {
      keyframes: {
        'venture-ring': {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '25%': { opacity: '0.32' },
          '65%': { opacity: '0.24' },
          '100%': { transform: 'scale(1.3)', opacity: '0' },
        },
      },
      animation: {
        'venture-ring-one': 'venture-ring 6s -4s infinite linear',
        'venture-ring-two': 'venture-ring 6s -2s infinite linear',
        'venture-ring-three': 'venture-ring 6s infinite linear',
      },
    },
  },
};
