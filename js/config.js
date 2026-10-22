/*
  ILX Passport configuration. Fill these in once (see SETUP.md).
  While clientId still starts with "PASTE", the app runs in sandbox mode (this browser only).
*/
export const CONFIG = {
  // From Microsoft Entra ID > App registrations > your app > Overview
  clientId: "3e30dbfe-d41c-48c2-9156-6702804b2d86",
  tenantId: "a0d6e94d-9f6e-486a-a59f-4e33da5f9d61",

  // Your PWS Academy SharePoint site address (no trailing slash)
  siteUrl: "https://peopleworksmart.sharepoint.com/sites/PWSAcademy",

  // SharePoint list names. Use the TEST lists first, then switch to the live ones.
  lists: {
    config: "ILX_Config_Test",
    codes: "ILX_Codes_Test",
    passports: "ILX_Passports_Test"
  },

  // Sandbox only: facilitator PIN. Ignored once SharePoint is connected.
  facilitatorPin: "2026"
};

export const IS_SHAREPOINT = !CONFIG.clientId.startsWith("PASTE");
