# ILX Passport · PWS Academy (draft build, v0.5)

**To connect it to PWS Microsoft 365, follow SETUP.md.** Until `js/config.js` is filled in, the app runs in sandbox mode.

A branded, installable web app for the PWS Induction Learning Experience (ILX).
Participants complete each module’s task and collect a stamp with the facilitator’s code.
Facilitators run the day: cohort codes, projector view, live progress, Cohort Wall,
printable Readiness Reports and CSV export.

**Sandbox rule: use sample data only.** No real employee names, answers or IDs until
Risk & Compliance and IT approve the live setup (Data Privacy Act).

## Run it in StackBlitz (no installation)
1. Go to stackblitz.com and sign in (free).
2. Create a new project: choose **Static** (plain HTML/JS).
3. Delete the starter files, then drag in everything from this folder, keeping the
   folders (`css`, `js`, `assets`).
4. The preview opens on the right. Use **Open in new tab** to test on your phone.

CodeSandbox and GitHub Codespaces work the same way: any static file server will do.

## Try it
- **Participant:** type a name and open the passport. Tap a page, answer the task,
  enter the code, then press Stamp.
- **Facilitator:** PIN `2026` (sandbox only). Name the cohort, generate codes, tap a code
  to show it full screen, and load the sample cohort to see the dashboard.
- **Install:** in the browser menu, choose **Install app** or **Add to Home Screen**.

## What’s inside
| File | Purpose |
|---|---|
| `index.html` | App layout |
| `css/styles.css` | PWS Academy brand: Poppins, black, white and #FFCE00; light and dark mode |
| `js/data.js` | The 8 modules and their tasks. **Edit content here.** |
| `js/storage.js` | Where data is saved. Sandbox = this browser. SharePoint adapter outline for IT |
| `js/app.js` | Passport, stamps, codes, facilitator tools, reports |
| `manifest.webmanifest`, `sw.js` | Makes it installable and able to open offline |

## Features
- Passport-style pages with an animated rubber-stamp effect and graduation certificate
- Stamp codes per module, stored as one-way hashes so participants can’t read them
- Facilitator projector mode for codes
- Cohort Wall: everyone’s 30-second PWS pitch on screen
- Live cohort progress with stamp dots
- Printable **ILX Readiness Report** per participant (Print or save as PDF)
- CSV export of all answers, ready for Excel
- Light and dark mode, mobile-first, reduced-motion support

## Moving from sandbox to live (with IT)
1. **Sign-in:** register a single-page app in Microsoft Entra ID and use MSAL.js, so staff
   sign in with their PWS Microsoft account. Facilitator access comes from a Microsoft
   group, replacing the sandbox PIN.
2. **Data:** create three SharePoint Lists on a PWS Academy site: `ILX_Config`,
   `ILX_Codes` (facilitators only) and `ILX_Passports`.
3. **Connect:** complete `SharePointAdapter` in `js/storage.js` using Microsoft Graph,
   then change the last line to `export const store = SharePointAdapter;`.
4. **Host:** Azure Static Web Apps (free tier) or the PWS web host.
5. **Optional:** pull new-hire names from Sprout’s Employee Information API.
