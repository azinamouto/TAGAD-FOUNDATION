# shadcn Tailwind stylesheet

`shadcn-tailwind.css` is an unmodified copy of `dist/tailwind.css` from the
previously locked npm package `shadcn@4.19.0` (MIT; see `shadcn-LICENSE.txt`).
Source: https://github.com/shadcn-ui/ui/tree/main/packages/shadcn
Original SHA-256: `bc7d83425702955b4cb67cb14ede9d603f9d912376d57a2d81d661094d2a782a`.

The app consumes this CSS and its checked-in UI components, but does not invoke
the shadcn CLI. Keeping the static stylesheet locally removes the CLI's
vulnerable braces dependency without changing the CSS definitions or GAD UI.
The root and frontend installations intentionally omit the CLI. Do not restore
it or run an unreviewed `npx shadcn` as part of builds; review its dependency
audit before future component generation. Review upstream CSS changes manually
and retain the license when updating this copy.
