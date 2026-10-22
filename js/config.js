/*
  ILX Passport configuration. Fill these in once (see SETUP.md).
  While clientId still starts with "PASTE", the app runs in sandbox mode (this browser only).
*/
export const CONFIG = {
  // From Microsoft Entra ID > App registrations > your app > Overview
  clientId: "PASTE-APPLICATION-CLIENT-ID",
  tenantId: "PASTE-DIRECTORY-TENANT-ID",

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
