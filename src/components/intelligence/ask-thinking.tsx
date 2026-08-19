export function AskThinking({
  phrase = "Deciphering this project",
}: {
  phrase?: string;
}) {
  return (
    <p
      className="text-sm text-muted"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {phrase.split("").map((letter, index) => (
        <span
          key={`${letter}-${index}`}
          className="ask-wave-letter"
          style={{ animationDelay: `${index * 45}ms` }}
        >
          {letter === " " ? "\u00a0" : letter}
        </span>
      ))}
    </p>
  );
}
