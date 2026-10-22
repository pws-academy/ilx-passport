# ILX Passport: connect it to PWS Microsoft 365 (solo, about 1 hour)

You need: your PWS Microsoft account, a SharePoint site you own, and the files in this folder.
Until you finish Step 3, the app keeps running in sandbox mode, so nothing breaks while you set up.

---

## Step 1. SharePoint lists (20 minutes)

1. **Site.** Open SharePoint and create a team site called **PWS Academy** (or use a site you already own).
   Copy its address, for example `https://peopleworksmart.sharepoint.com/sites/PWSAcademy`.
2. **Three lists.** In the site: **+ New > List > Blank list**. Create:
   - `ILX_Passports_Test`
   - `ILX_Config_Test`
   - `ILX_Codes_Test`
3. **Columns.** In each list, **+ Add column**:
   - `PersonName`: Single line of text
   - `Payload`: Multiple lines of text, **plain text** (turn off rich text)
   (The built-in `Title` column stays as it is.)
4. **Privacy on the passports list.** `ILX_Passports_Test` > Settings (gear) > **List settings > Advanced settings**:
   - Read access: **Read items that were created by the user**
   - Create and Edit access: **Create items and edit items that were created by the user**
   - Save. Site **Owners** (you, and any facilitator you make an owner) still see every passport.
5. **Codes list for facilitators only.** `ILX_Codes_Test` > List settings > **Permissions for this list > Stop Inheriting Permissions**.
   Remove **Members** and **Visitors**; keep **Owners**. Only owners can now see codes and the facilitator view.
6. **Config list read-only for participants.** `ILX_Config_Test` > Permissions for this list > Stop Inheriting Permissions >
   select **Members** > Edit User Permissions > **Read**. Owners keep Full Control.
7. **Backup.** In each list: List settings > **Versioning settings** > Create a version each time you edit an item > **Yes**.
8. **Limit what Members can do.** Site settings > Site permissions > **Advanced permissions settings** > tick **Members** > Edit User Permissions > choose **Contribute** instead of Edit. Contribute lets people add and edit items but not change or delete lists.
9. **Participants.** Add each cohort member to the site **Members** group (Site permissions > Add members). Combined with steps 4 to 8, they can create and edit only their own passport.

## Step 2. Register the app for Microsoft sign-in (10 minutes)

1. Go to **entra.microsoft.com > Applications > App registrations > New registration**.
   - Name: `ILX Passport`
   - Supported account types: **Accounts in this organizational directory only**
   - Redirect URI: platform **Single-page application (SPA)**, and paste the exact address where the app will run (Step 4).
2. Click **Register**. On the Overview page, copy:
   - **Application (client) ID**
   - **Directory (tenant) ID**
3. **API permissions > Add a permission > Microsoft Graph > Delegated permissions**: tick **Sites.ReadWrite.All**. Click **Add**.
   (User.Read is already there.) You approve these yourself the first time you sign in.

If **New registration** is greyed out, or sign-in later says **Need admin approval**, your tenant blocks this for non-admins.
Keep using the sandbox or claude.ai passport until that changes.

## Step 3. Fill in `js/config.js` (2 minutes)

```js
clientId: "your Application (client) ID",
tenantId: "your Directory (tenant) ID",
siteUrl: "https://peopleworksmart.sharepoint.com/sites/PWSAcademy",
lists: { config: "ILX_Config_Test", codes: "ILX_Codes_Test", passports: "ILX_Passports_Test" }
```

The client ID and tenant ID are not secrets; they are safe in this file. Never put a password or client secret here.

## Step 4. Put the app online (15 minutes)

**Today, fastest: GitHub Pages (free, stable address)**
1. Create a GitHub account if you need one, then **New repository** `ilx-passport` (Private needs a paid GitHub plan for Pages; a Public repository is acceptable because the code holds no passwords or personal data, only your site address and app ID).
2. **Add file > Upload files**: drag in everything from this folder, keeping the `css`, `js` and `assets` folders. Commit.
3. **Settings > Pages > Deploy from a branch > main / root > Save.** After a minute you get an address like
   `https://yourname.github.io/ilx-passport/`.
4. Go back to your app registration > **Authentication** and add these as SPA redirect URIs:
   - `https://yourname.github.io/ilx-passport/`
   - `https://yourname.github.io/ilx-passport/index.html`

**Later, for the live version:** move to Azure Static Web Apps under a PWS address, and add that address as a redirect URI.

## Step 5. First run check (15 minutes)

1. Open the app address. Click **Sign in with Microsoft**, sign in, accept the permissions.
2. You are a site owner, so the **Facilitator** tab appears. Name the cohort and **Generate new codes**.
3. Go to **My passport**, complete Module 00, enter its code, press **Stamp**.
4. Open `ILX_Passports_Test` in SharePoint: your item is there with your name.
5. Refresh the app on your phone: the stamp is still there.
6. Export the CSV from the Facilitator tab and open it in Excel.

## Going live

Create `ILX_Passports`, `ILX_Config` and `ILX_Codes` with the same settings, change the three list names in `js/config.js`, and upload the file again.

## Troubleshooting

| Message or symptom | Fix |
|---|---|
| AADSTS50011 redirect URI mismatch | Add the exact address shown in the error to the app registration (SPA) |
| Need admin approval | Your tenant blocks user consent; keep using the sandbox for now |
| Couldn’t open your passport: Lists not found | Check the list names in `config.js` and that you can open the lists |
| Couldn’t save to SharePoint | Check the person is in the site Members group; their answers stay on their device until it saves |
| No Facilitator tab | Only site owners can open `ILX_Codes_Test`; make the facilitator an owner |
| Sign-in button does nothing | The Microsoft sign-in script didn’t load; check the internet connection and refresh |
