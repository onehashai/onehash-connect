# Logging in

By default, OneHash Connect allows logging in via email/password as well as
various social authentication providers like Google, GitHub, GitLab,
and Apple.

Organization administrators can
[add other authentication methods](/help/configure-authentication-methods),
including the SAML and LDAP integrations, or disable any of the methods above.

You can log in with any method allowed by your organization, regardless of
how you signed up. For example, if you originally signed up using your Google
account, you can later log in using GitHub, as long as your Google account
and GitHub account use the same email address.

## Find the OneHash Connect log in URL

Here are some ways to find the URL for your OneHash Connect organization.

{start_tabs}

{tab|logged-out}

* If your organization is hosted on [Connect Cloud](https://zulip.com/plans/), go
  to the [**Find your accounts**](https://zulip.com/accounts/find/) page and enter
  the email address that you signed up with. You will receive an email with the
  sign-in information for any OneHash Connect organization(s) associated with your email
  address.

* Find an email in your inbox with a subject that contains the phrase: `OneHash Connect:
  Your new account details`. This email provides your organization's log in URL.

* If you have visited your organization's log in page in the past, try reviewing
  your browser's history. Searching for `connect.onehash.ai` should find the right
  page if your OneHash Connect organization is hosted on [Connect
  Cloud](https://zulip.com/plans/).

* You can ask your organization administrators for your OneHash Connect URL.

{tab|logged-in}

* If using OneHash Connect in the browser, your organization's OneHash Connect log in URL is the first part
  of what you see in the URL bar (e.g., `<organization-name>.connect.onehash.ai` for
  [Connect Cloud](https://zulip.com/plans/) organizations).

* In the Desktop app, select **Copy OneHash Connect URL** from the **OneHash Connect** menu to
  copy the URL of the currently active organization. You can also access the
  **Copy OneHash Connect URL** option by right-clicking on an organization logo in the
  **organizations sidebar** on the left.

* In the Mobile app, tap your **profile picture** in the bottom right corner of
  the app, then tap **switch account** to see the URLs for all the organizations
  you are logged in to.

* On [Connect Cloud](https://zulip.com/plans/) and other OneHash Connect servers updated to
  [OneHash Connect 6.0 or
  higher](https://zulip.readthedocs.io/en/stable/overview/changelog.html#zulip-6-x-series),
  click the **gear** (<i class="fa fa-cog"></i>) icon in the upper right
  corner of the web or desktop app. Your organization's log in URL is shown in the top
  section of the menu.

{end_tabs}

## Log in for the first time

{start_tabs}

{tab|web}

1. Go to the OneHash Connect URL of the organization.

1. Follow the on-screen instructions.

{tab|desktop}

!!! warn ""
    If you are having trouble connecting, you may need to set your
    [proxy settings](/help/connect-through-a-proxy) or add a
    [custom certificate](/help/custom-certificates).

1. Click the **plus** (<i class="fa fa-plus"></i>) icon in the
**organizations sidebar** on the left. You can also select **Add Organization**
from the **OneHash Connect** menu in the top menu bar.

1. Enter the OneHash Connect URL of the organization, and click **Connect**.

1. Follow the on-screen instructions.

{!desktop-toggle-sidebar-tip.md!}

{tab|mobile}

{!mobile-profile-menu.md!}

1. Tap **Switch account**.

1. Tap **Add new account**.

1. Enter the OneHash Connect URL of the organization, and tap **Enter**.

1. Follow the on-screen instructions.

{end_tabs}

## Switch between organizations

{!switching-between-organizations.md!}

## Set or reset your password

If you signed up using passwordless authentication and want to start logging in
via email/password, you will need to create a password by following the instructions below. You can also reset a
forgotten password.

{!change-password-via-email-confirmation.md!}

## Related articles

* [Logging out](logging-out)
* [Switching between organizations](switching-between-organizations)
* [Change your email address](change-your-email-address)
* [Change your password](change-your-password)
* [Deactivate your account](deactivate-your-account)
