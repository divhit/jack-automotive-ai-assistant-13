
declare namespace JSX {
  interface IntrinsicElements {
    'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
      'agent-id'?: string;
      transcript?: boolean | string;
      'text-input'?: boolean | string;
      className?: string;
    };
  }
}
