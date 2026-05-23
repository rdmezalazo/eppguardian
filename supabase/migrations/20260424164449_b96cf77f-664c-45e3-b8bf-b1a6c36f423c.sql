INSERT INTO public.area_settings (name, icon, badge_class, soft_class, sort_order) VALUES
  ('Maestranza', 'Hammer', 'bg-stone-600 text-white hover:bg-stone-600/90', 'bg-stone-600/10 text-stone-700 dark:text-stone-400', 120),
  ('Metalmecánica', 'Cog', 'bg-zinc-600 text-white hover:bg-zinc-600/90', 'bg-zinc-600/10 text-zinc-700 dark:text-zinc-400', 130),
  ('Molino', 'Disc3', 'bg-yellow-700 text-white hover:bg-yellow-700/90', 'bg-yellow-700/10 text-yellow-800 dark:text-yellow-400', 140),
  ('Prensa', 'Layers', 'bg-red-700 text-white hover:bg-red-700/90', 'bg-red-700/10 text-red-700 dark:text-red-400', 150),
  ('Poliuretano', 'Droplets', 'bg-fuchsia-600 text-white hover:bg-fuchsia-600/90', 'bg-fuchsia-600/10 text-fuchsia-700 dark:text-fuchsia-400', 160),
  ('Revestimiento', 'PaintRoller', 'bg-emerald-700 text-white hover:bg-emerald-700/90', 'bg-emerald-700/10 text-emerald-700 dark:text-emerald-400', 170),
  ('Limpieza por abrasión', 'Wind', 'bg-lime-700 text-white hover:bg-lime-700/90', 'bg-lime-700/10 text-lime-700 dark:text-lime-400', 180)
ON CONFLICT (name) DO NOTHING;