/**
 * Text with `inline code`, used by messages, posts and help requests.
 * The full Markdown rendering (sanitized) comes with PAM-118.
 *
 * @example
 * <RichText text='On obtient `database is locked` sous charge.' />
 */
export const RichText = ({ text }: { text: string }) => (
  <>
    {text.split('`').map((part, i) =>
      i % 2
        ? (
          <code
            key={i}
            class='rounded-sm bg-surface-200 px-[5px] py-px font-mono text-[13px] leading-5'
          >
            {part}
          </code>
        )
        : part
    )}
  </>
)
