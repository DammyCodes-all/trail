# TRAIL animation architecture

## Landing-page animation ownership

The web landing page uses three animation modules with non-overlapping responsibilities:

- **GSAP + ScrollTrigger** owns staged hero choreography, scroll-linked transforms, and coordinated product-story timelines.
- **Lenis** owns the page scroll loop. It runs through the GSAP ticker and forwards scroll updates to ScrollTrigger.
- **Framer Motion** owns local interactive states such as CTA hover and press feedback.

Keep one animation owner per DOM element. A module should not animate the same element's `transform` or `opacity` through more than one of these tools. CSS remains the source of layout, color, and static transforms; animation behavior belongs to the package that owns the interaction.

## Motion rules

- The initial states for components should stay in the CSS and also always use only tailwind for styling. Exception: Tailwind v4 applies transforms via the individual `rotate`/`translate`/`scale` properties, which GSAP cannot read from `getComputedStyle()` — for GSAP-owned transforms, declare the start values inline via `fromTo()`/`gsap.set()` and skip the Tailwind transform utility classes. The no-JS / reduced-motion state must remain CSS-only and fully visible (e.g. the intro logo renders assembled, not scattered).
- Use transform and opacity for motion so layout stays stable.
- Use short `ease-out` entrances, `ease-in-out` morphs, and springs only where interaction needs physical response.
- Gate nonessential motion with `prefers-reduced-motion`. Reduced motion must leave the content visible and usable.
- Keep scroll choreography interruptible and scrubbed; never make the user wait for an animation to finish.
- Keep the hero's product sequence explanatory: recording leads to replay, and replay leads to report.

## Change checklist

When adding landing-page motion, first assign the element to GSAP, Lenis, or Framer Motion, then add the smallest module that owns that behavior. Run the web lint, TypeScript check, and production build before handing off the change.
