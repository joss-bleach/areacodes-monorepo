import { useState } from "react";
import { Button, Input, Textarea, Label } from "@repo/ui";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="py-12">
        <p className="inline-block w-fit px-2 py-1 font-bold uppercase tracking-tight bg-white text-black text-[19px] md:text-[24px] leading-none">
          Message sent
        </p>
        <p className="mt-4 text-white/80 text-base leading-relaxed">
          We'll get back to you soon.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="text-white font-bold uppercase tracking-wide text-xs">
          Name
        </Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          placeholder="Your name"
          className="bg-transparent border-white/20 text-white placeholder:text-white/40 focus-visible:border-white focus-visible:ring-white/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-white font-bold uppercase tracking-wide text-xs">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="bg-transparent border-white/20 text-white placeholder:text-white/40 focus-visible:border-white focus-visible:ring-white/30"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="message" className="text-white font-bold uppercase tracking-wide text-xs">
          Message
        </Label>
        <Textarea
          id="message"
          name="message"
          required
          rows={6}
          placeholder="What's on your mind?"
          className="bg-transparent border-white/20 text-white placeholder:text-white/40 focus-visible:border-white focus-visible:ring-white/30 resize-none"
        />
      </div>
      <div>
        <Button
          type="submit"
          className="w-full md:w-[200px] bg-white p-6 font-semibold tracking-wide text-black shadow-none hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 active:scale-[0.98] transition-transform"
        >
          Send message
        </Button>
      </div>
    </form>
  );
}
