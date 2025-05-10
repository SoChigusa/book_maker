// pages/_app.tsx
import '../app/globals.css';

export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />
}