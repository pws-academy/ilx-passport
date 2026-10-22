// ILX stations: one per module. Edit titles, times and tasks here.
export const STATIONS = [
  { id: "launch", no: "00", title: "Launchpad", time: "7:00 AM",
    lede: "Sign in, set your baseline and meet your cohort.",
    fields: [{ k: "talent", label: "One thing you’re great at that isn’t on your resume", type: "text" }] },
  { id: "pws", no: "01", title: "Know PWS", time: "7:30 AM",
    lede: "Your 30-second PWS pitch. You’ll use it again in your capstone video.",
    fields: [
      { k: "p1", label: "PWS helps…", type: "area" },
      { k: "p2", label: "What makes us different is…", type: "area" },
      { k: "p3", label: "I’m proud to be part of it because…", type: "area" }] },
  { id: "tour", no: "02", title: "Office tour", time: "8:45 AM",
    lede: "Find Your Exit: note where you’d go in an emergency.",
    fields: [
      { k: "exit", label: "My nearest exit", type: "text" },
      { k: "assembly", label: "Our assembly point", type: "text" }] },
  { id: "employ", no: "03", title: "Your Employment", time: "9:30 AM",
    lede: "Plan your year and check the offset logic.",
    fields: [
      { k: "leave", label: "Leave days I plan to have left on 31 December (goal: 5 or fewer)", type: "text" },
      { k: "offset", label: "Planning net for Philippines vs NSW, 2027", type: "text" }] },
  { id: "essentials", no: "04", title: "PWS Essentials", time: "12:00 PM",
    lede: "Knowledge Base Quest: find all three answers.",
    fields: [
      { k: "q1", label: "How many leave days can you carry into next year?", type: "text" },
      { k: "q2", label: "Where do you send an IT support request?", type: "text" },
      { k: "q3", label: "Where is the 2027 offsetting calendar for your client?", type: "text" }] },
  { id: "safe", no: "05", title: "Safe and Secure", time: "12:45 PM",
    lede: "Your OSH orientation, in your own words.",
    fields: [
      { k: "hazard", label: "A hazard our team found, and how to report it", type: "area" },
      { k: "right", label: "An OSH right I would use, and when", type: "area" }] },
  { id: "client", no: "06", title: "Know Your Client", time: "2:30 PM",
    lede: "My Client Commitment. Your Account Manager follows up at Day 30.",
    fields: [
      { k: "c1", label: "In my first week, I will…", type: "area" },
      { k: "c2", label: "I will make my client’s life easier by…", type: "area" },
      { k: "c3", label: "If something is unclear, I will…", type: "area" }] },
  { id: "capstone", no: "07", title: "Capstone", time: "3:30 PM",
    lede: "Record your video, then tell us what stays with you.",
    fields: [
      { k: "video", label: "Video recorded? Type yes when done", type: "text" },
      { k: "takeaway", label: "One thing I’ll remember from today", type: "area" }] }
];

// Stamp tilt per station, so the page looks hand-stamped.
export const ROTATION = { launch: -8, pws: 6, tour: -4, employ: 9, essentials: -11, safe: 5, client: -6, capstone: 8 };

// Sandbox-only sample people. Never put real employee data in the sandbox.
export const DEMO_PEOPLE = ["Alex Santos", "Bea Reyes", "Carlo Dizon", "Dana Cruz"];
