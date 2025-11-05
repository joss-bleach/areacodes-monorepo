import { ArrowRightIcon } from "lucide-react"
import { FEEDBACK_BANNER_VISIBLE } from "@/lib/feedback-banner"

export default function Component() {
  if (!FEEDBACK_BANNER_VISIBLE) {
    return null
  }

  return (
    <div className="dark bg-muted px-4 py-3 text-foreground">
      <p className="flex justify-center text-sm">
        <a
          href="https://form.typeform.com/to/VmclcWp4"
          target="_blank"
          rel="noopener noreferrer"
          className="group"
        >
          <span className="me-1 text-base leading-none">✨</span>
          We'd love your feedback! Help us improve by reporting bugs or sharing suggestions
          <ArrowRightIcon
            className="ms-2 -mt-0.5 inline-flex opacity-60 transition-transform group-hover:translate-x-0.5"
            size={16}
            aria-hidden="true"
          />
        </a>
      </p>
    </div>
  )
}
