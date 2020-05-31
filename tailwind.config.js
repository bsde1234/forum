const colors = {
  main: "#05668d",
  highlight: "#028090",
  light: "#eee",
  ok: "#00a896",
  danger: "#e76f51",
  neutral: "#999",
  text: "#555"
}
module.exports = {
  purge: [],
  theme: {
    fontFamily: {
      sans: ['Roboto', 'sans-serif']
    },
    extend: {
      colors,
      boxShadow: {
        highlight: 'inset 0 0 0 50px rgba(255, 255, 255, 0.2)'
      }
    },
  },
  variants: {
    opacity: ['hover', 'focus', 'disabled']
  },
  plugins: [],
}
