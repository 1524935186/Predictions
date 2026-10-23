// EINFÄDLER · site configuration
// Fill in the two Supabase values from: Supabase dashboard → Project Settings → API.
window.PL_CONFIG = {
  SUPABASE_URL: "https://obdpcdrtnfcojcepudkb.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_7mcSb-442uPjds30iE4Ufw_xfhbasJq",

  // Shown to new members on the "awaiting approval" screen.
  LEAGUE_NAME: "EINFÄDLER",
  // Test season: no buy-in. Set BUY_IN back to an amount (e.g. "$10") to turn payments on again.
  BUY_IN: "Free",
  PAY_TO: "an admin",
  PAY_METHOD: "Ask an admin in the group chat",
  PAY_REFERENCE_HINT: "Use your display name as the reference.",

  // Season the app follows (2027 = the 2026/27 World Cup season).
  // Set to true once a proper email sender is connected in Supabase (Authentication → SMTP).
  // Until then the sign-in page tells people to message an admin for a reset.
  PASSWORD_RESET_EMAIL: false,

  SEASON: 2027,

  // Optional: a picture to show at the top of a particular race page instead of the discipline scene.
  // Keyed by the race's FIS id (or the id you gave a test race).
  RACE_ART: {
    "JOKE-CORTINA": "moment-tiramisu.webp"
  },

  // Optional event skins: between these dates the accent colours change.
  // Dates are inclusive, local to the viewer.
  SKINS: [
    { name: "Kitzbühel week", from: "2027-01-18", to: "2027-01-24",
      vars: { "--slate": "#141414", "--accent": "#D50000", "--accent-ink": "#FFFFFF", "--pale": "#F2F2F4" } },
    { name: "World Championships", from: "2027-02-01", to: "2027-02-14",
      vars: { "--slate": "#B3122E", "--accent": "#2F6FE0", "--accent-ink": "#FFFFFF", "--pale": "#FBEDEF" } },
    { name: "Finals", from: "2027-03-15", to: "2027-03-31",
      vars: { "--slate": "#2B3A55", "--accent": "#E3B341", "--accent-ink": "#14213D", "--pale": "#FFF6DD" } }
  ]
};
