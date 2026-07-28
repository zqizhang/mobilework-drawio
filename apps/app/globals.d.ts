export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_OPENWORK_DRAWIO_URL?: string;
  }
}

declare module "react" {
  interface CSSProperties extends React.CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
