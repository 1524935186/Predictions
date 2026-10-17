// Podium League · site configuration
// Fill in the two Supabase values from: Supabase dashboard → Project Settings → API.
window.PL_CONFIG = {
  SUPABASE_URL: "https://obdpcdrtnfcojcepudkb.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_7mcSb-442uPjds30iE4Ufw_xfhbasJq",

  // Shown to new members on the "awaiting approval" screen.
  LEAGUE_NAME: "Podium League",
  BUY_IN: "$20",
  PAY_TO: "James",
  PAY_METHOD: "PayID 04xx xxx xxx",      // or BSB / account, or "cash"
  PAY_REFERENCE_HINT: "Use your display name as the reference.",

  // Season the app follows (2027 = the 2026/27 World Cup season).
  SEASON: 2027,

  // Optional event skins: between these dates the accent colours change.
  // Dates are inclusive, local to the viewer.
  SKINS: [
    { name: "Kitzbühel week", from: "2027-01-18", to: "2027-01-24",
      vars: { "--slate": "#141414", "--accent": "#D50000", "--accent-ink": "#FFFFFF", "--pale": "#F2F2F4" } },
    { name: "World Championships", from: "2027-02-01", to: "2027-02-14",
      vars: { "--slate": "#B3122E", "--accent": "#FFFFFF", "--accent-ink": "#B3122E", "--pale": "#FBEDEF" } },
    { name: "Finals", from: "2027-03-15", to: "2027-03-31",
      vars: { "--slate": "#2B3A55", "--accent": "#E3B341", "--accent-ink": "#14213D", "--pale": "#FFF6DD" } }
  ]
};
